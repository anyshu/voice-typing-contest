import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import type { AppConfig, AudioSample, InputObservationEvent, RunStartOptions, TargetAppProfile } from "../shared/types";
import { SampleManager } from "./sample-manager";
import { ConfigStore } from "./config-store";
import { ResultStore } from "./result-store";
import { PermissionManager } from "./permission-manager";
import { RunController } from "./run-controller";
import { formatTimelineLog } from "./run-logging";
import { BuiltinSampleMaterializer } from "./builtin-sample-materializer";
import { TargetAppManager } from "./target-app-manager";

interface IpcDeps {
  configStore: ConfigStore;
  sampleManager: SampleManager;
  resultStore: ResultStore;
  permissionManager: PermissionManager;
  runController: RunController;
  getConfig: () => AppConfig;
  setConfig: (config: AppConfig) => void;
  getDevices: () => unknown[];
  getPermissions: () => unknown[];
}

export function registerIpc(win: BrowserWindow, deps: IpcDeps): void {
  const execFileAsync = promisify(execFile);
  let activeRun: Promise<unknown> | null = null;
  const timelineFirstTsByRunId = new Map<string, number>();
  const builtinSamples = new BuiltinSampleMaterializer();
  const targetAppManager = new TargetAppManager();
  const handle = <Args extends unknown[], Result>(channel: string, listener: (...args: Args) => Result): void => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, listener);
  };

  handle("settings:get", async () => {
    let current = deps.getConfig();
    const validation = await deps.sampleManager.validate(current.audioSamples);
    if (validation.changed) {
      current = { ...current, audioSamples: validation.samples };
      deps.setConfig(current);
      deps.configStore.save(current);
      deps.resultStore.syncConfig(current);
    }
    return {
      ...current,
      devices: deps.getDevices(),
      permissions: deps.getPermissions(),
    };
  });

  handle("settings:save", async (_event, config: AppConfig) => {
    deps.setConfig(config);
    deps.configStore.save(config);
    deps.resultStore.syncConfig(config);
    return { ok: true };
  });

  handle("samples:pickRoot", async () => {
    const result = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
    return result.canceled ? undefined : result.filePaths[0];
  });

  handle("samples:pickJsonl", async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [{ name: "JSON Lines", extensions: ["jsonl"] }],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  handle("samples:rescan", async (_event, config: Pick<AppConfig, "sampleSourceType" | "sampleRoot" | "sampleJsonlPath">) => {
    return await deps.sampleManager.loadFromConfig({
      ...deps.getConfig(),
      ...config,
      audioSamples: deps.getConfig().audioSamples,
    });
  });
  handle("samples:getPreviewData", async (_event, sample: AudioSample) => {
    const resolvedPath = await builtinSamples.resolve(sample);
    const buffer = await readFile(resolvedPath);
    const lowerPath = resolvedPath.toLowerCase();
    const mimeType = lowerPath.endsWith(".mp3")
      ? "audio/mpeg"
      : lowerPath.endsWith(".ogg")
        ? "audio/ogg"
        : lowerPath.endsWith(".aiff") || lowerPath.endsWith(".aif")
          ? "audio/aiff"
        : "audio/wav";
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  });

  handle("database:pickPath", async () => {
    const result = await dialog.showSaveDialog(win, {
      defaultPath: join(dirname(deps.getConfig().databasePath), "voice-typing-contest.sqlite"),
      filters: [{ name: "SQLite", extensions: ["sqlite", "db"] }],
    });
    return result.canceled ? undefined : result.filePath;
  });

  handle("permissions:refresh", async () => {
    return await deps.permissionManager.snapshot();
  });

  handle("permissions:requestAccessibility", async () => {
    await deps.permissionManager.requestAccessibilityPermission();
    return await deps.permissionManager.snapshot();
  });

  handle("permissions:openSettings", async (_event, pane: string) => {
    await shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`);
    return { ok: true };
  });

  handle("app:openExternalUrl", async (_event, rawUrl: string) => {
    const normalized = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let url: URL;
    try {
      url = new URL(normalized);
    } catch {
      throw new Error("无效链接。");
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("只支持打开 http 或 https 链接。");
    }
    await shell.openExternal(url.toString());
    return { ok: true };
  });

  handle("apps:getInstalledInfo", async (_event, profiles: TargetAppProfile[]) => {
    return await Promise.all(profiles.map(async (profile) => await targetAppManager.inspect(profile)));
  });

  handle("window:focusBenchmark", async () => {
    if (win.isFocused()) {
      win.webContents.focus();
      return { ok: true };
    }

    const settleFocus = (): void => {
      app.focus({ steal: true });
      win.show();
      win.focus();
      win.moveTop();
      win.webContents.focus();
    };

    if (win.isMinimized()) {
      win.restore();
    }
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setAlwaysOnTop(true, "screen-saver", 1);
    settleFocus();
    await new Promise((resolve) => setTimeout(resolve, 80));
    settleFocus();
    setTimeout(() => {
      if (win.isDestroyed()) return;
      win.setAlwaysOnTop(false);
      win.setVisibleOnAllWorkspaces(false);
    }, 180);
    return { ok: true };
  });

  handle("run:start", async (_event, options?: RunStartOptions) => {
    const phase = deps.runController.getProgress().phase;
    const terminal = phase === "idle" || phase === "completed" || phase === "failed" || phase === "cancelled";

    if (activeRun) {
      if (!terminal) {
        throw new Error("上一轮测试还在运行或关闭中，请稍候再开始。");
      }
      try {
        await activeRun;
      } catch {
        // Ignore the previous run outcome; we only need it fully settled.
      }
    }

    activeRun = deps.runController.run(deps.getConfig(), options);
    try {
      return await activeRun;
    } finally {
      activeRun = null;
    }
  });
  handle("run:emitTimelineEvent", async (_event, runId: string, eventType: string, payload: Record<string, unknown>) => {
    const record = {
      id: nanoid(),
      runId,
      eventType,
      tsMs: performance.now(),
      payloadJson: JSON.stringify(payload),
    };
    console.log(formatTimelineLog(record, timelineFirstTsByRunId));
    win.webContents.send("run:event", record);
    return { ok: true };
  });
  handle("run:inspect", async () => await deps.runController.inspect(deps.getConfig()));
  handle("run:stop", async () => deps.runController.stop());
  handle("results:list", async () => deps.resultStore.listRuns());
  handle("results:listSessions", async () => deps.resultStore.listSessions());
  handle("results:getDetail", async (_event, runId: string) => deps.resultStore.getRunDetail(runId));
  handle("results:exportBundle", async (_event, runSessionId?: string) => {
    const suffix = runSessionId ? `-${runSessionId.slice(0, 8)}` : "";
    const result = await dialog.showSaveDialog(win, { defaultPath: `voice-typing-contest-results${suffix}.zip` });
    if (result.canceled || !result.filePath) return undefined;
    const tempRoot = await mkdtemp(join(tmpdir(), "vtc-export-"));
    const bundleDir = join(tempRoot, `voice-typing-contest-results${suffix}`);
    try {
      await mkdir(bundleDir, { recursive: true });
      await writeFile(join(bundleDir, "results.csv"), deps.resultStore.exportCsv(runSessionId), "utf8");
      await writeFile(join(bundleDir, "system-info.csv"), deps.resultStore.exportResourceCsv(runSessionId), "utf8");
      await writeFile(join(bundleDir, "system-summary.csv"), deps.resultStore.exportResourceSummaryCsv(runSessionId), "utf8");
      await execFileAsync("/usr/bin/ditto", ["-c", "-k", "--keepParent", bundleDir, result.filePath]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
    return result.filePath;
  });
  handle("results:pickImportCsv", async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });
  handle("results:importCsv", async (_event, filePath: string) => {
    const csvText = await readFile(filePath, "utf8");
    return deps.resultStore.importCsv(
      csvText,
      filePath,
      deps.getConfig(),
      deps.getPermissions() as any,
      deps.getDevices() as any,
    );
  });
  handle("results:importCsvContent", async (_event, csvText: string, sourceName: string) => {
    return deps.resultStore.importCsv(
      csvText,
      sourceName,
      deps.getConfig(),
      deps.getPermissions() as any,
      deps.getDevices() as any,
    );
  });
  ipcMain.removeAllListeners("run:inputEvent");
  ipcMain.on("run:inputEvent", (_event, payload: InputObservationEvent) => deps.runController.onInputEvent(payload));
}
