import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TargetAppManager } from "../src/main/target-app-manager";
import type { TargetAppProfile } from "../src/shared/types";

let root = "";

async function createMacApp(rootDir: string, name: string, version: string, buildVersion: string): Promise<string> {
  const appPath = join(rootDir, name);
  const contentsPath = join(appPath, "Contents");
  await mkdir(contentsPath, { recursive: true });
  await writeFile(join(contentsPath, "Info.plist"), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleShortVersionString</key>
  <string>${version}</string>
  <key>CFBundleVersion</key>
  <string>${buildVersion}</string>
</dict>
</plist>`);
  return appPath;
}

function createProfile(appFileName: string): TargetAppProfile {
  return {
    id: "demo",
    name: "Demo App",
    appFileName,
    hotkeyChord: "Cmd+Shift+1",
    hotkeyTriggerMode: "hold_release",
    hotkeyToAudioDelayMs: 120,
    audioToTriggerStopDelayMs: 160,
    settleWindowMs: 600,
    enabled: true,
    notes: "",
  };
}

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
    root = "";
  }
});

describe("TargetAppManager", () => {
  it("reads version info from an installed app plist", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-target-app-"));
    await createMacApp(root, "Demo App.app", "1.2.3", "456");

    const manager = new TargetAppManager([root]);
    const info = await manager.inspect(createProfile("Demo App.app"));

    expect(info.installed).toBe(true);
    expect(info.appPath).toBe(join(root, "Demo App.app"));
    expect(info.version).toBe("1.2.3");
    expect(info.buildVersion).toBe("456");
  });

  it("reports missing apps without version info", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-target-app-missing-"));
    const manager = new TargetAppManager([root]);

    const info = await manager.inspect(createProfile("Missing.app"));

    expect(info.installed).toBe(false);
    expect(info.version).toBeUndefined();
    expect(info.buildVersion).toBeUndefined();
  });
});
