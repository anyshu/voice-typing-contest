import { EventEmitter } from "node:events";
import { access, constants, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { nanoid } from "nanoid";
import type {
  AppConfig,
  FailureCategory,
  InstalledTargetAppInfo,
  InputObservationEvent,
  PreflightReport,
  ResultStatus,
  RunEventRecord,
  RunProgress,
  RunSessionRecord,
  RunStartOptions,
  TestRunRecord,
} from "../shared/types";
import { PermissionManager } from "./permission-manager";
import { ResultStore } from "./result-store";
import { TargetAppManager } from "./target-app-manager";
import { HelperClient } from "./helper-client";
import { resolveHomePath } from "../shared/paths";
import { BuiltinSampleMaterializer } from "./builtin-sample-materializer";

const wait = async (ms: number): Promise<void> => await new Promise((resolve) => setTimeout(resolve, ms));

interface CurrentObservation {
  runId: string;
  appId: string;
  sampleId: string;
  values: InputObservationEvent[];
}

interface PreparedRunContext {
  samples: AppConfig["audioSamples"];
  runnableApps: Array<{
    app: AppConfig["targetApps"][number];
    resolved: string | undefined;
    installedInfo?: InstalledTargetAppInfo;
    isSelftest: boolean;
    ok: boolean;
    runnable: boolean;
    skipReason?: "missing" | "permission";
  }>;
  resolvedAppMap: Map<string, string | undefined>;
  preflight: PreflightReport;
}

class RunCancelledError extends Error {
  constructor(message = "Run cancelled") {
    super(message);
    this.name = "RunCancelledError";
  }
}

export class RunController extends EventEmitter {
  private stopRequested = false;
  private current?: CurrentObservation;
  private helperAbortController?: AbortController;
  private progress: RunProgress = { phase: "idle", textValue: "", message: "Idle", completedRuns: 0, totalRuns: 0 };

  constructor(
    private readonly store: ResultStore,
    private readonly permissions: PermissionManager,
    private readonly targets: TargetAppManager,
    private readonly helper: HelperClient,
    private readonly emitSelfTestText: (chunks: string[]) => void,
    private readonly builtinSamples = new BuiltinSampleMaterializer(),
  ) {
    super();
  }

  getProgress(): RunProgress {
    return this.progress;
  }

  private isUnsupportedHoldHelper(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Unknown command") || message.includes("playWavHoldingHotkey");
  }

  onInputEvent(event: InputObservationEvent): void {
    if (!this.current) return;
    const normalizedEvent: InputObservationEvent = {
      ...event,
      // Renderer and main have different performance.now() origins.
      // Use the main-process clock so latency math stays comparable.
      tsMs: performance.now(),
    };
    this.current.values.push(normalizedEvent);
    this.progress.textValue = normalizedEvent.value;
    this.emit("progress", { ...this.progress });
  }

  async inspect(config: AppConfig, options?: RunStartOptions): Promise<PreflightReport> {
    const prepared = await this.prepareRun(config, options);
    this.emit("preflight", prepared.preflight);
    return prepared.preflight;
  }

  async run(config: AppConfig, options?: RunStartOptions): Promise<PreflightReport> {
    const { samples, runnableApps, resolvedAppMap, preflight } = await this.prepareRun(config, options);
    this.emit("preflight", preflight);
    if (!preflight.ok) {
      this.progress = {
        phase: "failed",
        textValue: "",
        message: preflight.items.find((item) => !item.ok)?.message ?? "Preflight failed",
        failureCategory: preflight.items.find((item) => !item.ok)?.category,
        completedRuns: 0,
        totalRuns: runnableApps.length * samples.length,
      };
      this.emit("progress", { ...this.progress });
      return preflight;
    }

    this.stopRequested = false;
    this.helperAbortController = undefined;
    const sessionId = nanoid();
    const session: RunSessionRecord = {
      id: sessionId,
      startedAt: new Date().toISOString(),
      selectedAppIds: runnableApps.map((item) => item.app.id),
      selectedSampleIds: samples.map((item) => item.id),
      permissionSnapshot: preflight.permissions,
      deviceSnapshot: preflight.devices,
      configSnapshot: config,
      status: "preflight",
    };
    this.store.createSession(session);
    let completed = 0;
    const totalRuns = runnableApps.length * samples.length;
    const runTimelineMap = new Map<string, RunEventRecord[]>();

    for (const { app, installedInfo } of runnableApps) {
      const appStartRecord: RunEventRecord = {
        id: nanoid(),
        runId: sessionId,
        eventType: "app_start",
        tsMs: performance.now(),
        payloadJson: JSON.stringify({ app: app.name }),
      };
      this.store.appendEvent(appStartRecord);
      this.emit("timeline", appStartRecord);
      let pendingAppTimelinePrefix: RunEventRecord[] = [appStartRecord];
      const resolvedApp = resolvedAppMap.get(app.id);
      const isSelfTestApp = Boolean(resolvedApp?.startsWith("selftest://"));
      let holdHelperAvailable = typeof (this.helper as HelperClient & { playWavHoldingHotkey?: unknown }).playWavHoldingHotkey === "function";
      let appLaunched = false;
      let appLaunchFailure: { category: FailureCategory; message: string } | undefined;
      let lastRunIdForApp: string | undefined;

      const appendEventForRun = (runId: string, eventType: string, payload: Record<string, unknown>): void => {
        const record: RunEventRecord = {
          id: nanoid(),
          runId,
          eventType,
          tsMs: performance.now(),
          payloadJson: JSON.stringify(payload),
        };
        this.store.appendEvent(record);
        const timeline = runTimelineMap.get(runId) ?? [];
        timeline.push(record);
        runTimelineMap.set(runId, timeline);
        this.store.updateRunTimeline(runId, timeline);
        this.emit("timeline", record);
      };

      for (const [sampleIndex, sample] of samples.entries()) {
        if (this.stopRequested) {
          this.finishCancelledSession(sessionId, completed, totalRuns);
          return preflight;
        }
        const runId = nanoid();
        lastRunIdForApp = runId;
        if (pendingAppTimelinePrefix.length) {
          runTimelineMap.set(runId, [...pendingAppTimelinePrefix]);
          pendingAppTimelinePrefix = [];
        }
        this.current = { runId, appId: app.id, sampleId: sample.id, values: [] };
        this.progress = {
          sessionId,
          runId,
          phase: "focus_input",
          currentAppName: app.name,
          currentSamplePath: sample.relativePath,
          textValue: "",
          message: `Running ${app.name} / ${sample.relativePath}`,
          completedRuns: completed,
          totalRuns,
        };
        this.emit("progress", { ...this.progress });
        const started = performance.now();
        const pushEvent = (eventType: string, payload: Record<string, unknown>, tsMs = performance.now()): void => {
          const record: RunEventRecord = {
            id: nanoid(),
            runId,
            eventType,
            tsMs,
            payloadJson: JSON.stringify(payload),
          };
          this.store.appendEvent(record);
          const timeline = runTimelineMap.get(runId) ?? [];
          timeline.push(record);
          runTimelineMap.set(runId, timeline);
          this.store.updateRunTimeline(runId, timeline);
          this.emit("timeline", record);
        };
        pushEvent("sample_start", { app: app.name, sample: sample.relativePath });

        let failureCategory: FailureCategory | undefined;
        let failureReason = "";
        let status: ResultStatus = "success";
        let shouldExitAfterCurrentRun = false;
        let triggerStopTs: number | undefined;
        try {
          this.throwIfStopped();
          pushEvent("focus_input", {});
          await this.waitUnlessStopped(50);

          if (!resolvedApp) {
            throw { category: "target_app_not_installed", message: `${app.appFileName} is not installed` };
          }
          if (isSelfTestApp) {
            pushEvent("selftest_mode", { app: app.name });
          } else {
            if (appLaunchFailure) {
              throw appLaunchFailure;
            }
            if (!appLaunched) {
              pushEvent("app_launch", { app: app.name, target: basename(resolvedApp) });
              try {
                await this.withAbortableHelper(async (signal) => await this.helper.activateApp(resolvedApp, signal));
                if (config.appLaunchDelayMs > 0) {
                  pushEvent("app_launch_wait", { app: app.name, delayMs: config.appLaunchDelayMs });
                  await this.waitUnlessStopped(config.appLaunchDelayMs);
                }
                appLaunched = true;
              } catch (error) {
                if (error instanceof RunCancelledError) throw error;
                appLaunchFailure = {
                  category: "target_app_not_ready",
                  message: (error as Error).message || "Failed to launch target app",
                };
                throw appLaunchFailure;
              }
            }
            this.progress.phase = "focus_input";
            this.progress.message = `${app.name} 已拉起，等待应用就绪后再回到检测框`;
            this.emit("progress", { ...this.progress });
          }

          this.progress.phase = "wait_before_hotkey";
          this.emit("progress", { ...this.progress });
          if (config.focusInputDelayMs > 0) {
            pushEvent("focus_input_wait", { delayMs: config.focusInputDelayMs });
            await this.waitUnlessStopped(config.focusInputDelayMs);
          }
          if (!isSelfTestApp && (app.preHotkeyDelayMs ?? 0) > 0) {
            pushEvent("pre_hotkey_wait", { app: app.name, delayMs: app.preHotkeyDelayMs });
            await this.waitUnlessStopped(app.preHotkeyDelayMs ?? 0);
          }

          this.progress.phase = "trigger_start";
          this.emit("progress", { ...this.progress });
          pushEvent("trigger_start", { chord: app.hotkeyChord });
          const playableSamplePath = isSelfTestApp
            ? sample.filePath
            : await this.builtinSamples.resolve(sample);

          if (!isSelfTestApp && app.hotkeyTriggerMode === "hold_release" && holdHelperAvailable) {
            this.progress.phase = "wait_before_audio";
            this.emit("progress", { ...this.progress });
            this.progress.phase = "audio_playing";
            this.emit("progress", { ...this.progress });
            const holdAudioStartTs = performance.now();
            try {
              await this.withAbortableHelper(async (signal) => await this.helper.playWavHoldingHotkey(
                app.hotkeyChord,
                playableSamplePath,
                config.selectedOutputDeviceId,
                app.hotkeyToAudioDelayMs,
                app.audioToTriggerStopDelayMs,
                signal,
              ));
              pushEvent("audio_start", { sample: sample.filePath, playableSamplePath, holdMode: true }, holdAudioStartTs);
              pushEvent("audio_end", { holdMode: true });
              this.progress.phase = "trigger_stop";
              this.emit("progress", { ...this.progress });
              pushEvent("trigger_stop", { chord: app.hotkeyChord, mode: app.hotkeyTriggerMode, holdMode: true });
              triggerStopTs = performance.now();
            } catch (error) {
              if (error instanceof RunCancelledError) throw error;
              if (this.isUnsupportedHoldHelper(error)) {
                holdHelperAvailable = false;
              } else {
                pushEvent("audio_start", { sample: sample.filePath, playableSamplePath, holdMode: true }, holdAudioStartTs);
                throw { category: "hotkey_dispatch_failed", message: (error as Error).message || "Failed to hold hotkey during audio playback" };
              }
            }
          }

          if (isSelfTestApp || app.hotkeyTriggerMode !== "hold_release"
            || !holdHelperAvailable
            || triggerStopTs === undefined) {
            if (!isSelfTestApp) {
              try {
                if (app.hotkeyTriggerMode === "hold_release") {
                  await this.withAbortableHelper(async (signal) => await this.helper.sendHotkey(app.hotkeyChord, "down", signal));
                } else {
                  await this.withAbortableHelper(async (signal) => await this.helper.sendHotkey(app.hotkeyChord, "press", signal));
                }
              } catch (error) {
                if (error instanceof RunCancelledError) throw error;
                throw { category: "hotkey_dispatch_failed", message: (error as Error).message || "Failed to send start hotkey" };
              }
            }

            this.progress.phase = "wait_before_audio";
            this.emit("progress", { ...this.progress });
            await this.waitUnlessStopped(app.hotkeyToAudioDelayMs);

            this.progress.phase = "audio_playing";
            this.emit("progress", { ...this.progress });
            pushEvent("audio_start", { sample: sample.filePath, playableSamplePath });
            if (isSelfTestApp) {
              await this.waitUnlessStopped(Math.max(sample.durationMs, 100));
            } else {
              try {
                await this.withAbortableHelper(async (signal) => await this.helper.playWav(playableSamplePath, config.selectedOutputDeviceId, signal));
              } catch (error) {
                if (error instanceof RunCancelledError) throw error;
                throw { category: "audio_play_failed", message: (error as Error).message || "Failed to play audio sample" };
              }
            }
            pushEvent("audio_end", {});
            await this.waitUnlessStopped(app.audioToTriggerStopDelayMs);

            this.progress.phase = "trigger_stop";
            this.emit("progress", { ...this.progress });
            pushEvent("trigger_stop", { chord: app.hotkeyChord, mode: app.hotkeyTriggerMode });
            if (!isSelfTestApp) {
              try {
                if (app.hotkeyTriggerMode === "hold_release") {
                  await this.withAbortableHelper(async (signal) => await this.helper.sendHotkey(app.hotkeyChord, "up", signal));
                } else {
                  await this.withAbortableHelper(async (signal) => await this.helper.sendHotkey(app.hotkeyChord, "press", signal));
                }
                triggerStopTs = performance.now();
              } catch (error) {
                if (error instanceof RunCancelledError) throw error;
                throw { category: "hotkey_dispatch_failed", message: (error as Error).message || "Failed to send stop hotkey" };
              }
            } else {
              triggerStopTs = performance.now();
              const text = sample.expectedText || sample.displayName.replace(/\.[^.]+$/i, "");
              const chunks = text.length > 8 ? [text.slice(0, Math.ceil(text.length / 2)), text] : [text];
              this.emitSelfTestText(chunks);
            }
          }

          this.progress.phase = "observing_text";
          this.emit("progress", { ...this.progress });
          const observed = await this.waitForObservation(config.resultTimeoutMs, app.settleWindowMs);
          pushEvent("input_observed", { count: observed.events.length });
          const rawText = observed.finalValue;
          if (!observed.events.length) {
            throw { category: "no_text_observed", message: "No text observed in input sink" };
          }
          if (!rawText.trim()) {
            throw { category: "empty_result", message: "Final text is empty" };
          }
          const firstInputTs = observed.events[0].tsMs;
          const lastInputTs = observed.events[observed.events.length - 1].tsMs;
          const end = performance.now();
          const resolvedTriggerStopTs = triggerStopTs ?? end;
          const record: TestRunRecord = {
            id: runId,
            runSessionId: sessionId,
            appId: app.id,
            appName: app.name,
            appVersion: installedInfo?.version ?? installedInfo?.buildVersion,
            sampleId: sample.id,
            samplePath: sample.relativePath,
            status: "success",
            phase: "completed",
            rawText,
            normalizedText: rawText.trim(),
            expectedText: sample.expectedText,
            hotkeyToAudioMs: app.hotkeyToAudioDelayMs,
            triggerStopToFirstCharMs: Math.round(firstInputTs - resolvedTriggerStopTs),
            triggerStopToFinalTextMs: Math.round(lastInputTs - resolvedTriggerStopTs),
            totalRunMs: Math.round(end - started),
            inputEventCount: observed.events.length,
            finalTextLength: rawText.length,
            createdAt: new Date().toISOString(),
            retryRootRunId: options?.retryRootRunId,
            retryAttempt: options?.retryRootRunId ? this.store.getNextRetryAttempt(options.retryRootRunId) : 0,
            timeline: [...(runTimelineMap.get(runId) ?? [])],
          };
          this.store.insertRun(record);
          completed += 1;
          const batchFinished = completed >= totalRuns;
          this.progress = {
            sessionId,
            runId,
            phase: batchFinished ? "completed" : "between_samples_wait",
            currentAppName: app.name,
            currentSamplePath: sample.relativePath,
            textValue: rawText,
            message: batchFinished ? "Completed" : "当前样本已完成，准备下一条",
            completedRuns: completed,
            totalRuns,
          };
          this.emit("result", record);
          this.emit("progress", { ...this.progress });
        } catch (error) {
          status = this.stopRequested || error instanceof RunCancelledError ? "cancelled" : "failed";
          failureCategory = status === "cancelled" ? undefined : ((error as { category?: FailureCategory }).category ?? "timeout_waiting_result");
          failureReason = (error as { message?: string }).message ?? (status === "cancelled" ? "Run cancelled" : "Run failed");
          if (status !== "cancelled") {
            pushEvent("run_failed", {
              app: app.name,
              sample: sample.relativePath,
              reason: failureReason,
              category: failureCategory,
            });
          }
          const record: TestRunRecord = {
            id: runId,
            runSessionId: sessionId,
            appId: app.id,
            appName: app.name,
            appVersion: installedInfo?.version ?? installedInfo?.buildVersion,
            sampleId: sample.id,
            samplePath: sample.relativePath,
            status,
            phase: status === "cancelled" ? "cancelled" : "failed",
            failureCategory: status === "cancelled" ? undefined : failureCategory,
            failureReason,
            rawText: this.progress.textValue,
            normalizedText: this.progress.textValue.trim(),
            expectedText: sample.expectedText,
            inputEventCount: this.current?.values.length ?? 0,
            finalTextLength: this.progress.textValue.length,
            createdAt: new Date().toISOString(),
            retryRootRunId: options?.retryRootRunId,
            retryAttempt: options?.retryRootRunId ? this.store.getNextRetryAttempt(options.retryRootRunId) : 0,
            timeline: [...(runTimelineMap.get(runId) ?? [])],
          };
          this.store.insertRun(record);
          if (status !== "cancelled") {
            completed += 1;
          } else {
            shouldExitAfterCurrentRun = true;
          }
          this.progress = {
            sessionId,
            runId,
            phase: status === "cancelled" ? "cancelled" : (completed >= totalRuns ? "failed" : "between_samples_wait"),
            currentAppName: app.name,
            currentSamplePath: sample.relativePath,
            textValue: this.progress.textValue,
            message: failureReason,
            failureCategory,
            failureReason,
            completedRuns: completed,
            totalRuns,
          };
          this.emit("result", record);
          this.emit("progress", { ...this.progress });
        } finally {
          this.current = undefined;
          const isLastSampleForApp = sampleIndex === samples.length - 1;
          if (!this.stopRequested && !shouldExitAfterCurrentRun && !isLastSampleForApp && config.betweenSamplesDelayMs > 0) {
            pushEvent("between_samples_wait", { delayMs: config.betweenSamplesDelayMs });
            try {
              await this.waitUnlessStopped(config.betweenSamplesDelayMs);
            } catch (error) {
              if (error instanceof RunCancelledError) {
                shouldExitAfterCurrentRun = true;
              } else {
                throw error;
              }
            }
          }
        }

        if (shouldExitAfterCurrentRun || this.stopRequested) {
          this.finishCancelledSession(sessionId, completed, totalRuns);
          return preflight;
        }
      }

      if (!isSelfTestApp && appLaunched && !this.stopRequested && lastRunIdForApp) {
        const closeTarget = resolvedApp;
        if (!closeTarget) {
          this.finishCancelledSession(sessionId, completed, totalRuns);
          return preflight;
        }
        try {
          if (config.closeAppDelayMs > 0) {
            appendEventForRun(lastRunIdForApp, "app_close_wait", { app: app.name, delayMs: config.closeAppDelayMs });
            await this.waitUnlessStopped(config.closeAppDelayMs);
          }
          await this.withAbortableHelper(async (signal) => await this.helper.closeApp(closeTarget, signal));
          appendEventForRun(lastRunIdForApp, "app_close", { app: app.name });
        } catch (error) {
          if (error instanceof RunCancelledError) {
            this.finishCancelledSession(sessionId, completed, totalRuns);
            return preflight;
          }
          throw error;
        }
      }

    }

    if (this.stopRequested) {
      this.finishCancelledSession(sessionId, completed, totalRuns);
      return preflight;
    }

    this.store.updateSessionStatus(sessionId, "completed", new Date().toISOString());
    return preflight;
  }

  private async prepareRun(config: AppConfig, options?: RunStartOptions): Promise<PreparedRunContext> {
    const requestedAppIds = options?.appIds?.length ? new Set(options.appIds) : undefined;
    const requestedSampleIds = options?.sampleIds?.length ? new Set(options.sampleIds) : undefined;
    const enabledApps = requestedAppIds
      ? config.targetApps.filter((item) => requestedAppIds.has(item.id))
      : config.targetApps.filter((item) => item.enabled);
    const samples = requestedSampleIds
      ? config.audioSamples.filter((item) => requestedSampleIds.has(item.id))
      : config.audioSamples.filter((item) => item.enabled);
    const resolvedApps = await Promise.all(
      enabledApps.map(async (app) => {
        const installedInfo = await this.inspectTargetApp(app);
        const resolved = installedInfo.appPath ?? (installedInfo.isBuiltin ? app.launchCommand : undefined);
        const isSelftest = Boolean(installedInfo.isBuiltin || resolved?.startsWith("selftest://"));
        return {
          app,
          resolved,
          installedInfo,
          isSelftest,
          ok: Boolean(resolved),
        };
      }),
    );
    const permissionSnapshot = await this.permissions.snapshot();
    const accessibilityGranted = permissionSnapshot.permissions.find((item) => item.id === "accessibility")?.granted ?? false;

    const appReadiness = resolvedApps.map((item) => {
      if (!item.ok) {
        return { ...item, runnable: false, skipReason: "missing" as const };
      }
      if (!item.isSelftest && !accessibilityGranted) {
        return { ...item, runnable: false, skipReason: "permission" as const };
      }
      return { ...item, runnable: true, skipReason: undefined };
    });

    const runnableApps = appReadiness.filter((item) => item.runnable);
    const preflight = await this.permissions.buildPreflight({
      hasSamples: samples.length > 0,
      hasEnabledApps: enabledApps.length > 0,
      hasRunnableApps: runnableApps.length > 0,
      dbReady: await this.checkDbWritable(config.databasePath),
      selectedDeviceId: config.selectedOutputDeviceId,
      requiresAccessibility: runnableApps.some((item) => !item.isSelftest),
      appChecks: appReadiness.map((item) => ({
        key: `app:${item.app.id}`,
        ok: item.runnable || runnableApps.length > 0,
        message: item.runnable
          ? `${item.app.name} 已就绪`
          : item.skipReason === "permission"
            ? runnableApps.length > 0
              ? `当前这个测试工具没有辅助功能权限，暂时不能控制 ${item.app.name}，本轮已跳过`
              : `当前这个测试工具没有辅助功能权限，暂时不能控制 ${item.app.name}`
            : runnableApps.length > 0
              ? `${item.app.name} 未找到，本轮已跳过`
              : `${item.app.name} 未找到`,
        category: item.runnable
          ? undefined
          : item.skipReason === "permission"
            ? (runnableApps.length > 0 ? undefined : "permission_denied_accessibility")
            : (runnableApps.length > 0 ? undefined : "target_app_not_installed"),
        hint: item.runnable
          ? undefined
          : item.skipReason === "permission"
            ? "去系统设置 -> 隐私与安全性 -> 辅助功能，给当前这个 Electron 测试工具打开权限，然后回来点“刷新”。"
            : `先确认 ${item.app.appFileName} 已安装，或者先关掉它，改用“内建自测”验证流程。`,
      })),
    });

    return {
      samples,
      runnableApps,
      resolvedAppMap: new Map(runnableApps.map((item) => [item.app.id, item.resolved])),
      preflight,
    };
  }

  stop(): void {
    this.stopRequested = true;
    this.helperAbortController?.abort();
  }

  private async waitForObservation(timeoutMs: number, settleWindowMs: number): Promise<{ finalValue: string; events: InputObservationEvent[] }> {
    const started = performance.now();
    let lastCount = 0;
    let settledSince: number | undefined;
    while (performance.now() - started < timeoutMs) {
      this.throwIfStopped();
      const events = (this.current?.values ?? []).filter((event) => event.type === "input");
      if (events.length !== lastCount) {
        lastCount = events.length;
        settledSince = performance.now();
      } else if (events.length > 0 && settledSince && performance.now() - settledSince >= settleWindowMs) {
        return { finalValue: events[events.length - 1]?.value ?? "", events };
      }
      await this.waitUnlessStopped(50);
    }
    this.throwIfStopped();
    throw { category: "timeout_waiting_result", message: "Timed out waiting for stable text" };
  }

  private async checkDbWritable(databasePath: string): Promise<boolean> {
    const resolvedDatabasePath = resolveHomePath(databasePath);
    try {
      await access(dirname(resolvedDatabasePath), constants.W_OK).catch(async () => {
        await writeFile(join(dirname(resolvedDatabasePath), ".vtc-write-test"), "", { flag: "a" });
      });
      return true;
    } catch {
      return false;
    }
  }

  private throwIfStopped(): void {
    if (this.stopRequested) {
      throw new RunCancelledError();
    }
  }

  private async waitUnlessStopped(ms: number): Promise<void> {
    if (ms <= 0) {
      this.throwIfStopped();
      return;
    }
    const started = performance.now();
    while (performance.now() - started < ms) {
      this.throwIfStopped();
      await wait(Math.min(50, ms - (performance.now() - started)));
    }
    this.throwIfStopped();
  }

  private async withAbortableHelper<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
    this.throwIfStopped();
    const controller = new AbortController();
    this.helperAbortController = controller;
    try {
      return await task(controller.signal);
    } finally {
      if (this.helperAbortController === controller) {
        this.helperAbortController = undefined;
      }
    }
  }

  private finishCancelledSession(sessionId: string, completedRuns: number, totalRuns: number): void {
    this.progress = {
      sessionId,
      phase: "cancelled",
      textValue: this.progress.textValue,
      message: "Run cancelled",
      completedRuns,
      totalRuns,
    };
    this.store.updateSessionStatus(sessionId, "cancelled", new Date().toISOString());
    this.emit("progress", { ...this.progress });
  }

  private async inspectTargetApp(app: AppConfig["targetApps"][number]): Promise<InstalledTargetAppInfo> {
    if (typeof (this.targets as TargetAppManager & { inspect?: unknown }).inspect === "function") {
      return await this.targets.inspect(app);
    }
    const resolved = await this.targets.resolve(app);
    return {
      profileId: app.id,
      installed: Boolean(resolved),
      isBuiltin: Boolean(resolved?.startsWith("selftest://")),
      appPath: resolved && !resolved.startsWith("selftest://") ? resolved : undefined,
    };
  }
}
