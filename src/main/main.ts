import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigStore } from "./config-store";
import { ResultStore } from "./result-store";
import { SampleManager } from "./sample-manager";
import { HelperClient } from "./helper-client";
import { PermissionManager } from "./permission-manager";
import { TargetAppManager } from "./target-app-manager";
import { RunController } from "./run-controller";
import { registerIpc } from "./ipc";
import type { AppConfig, AudioDevice, PermissionSnapshot } from "../shared/types";
import { defaultDevices, defaultPermissions } from "../shared/defaults";

let win: BrowserWindow | undefined;
let tray: Tray | undefined;
let config: AppConfig;
let devices: AudioDevice[] = defaultDevices();
let permissions: PermissionSnapshot[] = defaultPermissions();
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const appIconPath = fileURLToPath(new URL("../../cb4a0819-0b67-4a69-94c8-53f37e73c304.png", import.meta.url));

function loadAppIcon() {
  const icon = nativeImage.createFromPath(appIconPath);
  return icon.isEmpty() ? undefined : icon;
}

function installMacBranding(): void {
  const icon = loadAppIcon();
  if (!icon) return;

  if (process.platform === "darwin") {
    app.dock?.setIcon(icon);
    if (!tray) {
      const trayIcon = icon.resize({ width: 18, height: 18 });
      tray = new Tray(trayIcon);
      tray.setToolTip("Voice Typing Contest");
      tray.setContextMenu(Menu.buildFromTemplate([
        {
          label: "显示主窗口",
          click: () => {
            if (!win) return;
            win.show();
            win.focus();
          },
        },
        {
          label: "退出",
          click: () => app.quit(),
        },
      ]));
      tray.on("click", () => {
        if (!win) return;
        win.show();
        win.focus();
      });
    }
  }
}

function normalizeSelectedOutputDevice(current: string, availableDevices: AudioDevice[]): string {
  if (availableDevices.some((item) => item.id === current)) {
    return current;
  }
  const matchedByName = availableDevices.find((item) => item.name === current);
  if (matchedByName) {
    return matchedByName.id;
  }
  const defaultDevice = availableDevices.find((item) => item.isDefault) ?? availableDevices.find((item) => item.id === "system-default");
  return defaultDevice?.id ?? "system-default";
}

if (process.env.VTC_SMOKE_USER_DATA_DIR) {
  app.setPath("userData", process.env.VTC_SMOKE_USER_DATA_DIR);
}

function installSmokeHooks(win: BrowserWindow, runController: RunController): void {
  if (process.env.VTC_SMOKE_EXIT_ON_RESULT === "1") {
    let quitting = false;
    const quitSoon = (reason: string, payload: unknown): void => {
      if (quitting) return;
      quitting = true;
      console.log(`[smoke] ${reason}: ${JSON.stringify(payload)}`);
      setTimeout(() => {
        app.quit();
      }, 250);
    };

    runController.on("result", (payload) => quitSoon("result", payload));
    runController.on("progress", (payload) => {
      const progress = payload as { phase?: string };
      if (progress.phase === "failed" || progress.phase === "cancelled") {
        quitSoon("progress", payload);
      }
    });
  }

  if (process.env.VTC_SMOKE_CLICK_RUN === "1") {
    win.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        void win.webContents.executeJavaScript(
          `(async () => {
            const debugSnapshot = () => ({
              readyState: document.readyState,
              bodyText: document.body?.innerText?.slice(0, 240) ?? "",
              bodyHtml: document.body?.innerHTML?.slice(0, 240) ?? "",
              hasVtc: Boolean(window.vtc),
            });

            const waitFor = async (predicate, label, timeoutMs = 5000) => {
              const started = Date.now();
              while (Date.now() - started < timeoutMs) {
                const value = predicate();
                if (value) {
                  return value;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
              throw new Error(\`smoke wait timeout: \${label} :: \${JSON.stringify(debugSnapshot())}\`);
            };

            await waitFor(() => window.vtc && typeof window.vtc.startRun === "function", "window.vtc.startRun");
            const button = await waitFor(() => document.querySelector("button.primary-button"), "button.primary-button");
            const noticeBefore = document.querySelector(".notice-bar")?.textContent ?? "";
            const before = {
              text: button.textContent ?? "",
              disabled: button.disabled,
              notice: noticeBefore,
            };
            button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }));
            button.click();
            await new Promise((resolve) => setTimeout(resolve, 1200));
            return {
              before,
              after: {
                disabled: button.disabled,
                notice: document.querySelector(".notice-bar")?.textContent ?? "",
                phase: document.querySelector(".metric strong")?.textContent ?? "",
              },
            };
          })();`,
          true,
        ).then((result) => {
          console.log(`[smoke] click result: ${JSON.stringify(result)}`);
        }).catch((error) => {
          console.error("[smoke] click failed", error);
          if (process.env.VTC_SMOKE_EXIT_ON_RESULT === "1") {
            app.quit();
          }
        });
      }, 350);
    });
  }
}

async function createWindow(): Promise<void> {
  const helper = new HelperClient();
  const configStore = new ConfigStore(join(app.getPath("userData"), "config.json"));
  config = configStore.load();
  if (process.env.VTC_SMOKE_DATABASE_PATH) {
    config.databasePath = process.env.VTC_SMOKE_DATABASE_PATH;
  }
  const resultStore = new ResultStore(config.databasePath);
  const sampleManager = new SampleManager();
  if (!config.audioSamples.length) {
    try {
      config.audioSamples = await sampleManager.scan(config.sampleRoot);
      configStore.save(config);
    } catch {
      config.audioSamples = [];
    }
  }
  resultStore.syncConfig(config);
  const permissionManager = new PermissionManager(helper);
  const targetAppManager = new TargetAppManager();

  win = new BrowserWindow({
    width: 1480,
    height: 980,
    icon: loadAppIcon(),
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const runController = new RunController(
    resultStore,
    permissionManager,
    targetAppManager,
    helper,
    (chunks) => {
      win?.webContents.send("run:selftestText", chunks);
    },
  );

  runController.on("progress", (payload) => win?.webContents.send("run:stateChanged", payload));
  runController.on("timeline", (payload) => win?.webContents.send("run:event", payload));
  runController.on("result", (payload) => win?.webContents.send("run:resultAppended", payload));
  installSmokeHooks(win, runController);

  const snapshot = await permissionManager.snapshot();
  devices = snapshot.devices;
  permissions = snapshot.permissions;
  const normalizedOutputDeviceId = normalizeSelectedOutputDevice(config.selectedOutputDeviceId, devices);
  if (normalizedOutputDeviceId !== config.selectedOutputDeviceId) {
    config.selectedOutputDeviceId = normalizedOutputDeviceId;
    configStore.save(config);
    resultStore.syncConfig(config);
  }

  registerIpc(win, {
    configStore,
    sampleManager,
    resultStore,
    permissionManager,
    runController,
    getConfig: () => config,
    setConfig: (next) => {
      config = next;
      if (!config.audioSamples.length) {
        void sampleManager.scan(config.sampleRoot).then((samples) => {
          config.audioSamples = samples;
          configStore.save(config);
          resultStore.syncConfig(config);
        }).catch(() => undefined);
      }
    },
    getDevices: () => devices,
    getPermissions: () => permissions,
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  app.setName("Voice Typing Contest");
  installMacBranding();
  await createWindow();
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app:getVersion", () => app.getVersion());
