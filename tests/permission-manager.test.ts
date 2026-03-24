import { describe, expect, it } from "vitest";
import { PermissionManager } from "../src/main/permission-manager";

describe("PermissionManager", () => {
  it("blocks when accessibility is missing", async () => {
    const manager = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: false },
          { id: "automation", name: "Automation", required: false, granted: false },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: false },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }],
      }),
    } as any);
    const report = await manager.buildPreflight({
      hasSamples: true,
      hasEnabledApps: true,
      hasRunnableApps: true,
      dbReady: true,
      selectedDeviceId: "system-default",
      requiresAccessibility: true,
      appChecks: [],
    });
    expect(report.ok).toBe(false);
    expect(report.items[0]?.category).toBe("permission_denied_accessibility");
  });

  it("injects system-default when helper returns only concrete devices", async () => {
    const manager = new PermissionManager({
      available: true,
      checkPermissions: async () => ({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: true },
          { id: "automation", name: "Automation", required: false, granted: false },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: false },
        ],
      }),
      listAudioDevices: async () => ({
        devices: [{ id: "MacBook Air Speakers", name: "MacBook Air Speakers", available: true, isDefault: true }],
      }),
    } as any);

    const snapshot = await manager.snapshot();
    expect(snapshot.devices[0]?.id).toBe("system-default");
    expect(snapshot.devices.some((item) => item.id === "MacBook Air Speakers")).toBe(true);
  });

  it("distinguishes between no enabled apps and no runnable apps", async () => {
    const manager = new PermissionManager({
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

    const report = await manager.buildPreflight({
      hasSamples: true,
      hasEnabledApps: true,
      hasRunnableApps: false,
      dbReady: true,
      selectedDeviceId: "system-default",
      requiresAccessibility: false,
      appChecks: [],
    });

    const appsItem = report.items.find((item) => item.key === "apps");
    expect(appsItem?.message).toBe("已经启用了目标应用，但当前没有一个能真正跑起来");
  });
});
