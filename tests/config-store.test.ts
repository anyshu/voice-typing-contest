import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigStore } from "../src/main/config-store";

let root = "";

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
    root = "";
  }
});

describe("ConfigStore", () => {
  it("adds newly introduced builtin app presets to existing config files", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-config-store-"));
    const configPath = join(root, "config.json");
    await writeFile(configPath, JSON.stringify({
      locale: "zh",
      theme: "light",
      workspaceLabel: "Contest Lab",
      sampleRoot: "",
      databasePath: "~/Library/Application Support/vtc/voice-typing-contest.sqlite",
      logFolder: "~/Library/Logs/vtc",
      helperPathOverride: "",
      selectedOutputDeviceId: "system-default",
      appLaunchDelayMs: 5000,
      focusInputDelayMs: 2000,
      resultTimeoutMs: 5000,
      betweenSamplesDelayMs: 3000,
      closeAppDelayMs: 3000,
      runNotes: "test",
      targetApps: [
        {
          id: "xiguashuo",
          name: "Xiguashuo",
          appFileName: "Xiguashuo.app",
          hotkeyChord: "Cmd+Shift+1",
          hotkeyTriggerMode: "hold_release",
          hotkeyToAudioDelayMs: 120,
          audioToTriggerStopDelayMs: 160,
          settleWindowMs: 600,
          enabled: true,
          notes: "keep me",
        },
        {
          id: "wispr-flow",
          name: "Wispr Flow",
          appFileName: "Wispr Flow.app",
          hotkeyChord: "Fn",
          hotkeyTriggerMode: "hold_release",
          hotkeyToAudioDelayMs: 120,
          audioToTriggerStopDelayMs: 160,
          settleWindowMs: 600,
          enabled: false,
          notes: "",
        },
        {
          id: "typeless",
          name: "Typeless",
          appFileName: "Typeless.app",
          hotkeyChord: "Fn",
          hotkeyTriggerMode: "hold_release",
          hotkeyToAudioDelayMs: 120,
          audioToTriggerStopDelayMs: 160,
          settleWindowMs: 600,
          enabled: false,
          notes: "",
        },
        {
          id: "selftest",
          name: "内建自测",
          appFileName: "VTC SelfTest",
          launchCommand: "selftest://echo",
          hotkeyChord: "Cmd+Shift+9",
          hotkeyTriggerMode: "hold_release",
          hotkeyToAudioDelayMs: 50,
          audioToTriggerStopDelayMs: 80,
          settleWindowMs: 300,
          enabled: false,
          notes: "",
        },
      ],
      audioSamples: [],
    }, null, 2));

    const store = new ConfigStore(configPath);
    const config = store.load();

    expect(config.targetApps.map((app) => app.id)).toEqual([
      "xiguashuo",
      "shandianshuo",
      "wispr-flow",
      "typeless",
      "selftest",
    ]);
    expect(config.targetApps.find((app) => app.id === "shandianshuo")).toMatchObject({
      name: "闪电说",
      appFileName: "闪电说.app",
      hotkeyChord: "Cmd+Shift+2",
      hotkeyTriggerMode: "hold_release",
      enabled: false,
    });
    expect(config.targetApps.find((app) => app.id === "xiguashuo")?.notes).toBe("keep me");
  });
});
