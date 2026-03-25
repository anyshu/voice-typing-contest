import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import type { AudioDevice, HelperPermissionResult, HelperResponse } from "../shared/types";
import { resolveHomePath } from "../shared/paths";

async function runHelper<T>(helperPath: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const useProcessGroup = process.platform !== "win32";
    const child = spawn(helperPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
      detached: useProcessGroup,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const cleanup = (): void => {
      signal?.removeEventListener("abort", handleAbort);
    };

    const finishReject = (error: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const finishResolve = (value: T): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const handleAbort = (): void => {
      if (settled) return;
      if (useProcessGroup && child.pid) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
      } else {
        child.kill("SIGTERM");
      }
      finishReject(new Error("Run cancelled"));
    };

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => finishReject(error));
    child.on("close", (code) => {
      if (settled) return;
      const parsedResponse = (() => {
        try {
          return JSON.parse(stdout) as HelperResponse<T>;
        } catch {
          return undefined;
        }
      })();
      if (code !== 0) {
        finishReject(new Error(parsedResponse?.error || stderr || `Helper exited with code ${code}`));
        return;
      }
      const response = parsedResponse ?? JSON.parse(stdout) as HelperResponse<T>;
      if (!response.ok) {
        finishReject(new Error(response.error || "Helper error"));
        return;
      }
      finishResolve(response.result as T);
    });
    signal?.addEventListener("abort", handleAbort, { once: true });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export class HelperClient {
  constructor(private readonly overridePath?: string) {}

  get helperPath(): string {
    const overridePath = resolveHomePath(this.overridePath ?? "");
    if (overridePath && existsSync(overridePath)) {
      return overridePath;
    }
    if (process.resourcesPath) {
      const packagedPath = join(process.resourcesPath, "native", "helper", ".build", "release", "vtc-helper");
      if (existsSync(packagedPath)) {
        return packagedPath;
      }
    }
    return join(process.cwd(), "native", "helper", ".build", "debug", "vtc-helper");
  }

  get available(): boolean {
    return existsSync(this.helperPath);
  }

  async checkPermissions(signal?: AbortSignal): Promise<HelperPermissionResult> {
    if (!this.available) {
      return {
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted: false },
          { id: "automation", name: "Automation", required: false, granted: false },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: false },
        ],
      };
    }
    return await runHelper<HelperPermissionResult>(this.helperPath, { command: "checkPermissions" }, signal);
  }

  async listAudioDevices(signal?: AbortSignal): Promise<{ devices: AudioDevice[] }> {
    if (!this.available) {
      return { devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }] };
    }
    return await runHelper<{ devices: AudioDevice[] }>(this.helperPath, { command: "listAudioDevices" }, signal);
  }

  async requestAccessibilityPermission(signal?: AbortSignal): Promise<{ granted: boolean }> {
    if (!this.available) {
      return { granted: false };
    }
    return await runHelper<{ granted: boolean }>(this.helperPath, { command: "requestAccessibilityPermission" }, signal);
  }

  async playWav(filePath: string, outputDeviceId: string, signal?: AbortSignal): Promise<void> {
    if (!this.available) return;
    await runHelper(this.helperPath, { command: "playWav", filePath, outputDeviceId }, signal);
  }

  async playWavHoldingHotkey(
    chord: string,
    filePath: string,
    outputDeviceId: string,
    hotkeyToAudioDelayMs: number,
    audioToTriggerStopDelayMs: number,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!this.available) return;
    await runHelper(this.helperPath, {
      command: "playWavHoldingHotkey",
      chord,
      filePath,
      outputDeviceId,
      hotkeyToAudioDelayMs,
      audioToTriggerStopDelayMs,
    }, signal);
  }

  async sendHotkey(chord: string, phase: "down" | "up" | "press", signal?: AbortSignal): Promise<void> {
    if (!this.available) return;
    await runHelper(this.helperPath, { command: "sendHotkey", chord, phase }, signal);
  }

  async activateApp(appFileName: string, signal?: AbortSignal): Promise<void> {
    if (!this.available) return;
    await runHelper(this.helperPath, { command: "activateApp", appFileName }, signal);
  }

  async closeApp(appFileName: string, signal?: AbortSignal): Promise<void> {
    if (!this.available) return;
    await runHelper(this.helperPath, { command: "closeApp", appFileName }, signal);
  }

  async revealSystemSettings(pane: string, signal?: AbortSignal): Promise<void> {
    if (!this.available) return;
    await runHelper(this.helperPath, { command: "revealSystemSettings", pane }, signal);
  }
}
