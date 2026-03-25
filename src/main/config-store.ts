import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { defaultConfig } from "../shared/defaults";
import type { AppConfig } from "../shared/types";
import { resolveHomePath } from "../shared/paths";

const legacyWisprFlowPreset = {
  hotkeyChord: "Option+Space",
  hotkeyTriggerMode: "press_start_press_stop" as const,
};

export class ConfigStore {
  constructor(private readonly filePath: string) {}

  load(): AppConfig {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = { ...defaultConfig(), ...JSON.parse(raw) } as AppConfig;
      return this.normalize(parsed);
    } catch {
      return this.normalize(defaultConfig());
    }
  }

  save(config: AppConfig): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(config, null, 2), "utf8");
  }

  private normalize(config: AppConfig): AppConfig {
    const defaults = defaultConfig();
    const legacyResultTimeoutMs = config.targetApps.find((app) => typeof app.resultTimeoutMs === "number")?.resultTimeoutMs;
    const legacyAppLaunchDelayMs = config.targetApps.find((app) => typeof app.launchTimeoutMs === "number")?.launchTimeoutMs;
    const legacyFocusInputDelayMs = config.targetApps.find((app) => typeof app.preHotkeyDelayMs === "number")?.preHotkeyDelayMs;
    const legacyCloseAppDelayMs = config.targetApps.find((app) => typeof app.postRunCooldownMs === "number")?.postRunCooldownMs;
    const appMap = new Map(config.targetApps.map((app) => [app.id, app]));
    const defaultAppIds = new Set(defaults.targetApps.map((app) => app.id));
    const wisprFlow = appMap.get("wispr-flow");
    const wisprDefault = defaults.targetApps.find((app) => app.id === "wispr-flow");
    if (
      wisprFlow
      && wisprDefault
      && wisprFlow.hotkeyChord === legacyWisprFlowPreset.hotkeyChord
      && wisprFlow.hotkeyTriggerMode === legacyWisprFlowPreset.hotkeyTriggerMode
    ) {
      appMap.set("wispr-flow", {
        ...wisprFlow,
        hotkeyChord: wisprDefault.hotkeyChord,
        hotkeyTriggerMode: wisprDefault.hotkeyTriggerMode,
      });
    }
    const targetApps = [
      ...defaults.targetApps.map((app) => ({
        ...app,
        ...appMap.get(app.id),
      })),
      ...config.targetApps.filter((app) => !defaultAppIds.has(app.id)),
    ];
    const audioSamples = config.audioSamples.length ? config.audioSamples : defaults.audioSamples;
    if (!targetApps.some((app) => app.enabled)) {
      const selftest = targetApps.find((app) => app.id === "selftest");
      if (selftest) {
        selftest.enabled = true;
      }
    }
    return {
      ...config,
      appLaunchDelayMs: config.appLaunchDelayMs ?? legacyAppLaunchDelayMs ?? defaults.appLaunchDelayMs,
      focusInputDelayMs: config.focusInputDelayMs ?? legacyFocusInputDelayMs ?? defaults.focusInputDelayMs,
      resultTimeoutMs: config.resultTimeoutMs ?? legacyResultTimeoutMs ?? defaults.resultTimeoutMs,
      betweenSamplesDelayMs: config.betweenSamplesDelayMs ?? defaults.betweenSamplesDelayMs,
      closeAppDelayMs: config.closeAppDelayMs ?? legacyCloseAppDelayMs ?? defaults.closeAppDelayMs,
      targetApps,
      audioSamples,
      sampleRoot: resolveHomePath(config.sampleRoot),
      databasePath: resolveHomePath(config.databasePath),
      logFolder: resolveHomePath(config.logFolder),
      helperPathOverride: resolveHomePath(config.helperPathOverride),
    };
  }
}
