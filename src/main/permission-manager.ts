import { systemPreferences } from "electron";
import type { AudioDevice, FailureCategory, PermissionSnapshot, PreflightItem, PreflightReport } from "../shared/types";
import { defaultDevices, defaultPermissions } from "../shared/defaults";
import { HelperClient } from "./helper-client";

export class PermissionManager {
  constructor(private readonly helper: HelperClient) {}

  async snapshot(): Promise<{ permissions: PermissionSnapshot[]; devices: AudioDevice[] }> {
    const helperPermissions = this.helper.available ? (await this.helper.checkPermissions()).permissions : defaultPermissions();
    const accessibilityGranted = this.checkAccessibilityPermission();
    const permissions = helperPermissions.map((item) => (item.id === "accessibility"
      ? { ...item, granted: accessibilityGranted }
      : item));
    const devices = this.helper.available ? (await this.helper.listAudioDevices()).devices : defaultDevices();
    if (!devices.some((item) => item.id === "system-default")) {
      devices.unshift({
        id: "system-default",
        name: "System Default",
        available: true,
        isDefault: !devices.some((item) => item.isDefault),
      });
    }
    return { permissions, devices };
  }

  async requestAccessibilityPermission(): Promise<boolean> {
    try {
      systemPreferences.isTrustedAccessibilityClient(true);
      return this.checkAccessibilityPermission();
    } catch {
      try {
        const result = await this.helper.requestAccessibilityPermission();
        return result.granted;
      } catch {
        return false;
      }
    }
  }

  private checkAccessibilityPermission(): boolean {
    try {
      return systemPreferences.isTrustedAccessibilityClient(false);
    } catch {
      return false;
    }
  }

  async buildPreflight(checks: {
    hasSamples: boolean;
    hasEnabledApps: boolean;
    hasRunnableApps: boolean;
    dbReady: boolean;
    selectedDeviceId: string;
    requiresAccessibility: boolean;
    appChecks: Array<{ key: string; ok: boolean; message: string; category?: FailureCategory; hint?: string }>;
  }): Promise<PreflightReport> {
    const { permissions, devices } = await this.snapshot();
    const accessibility = permissions.find((item) => item.id === "accessibility")?.granted ?? false;
    const selectedDevice = devices.find((item) => item.id === checks.selectedDeviceId);
    const items: PreflightItem[] = [
      {
        key: "accessibility",
        ok: checks.requiresAccessibility ? accessibility : true,
        message: checks.requiresAccessibility
          ? (accessibility ? "辅助功能权限已授权" : "缺少辅助功能权限")
          : "当前只运行内建自测，不要求辅助功能权限",
        category: checks.requiresAccessibility && !accessibility ? ("permission_denied_accessibility" satisfies FailureCategory) : undefined,
        hint: checks.requiresAccessibility && !accessibility ? "先到系统设置里给这个应用打开辅助功能权限，再回来点开始。" : undefined,
      },
      {
        key: "device",
        ok: Boolean(selectedDevice?.available),
        message: selectedDevice?.available ? `输出设备可用：${selectedDevice.name}` : "当前选择的输出设备不可用",
        category: selectedDevice?.available ? undefined : ("device_not_found" satisfies FailureCategory),
        hint: selectedDevice?.available ? undefined : "换一个可用设备，或者先确认虚拟音频设备已经安装并在线。",
      },
      {
        key: "samples",
        ok: checks.hasSamples,
        message: checks.hasSamples ? "样本已准备好" : "当前没有启用的样本",
        hint: checks.hasSamples ? undefined : "先用内建自测样本，或者在设置页选择一个包含 WAV / MP3 / OGG 的目录后重新扫描。",
      },
      {
        key: "apps",
        ok: checks.hasRunnableApps,
        message: !checks.hasEnabledApps
          ? "当前没有启用的目标App"
          : checks.hasRunnableApps
            ? "目标App列表已选择"
            : "已经启用了目标App，但当前没有一个能真正跑起来",
        category: checks.hasRunnableApps ? undefined : ("target_app_not_ready" satisfies FailureCategory),
        hint: !checks.hasEnabledApps
          ? "至少启用一个目标App。想先验证流程的话，直接启用“内建自测”。"
          : checks.hasRunnableApps
            ? undefined
            : "先看下面每个应用自己的提示。只要有一个应用能跑，这里就不会拦你。",
      },
      {
        key: "database",
        ok: checks.dbReady,
        message: checks.dbReady ? "数据库路径可写" : "数据库路径当前不可写",
        hint: checks.dbReady ? undefined : "换一个你有写权限的路径，或者检查当前目录是否存在。",
      },
      ...checks.appChecks,
    ];
    return { ok: items.every((item) => item.ok), items, permissions, devices };
  }
}
