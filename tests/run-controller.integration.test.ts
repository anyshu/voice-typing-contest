import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { defaultConfig } from "../src/shared/defaults";
import { ResultStore } from "../src/main/result-store";
import { PermissionManager } from "../src/main/permission-manager";
import { TargetAppManager } from "../src/main/target-app-manager";
import { RunController } from "../src/main/run-controller";
import { ConfigStore } from "../src/main/config-store";

function createWav(durationMs = 240): Buffer {
  const sampleRate = 16000;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * channels * bytesPerSample;
  const dataSize = Math.floor((durationMs / 1000) * byteRate);
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

let root = "";

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("RunController integration", () => {
  it("can rerun only a selected app and sample from history", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-run-retry-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const firstWavPath = join(sampleRoot, "first.wav");
    const secondWavPath = join(sampleRoot, "second.wav");
    await writeFile(firstWavPath, createWav());
    await writeFile(secondWavPath, createWav());

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.sampleRoot = sampleRoot;
    config.databasePath = join(root, "vtc.sqlite");
    config.betweenSamplesDelayMs = 0;
    config.targetApps = [
      {
        ...config.targetApps.find((app) => app.id === "selftest")!,
        id: "selftest-a",
        name: "自测 A",
        enabled: false,
      },
      {
        ...config.targetApps.find((app) => app.id === "selftest")!,
        id: "selftest-b",
        name: "自测 B",
        enabled: false,
      },
    ];
    config.audioSamples = [
      {
        id: "sample-1",
        filePath: firstWavPath,
        relativePath: "first.wav",
        displayName: "first.wav",
        expectedText: "first transcript",
        language: "en",
        durationMs: 240,
        tags: ["selftest"],
        enabled: false,
      },
      {
        id: "sample-2",
        filePath: secondWavPath,
        relativePath: "second.wav",
        displayName: "second.wav",
        expectedText: "second transcript",
        language: "en",
        durationMs: 240,
        tags: ["selftest"],
        enabled: false,
      },
    ];

    const store = new ResultStore(config.databasePath);
    store.createSession({
      id: "session-history",
      startedAt: "2026-03-24T09:59:00.000Z",
      selectedAppIds: [],
      selectedSampleIds: [],
      permissionSnapshot: [],
      deviceSnapshot: [],
      configSnapshot: config,
      status: "completed",
    });
    store.insertRun({
      id: "history-run-1",
      runSessionId: "session-history",
      appId: "selftest-b",
      appName: "自测 B",
      sampleId: "sample-2",
      samplePath: "second.wav",
      status: "failed",
      phase: "failed",
      rawText: "",
      normalizedText: "",
      inputEventCount: 0,
      finalTextLength: 0,
      createdAt: "2026-03-24T01:00:00.000Z",
      timeline: [],
    });
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
      activateApp: async () => undefined,
      playWav: async () => undefined,
      sendHotkey: async () => undefined,
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;
    const controller = new RunController(
      store,
      permissions,
      new TargetAppManager(),
      { activateApp: async () => undefined, closeApp: async () => undefined, playWav: async () => undefined, sendHotkey: async () => undefined } as any,
      (chunks) => {
        chunks.forEach((value, index) => {
          setTimeout(() => {
            controller.onInputEvent({ type: "input", tsMs: performance.now(), value });
          }, 40 * (index + 1));
        });
      },
    );

    const preflight = await controller.run(config, {
      appIds: ["selftest-b"],
      sampleIds: ["sample-2"],
      retryRootRunId: "history-run-1",
    });

    expect(preflight.ok).toBe(true);
    const runs = store.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.appId).toBe("selftest-b");
    expect(runs[0]?.sampleId).toBe("sample-2");
    expect(runs[0]?.rawText).toBe("second transcript");
    expect(runs[0]?.retryRootRunId).toBe("history-run-1");
    expect(runs[0]?.retryCount).toBe(1);
    store.close();
  });

  it("runs a self-test sample end to end and persists records", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-run-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const wavPath = join(sampleRoot, "selftest.wav");
    await writeFile(wavPath, createWav());

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.sampleRoot = sampleRoot;
    config.databasePath = join(root, "vtc.sqlite");
    config.betweenSamplesDelayMs = 0;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "selftest",
    }));
    config.audioSamples = [
      {
        id: "sample-1",
        filePath: wavPath,
        relativePath: "selftest.wav",
        displayName: "selftest.wav",
        expectedText: "self test transcript",
        language: "en",
        durationMs: 240,
        tags: ["selftest"],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
      activateApp: async () => undefined,
      playWav: async () => undefined,
      sendHotkey: async () => undefined,
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;
    const controller = new RunController(
      store,
      permissions,
      new TargetAppManager(),
      { activateApp: async () => undefined, closeApp: async () => undefined, playWav: async () => undefined, sendHotkey: async () => undefined } as any,
      (chunks) => {
        chunks.forEach((value, index) => {
          setTimeout(() => {
            controller.onInputEvent({ type: "input", tsMs: performance.now(), value });
          }, 40 * (index + 1));
        });
      },
    );

    const preflight = await controller.run(config);
    expect(preflight.ok).toBe(true);
    const runs = store.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("success");
    expect(runs[0]?.rawText).toBe("self test transcript");
    expect(runs[0]?.triggerStopToFirstCharMs).toBeGreaterThanOrEqual(20);
    expect(runs[0]?.triggerStopToFirstCharMs).toBeLessThan(160);
    expect(runs[0]?.triggerStopToFinalTextMs).toBeGreaterThanOrEqual(runs[0]?.triggerStopToFirstCharMs ?? 0);
    const detail = store.getRunDetail(runs[0]!.id);
    expect(detail?.events.length).toBeGreaterThan(0);
    expect(detail?.record.timeline.length).toBe(detail?.events.length);
    expect(detail?.record.timeline.some((event) => event.eventType === "app_start")).toBe(true);
    expect(store.exportCsv()).toContain("trigger_stop_to_first_char_ms");
    expect(store.exportCsv()).toContain("self test transcript");
    store.close();
  });

  it("uses a single helper hold session for hold_release apps", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-run-hold-"));
    const sampleRoot = join(root, "samples");
    const fakeAppPath = join(root, "Typeless.app");
    await mkdir(sampleRoot, { recursive: true });
    await mkdir(fakeAppPath, { recursive: true });
    const wavPath = join(sampleRoot, "hold.wav");
    await writeFile(wavPath, createWav());

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.sampleRoot = sampleRoot;
    config.databasePath = join(root, "vtc.sqlite");
    config.betweenSamplesDelayMs = 0;
    config.resultTimeoutMs = 1000;
    config.targetApps = [
      {
        ...config.targetApps.find((app) => app.id === "typeless")!,
        enabled: true,
        appFileName: fakeAppPath,
        hotkeyChord: "Fn",
        hotkeyTriggerMode: "hold_release",
        hotkeyToAudioDelayMs: 25,
        audioToTriggerStopDelayMs: 25,
        resultTimeoutMs: 1000,
        settleWindowMs: 80,
      },
    ];
    config.audioSamples = [
      {
        id: "sample-1",
        filePath: wavPath,
        relativePath: "hold.wav",
        displayName: "hold.wav",
        expectedText: "hold transcript",
        language: "en",
        durationMs: 240,
        tags: ["typeless"],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const helperCalls: string[] = [];
    let controller: RunController;
    const helper = {
      activateApp: async () => {
        helperCalls.push("activateApp");
      },
      closeApp: async () => {
        helperCalls.push("closeApp");
      },
      playWav: async () => {
        helperCalls.push("playWav");
      },
      playWavHoldingHotkey: async () => {
        helperCalls.push("playWavHoldingHotkey");
        setTimeout(() => {
          controller.onInputEvent({ type: "input", tsMs: performance.now(), value: "hold transcript" });
        }, 10);
      },
      sendHotkey: async () => {
        helperCalls.push("sendHotkey");
      },
    };
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
      activateApp: async () => undefined,
      playWav: async () => undefined,
      sendHotkey: async () => undefined,
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;
    controller = new RunController(
      store,
      permissions,
      new TargetAppManager(),
      helper as any,
      () => undefined,
    );

    const preflight = await controller.run(config);
    expect(preflight.ok).toBe(true);
    expect(helperCalls).toContain("playWavHoldingHotkey");
    expect(helperCalls).not.toContain("sendHotkey");
    expect(helperCalls).not.toContain("playWav");
    store.close();
  });

  it("persists the terminal failure event inside the run timeline snapshot", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-run-failed-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const wavPath = join(sampleRoot, "selftest.wav");
    await writeFile(wavPath, createWav());

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.sampleRoot = sampleRoot;
    config.databasePath = join(root, "vtc.sqlite");
    config.betweenSamplesDelayMs = 0;
    config.resultTimeoutMs = 120;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "selftest",
      hotkeyToAudioDelayMs: app.id === "selftest" ? 0 : app.hotkeyToAudioDelayMs,
      audioToTriggerStopDelayMs: app.id === "selftest" ? 0 : app.audioToTriggerStopDelayMs,
      settleWindowMs: app.id === "selftest" ? 20 : app.settleWindowMs,
    }));
    config.audioSamples = [
      {
        id: "sample-1",
        filePath: wavPath,
        relativePath: "selftest.wav",
        displayName: "selftest.wav",
        expectedText: "self test transcript",
        language: "en",
        durationMs: 240,
        tags: ["selftest"],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
    } as any);
    (permissions as any).checkAccessibilityPermission = () => false;

    const controller = new RunController(
      store,
      permissions,
      new TargetAppManager(),
      { activateApp: async () => undefined, closeApp: async () => undefined, playWav: async () => undefined, sendHotkey: async () => undefined } as any,
      () => {
        // Intentionally emit no self-test text so the run fails on timeout.
      },
    );

    const preflight = await controller.run(config);
    expect(preflight.ok).toBe(true);
    const run = store.listRuns()[0];
    expect(run?.status).toBe("failed");
    expect(run?.timeline.at(-1)?.eventType).toBe("run_failed");
    expect(store.getRunDetail(run!.id)?.record.timeline.at(-1)?.eventType).toBe("run_failed");
    store.close();
  });

  it("persists config and restores it from disk", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-config-"));
    const configPath = join(root, "config.json");
    const store = new ConfigStore(configPath);
    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.workspaceLabel = "Restored Config";
    config.databasePath = join(root, "restored.sqlite");
    config.betweenSamplesDelayMs = 1800;
    store.save(config);
    const loaded = store.load();
    expect(loaded.workspaceLabel).toBe("Restored Config");
    expect(loaded.databasePath).toBe(join(root, "restored.sqlite"));
    expect(loaded.betweenSamplesDelayMs).toBe(1800);
    const raw = JSON.parse(await readFile(configPath, "utf8"));
    expect(raw.workspaceLabel).toBe("Restored Config");
  });

  it("keeps self-test runnable when a real app is enabled but lacks accessibility permission", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-run-skip-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const wavPath = join(sampleRoot, "selftest.wav");
    await writeFile(wavPath, createWav());

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.sampleRoot = sampleRoot;
    config.databasePath = join(root, "vtc.sqlite");
    config.betweenSamplesDelayMs = 0;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "selftest" || app.id === "xiguashuo",
      appFileName: app.id === "xiguashuo" ? "西瓜说" : app.appFileName,
      name: app.id === "xiguashuo" ? "西瓜说" : app.name,
    }));
    config.audioSamples = [
      {
        id: "sample-1",
        filePath: wavPath,
        relativePath: "selftest.wav",
        displayName: "selftest.wav",
        expectedText: "self test transcript",
        language: "en",
        durationMs: 240,
        tags: ["selftest"],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const requestAccessibilityPermission = vi.fn(async () => ({ granted: false }));
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: false },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
      requestAccessibilityPermission,
      activateApp: async () => undefined,
      playWav: async () => undefined,
      sendHotkey: async () => undefined,
    } as any);
    const controller = new RunController(
      store,
      permissions,
      {
        resolve: async (app: { id: string }) => {
          if (app.id === "selftest") return "selftest://echo";
          if (app.id === "xiguashuo") return "/Applications/西瓜说.app";
          return undefined;
        },
      } as any,
      { activateApp: async () => undefined, closeApp: async () => undefined, playWav: async () => undefined, sendHotkey: async () => undefined } as any,
      (chunks) => {
        chunks.forEach((value, index) => {
          setTimeout(() => {
            controller.onInputEvent({ type: "input", tsMs: performance.now(), value });
          }, 40 * (index + 1));
        });
      },
    );

    const preflight = await controller.run(config);
    expect(preflight.ok).toBe(true);
    const skipped = preflight.items.find((item) => item.key === "app:xiguashuo");
    expect(skipped?.message).toContain("已跳过");
    expect(requestAccessibilityPermission).not.toHaveBeenCalled();
    const runs = store.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.appId).toBe("selftest");
    expect(runs[0]?.status).toBe("success");
    store.close();
  });

  it("materializes builtin samples into real audio files for real app playback", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-real-app-"));
    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.databasePath = join(root, "vtc.sqlite");
    config.resultTimeoutMs = 1200;
    config.betweenSamplesDelayMs = 0;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "xiguashuo",
      appFileName: app.id === "xiguashuo" ? "西瓜说" : app.appFileName,
      name: app.id === "xiguashuo" ? "西瓜说" : app.name,
      settleWindowMs: app.id === "xiguashuo" ? 120 : app.settleWindowMs,
    }));
    config.audioSamples = [defaultConfig().audioSamples[0]!];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;

    let playedPath = "";
    let controller!: RunController;
    const activateApp = vi.fn(async () => undefined);
    const closeApp = vi.fn(async () => undefined);
    const helper = {
      activateApp,
      closeApp,
      sendHotkey: async () => undefined,
      playWav: async (filePath: string) => {
        playedPath = filePath;
        setTimeout(() => {
          controller.onInputEvent({ type: "input", tsMs: performance.now(), value: "real app transcript" });
        }, 80);
      },
    };

    controller = new RunController(
      store,
      permissions,
      {
        resolve: async (app: { id: string }) => app.id === "xiguashuo" ? "/Applications/西瓜说.app" : undefined,
      } as any,
      helper as any,
      () => undefined,
    );

    const preflight = await controller.run(config);
    expect(preflight.ok).toBe(true);
    expect(playedPath.startsWith("__builtin__/")).toBe(false);
    expect(existsSync(playedPath)).toBe(true);
    const runs = store.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("success");
    expect(runs[0]?.rawText).toBe("real app transcript");
    expect(activateApp).toHaveBeenCalledTimes(1);
    expect(activateApp).toHaveBeenCalledWith("/Applications/西瓜说.app", expect.any(AbortSignal));
    expect(closeApp).toHaveBeenCalledTimes(1);
    store.close();
  });

  it("copies external samples into a helper-safe temp path before playback", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-external-app-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const wavPath = join(sampleRoot, "external.wav");
    await writeFile(wavPath, createWav());

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.databasePath = join(root, "vtc.sqlite");
    config.resultTimeoutMs = 1200;
    config.betweenSamplesDelayMs = 0;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "xiguashuo",
      appFileName: app.id === "xiguashuo" ? "西瓜说" : app.appFileName,
      name: app.id === "xiguashuo" ? "西瓜说" : app.name,
      settleWindowMs: app.id === "xiguashuo" ? 120 : app.settleWindowMs,
    }));
    config.audioSamples = [
      {
        id: "external-sample",
        filePath: wavPath,
        relativePath: "external.wav",
        displayName: "external.wav",
        expectedText: "external sample transcript",
        language: "en",
        durationMs: 240,
        tags: [],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;

    let playedPath = "";
    let controller!: RunController;
    const helper = {
      activateApp: async () => undefined,
      closeApp: async () => undefined,
      sendHotkey: async () => undefined,
      playWav: async (filePath: string) => {
        playedPath = filePath;
        setTimeout(() => {
          controller.onInputEvent({ type: "input", tsMs: performance.now(), value: "external sample transcript" });
        }, 80);
      },
    };

    controller = new RunController(
      store,
      permissions,
      {
        resolve: async (app: { id: string }) => app.id === "xiguashuo" ? "/Applications/西瓜说.app" : undefined,
      } as any,
      helper as any,
      () => undefined,
    );

    const preflight = await controller.run(config);
    expect(preflight.ok).toBe(true);
    expect(playedPath).not.toBe(wavPath);
    expect(playedPath.endsWith(".wav")).toBe(true);
    expect(existsSync(playedPath)).toBe(true);
    store.close();
  });

  it("launches and closes a real app once per app batch instead of once per sample", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-app-batch-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const firstWavPath = join(sampleRoot, "first.wav");
    const secondWavPath = join(sampleRoot, "second.wav");
    await writeFile(firstWavPath, createWav(40));
    await writeFile(secondWavPath, createWav(40));

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.databasePath = join(root, "vtc.sqlite");
    config.resultTimeoutMs = 1200;
    config.betweenSamplesDelayMs = 0;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "xiguashuo",
      appFileName: app.id === "xiguashuo" ? "西瓜说" : app.appFileName,
      name: app.id === "xiguashuo" ? "西瓜说" : app.name,
      launchTimeoutMs: app.id === "xiguashuo" ? 20 : app.launchTimeoutMs,
      preHotkeyDelayMs: app.id === "xiguashuo" ? 20 : app.preHotkeyDelayMs,
      hotkeyToAudioDelayMs: app.id === "xiguashuo" ? 20 : app.hotkeyToAudioDelayMs,
      audioToTriggerStopDelayMs: app.id === "xiguashuo" ? 20 : app.audioToTriggerStopDelayMs,
      settleWindowMs: app.id === "xiguashuo" ? 80 : app.settleWindowMs,
    }));
    config.audioSamples = [
      {
        id: "sample-1",
        filePath: firstWavPath,
        relativePath: "first.wav",
        displayName: "first.wav",
        expectedText: "first sample transcript",
        language: "en",
        durationMs: 40,
        tags: [],
        enabled: true,
      },
      {
        id: "sample-2",
        filePath: secondWavPath,
        relativePath: "second.wav",
        displayName: "second.wav",
        expectedText: "second sample transcript",
        language: "en",
        durationMs: 40,
        tags: [],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;

    let controller!: RunController;
    const activateApp = vi.fn(async () => undefined);
    const closeApp = vi.fn(async () => undefined);
    const helper = {
      activateApp,
      closeApp,
      sendHotkey: async () => undefined,
      playWav: async (_filePath: string) => {
        setTimeout(() => {
          const nextValue = controller.getProgress().currentSamplePath === "first.wav"
            ? "first sample transcript"
            : "second sample transcript";
          controller.onInputEvent({ type: "input", tsMs: performance.now(), value: nextValue });
        }, 50);
      },
    };

    controller = new RunController(
      store,
      permissions,
      {
        resolve: async (app: { id: string }) => app.id === "xiguashuo" ? "/Applications/西瓜说.app" : undefined,
      } as any,
      helper as any,
      () => undefined,
    );

    const preflight = await controller.run(config);
    expect(preflight.ok).toBe(true);
    expect(store.listRuns()).toHaveLength(2);
    expect(activateApp).toHaveBeenCalledTimes(1);
    expect(closeApp).toHaveBeenCalledTimes(1);
    store.close();
  });

  it("ignores focus and blur events when measuring the first text timing", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-input-filter-"));
    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.databasePath = join(root, "vtc.sqlite");
    config.resultTimeoutMs = 1200;
    config.betweenSamplesDelayMs = 0;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "xiguashuo",
      appFileName: app.id === "xiguashuo" ? "西瓜说" : app.appFileName,
      name: app.id === "xiguashuo" ? "西瓜说" : app.name,
      launchTimeoutMs: app.id === "xiguashuo" ? 20 : app.launchTimeoutMs,
      preHotkeyDelayMs: app.id === "xiguashuo" ? 20 : app.preHotkeyDelayMs,
      hotkeyToAudioDelayMs: app.id === "xiguashuo" ? 20 : app.hotkeyToAudioDelayMs,
      audioToTriggerStopDelayMs: app.id === "xiguashuo" ? 20 : app.audioToTriggerStopDelayMs,
      settleWindowMs: app.id === "xiguashuo" ? 80 : app.settleWindowMs,
    }));
    config.audioSamples = [defaultConfig().audioSamples[0]!];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;

    let controller!: RunController;
    const helper = {
      activateApp: async () => undefined,
      closeApp: async () => undefined,
      sendHotkey: async () => undefined,
      playWav: async () => {
        controller.onInputEvent({ type: "focus", tsMs: performance.now(), value: "" });
        controller.onInputEvent({ type: "blur", tsMs: performance.now(), value: "" });
        setTimeout(() => {
          controller.onInputEvent({ type: "input", tsMs: performance.now(), value: "real app transcript" });
        }, 90);
      },
    };

    controller = new RunController(
      store,
      permissions,
      {
        resolve: async (app: { id: string }) => app.id === "xiguashuo" ? "/Applications/西瓜说.app" : undefined,
      } as any,
      helper as any,
      () => undefined,
    );

    const preflight = await controller.run(config);
    expect(preflight.ok).toBe(true);
    const run = store.listRuns()[0];
    expect(run?.status).toBe("success");
    expect(run?.triggerStopToFirstCharMs).toBeGreaterThanOrEqual(0);
    store.close();
  });

  it("cancels the current self-test run immediately when the user closes the test", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-cancel-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const wavPath = join(sampleRoot, "selftest.wav");
    await writeFile(wavPath, createWav(80));

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.sampleRoot = sampleRoot;
    config.databasePath = join(root, "vtc.sqlite");
    config.resultTimeoutMs = 3000;
    config.betweenSamplesDelayMs = 0;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "selftest",
      settleWindowMs: app.id === "selftest" ? 300 : app.settleWindowMs,
      preHotkeyDelayMs: app.id === "selftest" ? 20 : app.preHotkeyDelayMs,
      hotkeyToAudioDelayMs: app.id === "selftest" ? 20 : app.hotkeyToAudioDelayMs,
      audioToTriggerStopDelayMs: app.id === "selftest" ? 20 : app.audioToTriggerStopDelayMs,
      postRunCooldownMs: app.id === "selftest" ? 0 : app.postRunCooldownMs,
    }));
    config.audioSamples = [
      {
        id: "sample-1",
        filePath: wavPath,
        relativePath: "selftest.wav",
        displayName: "selftest.wav",
        expectedText: "self test transcript",
        language: "en",
        durationMs: 80,
        tags: ["selftest"],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;
    const controller = new RunController(
      store,
      permissions,
      new TargetAppManager(),
      { activateApp: async () => undefined, closeApp: async () => undefined, playWav: async () => undefined, sendHotkey: async () => undefined } as any,
      (chunks) => {
        chunks.forEach((value, index) => {
          setTimeout(() => {
            controller.onInputEvent({ type: "input", tsMs: performance.now(), value });
          }, 30 * (index + 1));
        });
      },
    );

    const startedAt = Date.now();
    const runPromise = controller.run(config);
    await new Promise((resolve) => setTimeout(resolve, 320));
    controller.stop();
    const preflight = await runPromise;
    const elapsedMs = Date.now() - startedAt;

    expect(preflight.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(1500);
    expect(controller.getProgress().phase).toBe("cancelled");
    const runs = store.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("cancelled");
    expect(runs[0]?.failureCategory ?? undefined).toBeUndefined();

    const db = new DatabaseSync(config.databasePath);
    const session = db.prepare("SELECT status FROM run_sessions LIMIT 1").get() as { status: string } | undefined;
    db.close();
    expect(session?.status).toBe("cancelled");
    store.close();
  });

  it("aborts the current real-app sample immediately when the user closes the test", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-cancel-playback-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const wavPath = join(sampleRoot, "external.wav");
    await writeFile(wavPath, createWav(200));

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.databasePath = join(root, "vtc.sqlite");
    config.resultTimeoutMs = 3000;
    config.betweenSamplesDelayMs = 0;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "xiguashuo",
      appFileName: app.id === "xiguashuo" ? "西瓜说" : app.appFileName,
      name: app.id === "xiguashuo" ? "西瓜说" : app.name,
      launchTimeoutMs: app.id === "xiguashuo" ? 20 : app.launchTimeoutMs,
      preHotkeyDelayMs: app.id === "xiguashuo" ? 20 : app.preHotkeyDelayMs,
      hotkeyToAudioDelayMs: app.id === "xiguashuo" ? 20 : app.hotkeyToAudioDelayMs,
      audioToTriggerStopDelayMs: app.id === "xiguashuo" ? 20 : app.audioToTriggerStopDelayMs,
      settleWindowMs: app.id === "xiguashuo" ? 200 : app.settleWindowMs,
      postRunCooldownMs: app.id === "xiguashuo" ? 0 : app.postRunCooldownMs,
    }));
    config.audioSamples = [
      {
        id: "external-sample",
        filePath: wavPath,
        relativePath: "external.wav",
        displayName: "external.wav",
        expectedText: "external sample transcript",
        language: "en",
        durationMs: 200,
        tags: [],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;

    let aborted = false;
    const controller = new RunController(
      store,
      permissions,
      {
        resolve: async (app: { id: string }) => app.id === "xiguashuo" ? "/Applications/西瓜说.app" : undefined,
      } as any,
      {
        activateApp: async () => undefined,
        closeApp: async () => undefined,
        sendHotkey: async () => undefined,
        playWav: async (_filePath: string, _outputDeviceId: string, signal?: AbortSignal) => {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 120);
            signal?.addEventListener("abort", () => {
              clearTimeout(timer);
              aborted = true;
              reject(new Error("Run cancelled"));
            }, { once: true });
          });
        },
      } as any,
      () => undefined,
    );

    const startedAt = Date.now();
    const runPromise = controller.run(config);
    await new Promise((resolve) => setTimeout(resolve, 120));
    controller.stop();
    const preflight = await runPromise;
    const elapsedMs = Date.now() - startedAt;

    expect(preflight.ok).toBe(true);
    expect(aborted).toBe(true);
    expect(elapsedMs).toBeLessThan(1500);
    expect(store.listRuns()[0]?.status).toBe("cancelled");
    const db = new DatabaseSync(config.databasePath);
    const session = db.prepare("SELECT status FROM run_sessions LIMIT 1").get() as { status: string } | undefined;
    db.close();
    expect(session?.status).toBe("cancelled");
    store.close();
  });

  it("waits for the configured gap before moving to the next sample", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-gap-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const firstWavPath = join(sampleRoot, "first.wav");
    const secondWavPath = join(sampleRoot, "second.wav");
    await writeFile(firstWavPath, createWav(40));
    await writeFile(secondWavPath, createWav(40));

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.sampleRoot = sampleRoot;
    config.databasePath = join(root, "vtc.sqlite");
    config.resultTimeoutMs = 1200;
    config.betweenSamplesDelayMs = 300;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "selftest",
      preHotkeyDelayMs: app.id === "selftest" ? 20 : app.preHotkeyDelayMs,
      hotkeyToAudioDelayMs: app.id === "selftest" ? 20 : app.hotkeyToAudioDelayMs,
      audioToTriggerStopDelayMs: app.id === "selftest" ? 20 : app.audioToTriggerStopDelayMs,
      settleWindowMs: app.id === "selftest" ? 80 : app.settleWindowMs,
    }));
    config.audioSamples = [
      {
        id: "sample-1",
        filePath: firstWavPath,
        relativePath: "first.wav",
        displayName: "first.wav",
        expectedText: "first sample",
        language: "en",
        durationMs: 40,
        tags: [],
        enabled: true,
      },
      {
        id: "sample-2",
        filePath: secondWavPath,
        relativePath: "second.wav",
        displayName: "second.wav",
        expectedText: "second sample",
        language: "en",
        durationMs: 40,
        tags: [],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
      activateApp: async () => undefined,
      closeApp: async () => undefined,
      playWav: async () => undefined,
      sendHotkey: async () => undefined,
    } as any);
    const timelineEvents: Array<{ eventType: string; tsMs: number; payloadJson: string }> = [];
    const controller = new RunController(
      store,
      permissions,
      new TargetAppManager(),
      { activateApp: async () => undefined, closeApp: async () => undefined, playWav: async () => undefined, sendHotkey: async () => undefined } as any,
      () => undefined,
    );
    controller.on("timeline", (event) => {
      timelineEvents.push(event as { eventType: string; tsMs: number; payloadJson: string });
    });

    const startedAt = Date.now();
    const preflight = await controller.run(config);
    const elapsedMs = Date.now() - startedAt;

    expect(preflight.ok).toBe(true);
    expect(elapsedMs).toBeGreaterThanOrEqual(300);
    const gapEvent = timelineEvents.find((event) => event.eventType === "between_samples_wait");
    expect(gapEvent).toBeTruthy();
    expect(gapEvent?.payloadJson).toContain("\"delayMs\":300");
    expect(store.listRuns()).toHaveLength(2);
    store.close();
  }, 10000);

  it("treats close during between-samples wait as a normal cancellation", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-cancel-gap-"));
    const sampleRoot = join(root, "samples");
    await mkdir(sampleRoot, { recursive: true });
    const firstWavPath = join(sampleRoot, "first.wav");
    const secondWavPath = join(sampleRoot, "second.wav");
    await writeFile(firstWavPath, createWav(40));
    await writeFile(secondWavPath, createWav(40));

    const config = defaultConfig();
    config.appLaunchDelayMs = 0;
    config.focusInputDelayMs = 0;
    config.closeAppDelayMs = 0;
    config.sampleRoot = sampleRoot;
    config.databasePath = join(root, "vtc.sqlite");
    config.resultTimeoutMs = 1200;
    config.betweenSamplesDelayMs = 600;
    config.targetApps = config.targetApps.map((app) => ({
      ...app,
      enabled: app.id === "selftest",
      preHotkeyDelayMs: app.id === "selftest" ? 20 : app.preHotkeyDelayMs,
      hotkeyToAudioDelayMs: app.id === "selftest" ? 20 : app.hotkeyToAudioDelayMs,
      audioToTriggerStopDelayMs: app.id === "selftest" ? 20 : app.audioToTriggerStopDelayMs,
      settleWindowMs: app.id === "selftest" ? 80 : app.settleWindowMs,
      postRunCooldownMs: app.id === "selftest" ? 0 : app.postRunCooldownMs,
    }));
    config.audioSamples = [
      {
        id: "sample-1",
        filePath: firstWavPath,
        relativePath: "first.wav",
        displayName: "first.wav",
        expectedText: "first sample",
        language: "en",
        durationMs: 40,
        tags: [],
        enabled: true,
      },
      {
        id: "sample-2",
        filePath: secondWavPath,
        relativePath: "second.wav",
        displayName: "second.wav",
        expectedText: "second sample",
        language: "en",
        durationMs: 40,
        tags: [],
        enabled: true,
      },
    ];

    const store = new ResultStore(config.databasePath);
    const permissions = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
    } as any);
    (permissions as any).checkAccessibilityPermission = () => true;

    const controller = new RunController(
      store,
      permissions,
      new TargetAppManager(),
      { activateApp: async () => undefined, closeApp: async () => undefined, playWav: async () => undefined, sendHotkey: async () => undefined } as any,
      (chunks) => {
        chunks.forEach((value, index) => {
          setTimeout(() => {
            controller.onInputEvent({ type: "input", tsMs: performance.now(), value });
          }, 30 * (index + 1));
        });
      },
    );

    const runPromise = controller.run(config);
    await new Promise((resolve) => setTimeout(resolve, 500));
    controller.stop();

    await expect(runPromise).resolves.toMatchObject({ ok: true });
    expect(controller.getProgress().phase).toBe("cancelled");
    const runs = store.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("success");
    store.close();
  });
});
