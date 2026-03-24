import { contextBridge, ipcRenderer } from "electron";
import type { AppConfig, InputObservationEvent, RunStartOptions } from "../shared/types";

const api = {
  getVersion: async () => await ipcRenderer.invoke("app:getVersion"),
  getSettings: async () => await ipcRenderer.invoke("settings:get"),
  saveSettings: async (config: AppConfig) => await ipcRenderer.invoke("settings:save", config),
  pickSampleRoot: async () => await ipcRenderer.invoke("samples:pickRoot"),
  rescanSamples: async (root: string) => await ipcRenderer.invoke("samples:rescan", root),
  pickDatabasePath: async () => await ipcRenderer.invoke("database:pickPath"),
  refreshPermissions: async () => await ipcRenderer.invoke("permissions:refresh"),
  requestAccessibilityPermission: async () => await ipcRenderer.invoke("permissions:requestAccessibility"),
  openPermissionSettings: async (pane: string) => await ipcRenderer.invoke("permissions:openSettings", pane),
  focusBenchmarkWindow: async () => await ipcRenderer.invoke("window:focusBenchmark"),
  startRun: async (options?: RunStartOptions) => await ipcRenderer.invoke("run:start", options),
  emitRunTimelineEvent: async (runId: string, eventType: string, payload: Record<string, unknown>) =>
    await ipcRenderer.invoke("run:emitTimelineEvent", runId, eventType, payload),
  inspectRun: async () => await ipcRenderer.invoke("run:inspect"),
  stopRun: async () => await ipcRenderer.invoke("run:stop"),
  listResults: async () => await ipcRenderer.invoke("results:list"),
  listResultSessions: async () => await ipcRenderer.invoke("results:listSessions"),
  getResultDetail: async (runId: string) => await ipcRenderer.invoke("results:getDetail", runId),
  exportCsv: async (runSessionId?: string) => await ipcRenderer.invoke("results:exportCsv", runSessionId),
  sendInputEvent: (payload: InputObservationEvent) => ipcRenderer.send("run:inputEvent", payload),
  onProgress: (handler: (payload: unknown) => void) => ipcRenderer.on("run:stateChanged", (_event, payload) => handler(payload)),
  onResult: (handler: (payload: unknown) => void) => ipcRenderer.on("run:resultAppended", (_event, payload) => handler(payload)),
  onTimeline: (handler: (payload: unknown) => void) => ipcRenderer.on("run:event", (_event, payload) => handler(payload)),
  onSelfTestText: (handler: (payload: string[]) => void) => ipcRenderer.on("run:selftestText", (_event, payload) => handler(payload)),
};

contextBridge.exposeInMainWorld("vtc", api);

export type DesktopApi = typeof api;
