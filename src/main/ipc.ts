import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppConfig, InputObservationEvent } from "../shared/types";
import { SampleManager } from "./sample-manager";
import { ConfigStore } from "./config-store";
import { ResultStore } from "./result-store";
import { PermissionManager } from "./permission-manager";
import { RunController } from "./run-controller";

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
  ipcMain.handle("settings:get", async () => ({
    ...deps.getConfig(),
    devices: deps.getDevices(),
    permissions: deps.getPermissions(),
  }));

  ipcMain.handle("settings:save", async (_event, config: AppConfig) => {
    deps.setConfig(config);
    deps.configStore.save(config);
    deps.resultStore.syncConfig(config);
    return { ok: true };
  });

  ipcMain.handle("samples:pickRoot", async () => {
    const result = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
    return result.canceled ? undefined : result.filePaths[0];
  });

  ipcMain.handle("samples:rescan", async (_event, root: string) => {
    return await deps.sampleManager.scan(root);
  });

  ipcMain.handle("database:pickPath", async () => {
    const result = await dialog.showSaveDialog(win, {
      defaultPath: join(dirname(deps.getConfig().databasePath), "voice-typing-contest.sqlite"),
      filters: [{ name: "SQLite", extensions: ["sqlite", "db"] }],
    });
    return result.canceled ? undefined : result.filePath;
  });

  ipcMain.handle("permissions:refresh", async () => {
    return await deps.permissionManager.snapshot();
  });

  ipcMain.handle("permissions:requestAccessibility", async () => {
    await deps.permissionManager.requestAccessibilityPermission();
    return await deps.permissionManager.snapshot();
  });

  ipcMain.handle("permissions:openSettings", async (_event, pane: string) => {
    await shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${pane}`);
    return { ok: true };
  });

  ipcMain.handle("window:focusBenchmark", async () => {
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

  ipcMain.handle("run:start", async () => await deps.runController.run(deps.getConfig()));
  ipcMain.handle("run:stop", async () => deps.runController.stop());
  ipcMain.handle("results:list", async () => deps.resultStore.listRuns());
  ipcMain.handle("results:listSessions", async () => deps.resultStore.listSessions());
  ipcMain.handle("results:getDetail", async (_event, runId: string) => deps.resultStore.getRunDetail(runId));
  ipcMain.handle("results:exportCsv", async (_event, runSessionId?: string) => {
    const suffix = runSessionId ? `-${runSessionId.slice(0, 8)}` : "";
    const result = await dialog.showSaveDialog(win, { defaultPath: `voice-typing-contest-results${suffix}.csv` });
    if (result.canceled || !result.filePath) return undefined;
    await writeFile(result.filePath, deps.resultStore.exportCsv(runSessionId), "utf8");
    return result.filePath;
  });
  ipcMain.on("run:inputEvent", (_event, payload: InputObservationEvent) => deps.runController.onInputEvent(payload));
}
