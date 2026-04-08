import { contextBridge, ipcRenderer } from "electron";
import type { AppConfig, AudioSample, InputObservationEvent, RunStartOptions, TargetAppProfile } from "../shared/types";

const api = {
  getVersion: async () => await ipcRenderer.invoke("app:getVersion"),
  getSettings: async () => await ipcRenderer.invoke("settings:get"),
  saveSettings: async (config: AppConfig) => await ipcRenderer.invoke("settings:save", config),
  pickSampleRoot: async () => await ipcRenderer.invoke("samples:pickRoot"),
  pickSampleJsonl: async () => await ipcRenderer.invoke("samples:pickJsonl"),
  rescanSamples: async (config: Pick<AppConfig, "sampleSourceType" | "sampleRoot" | "sampleJsonlPath">) =>
    await ipcRenderer.invoke("samples:rescan", config),
  getSamplePreviewData: async (sample: AudioSample) => await ipcRenderer.invoke("samples:getPreviewData", sample),
  pickDatabasePath: async () => await ipcRenderer.invoke("database:pickPath"),
  refreshPermissions: async () => await ipcRenderer.invoke("permissions:refresh"),
  requestAccessibilityPermission: async () => await ipcRenderer.invoke("permissions:requestAccessibility"),
  openPermissionSettings: async (pane: string) => await ipcRenderer.invoke("permissions:openSettings", pane),
  openExternalUrl: async (url: string) => await ipcRenderer.invoke("app:openExternalUrl", url),
  getInstalledAppInfo: async (profiles: TargetAppProfile[]) => await ipcRenderer.invoke("apps:getInstalledInfo", profiles),
  focusBenchmarkWindow: async () => await ipcRenderer.invoke("window:focusBenchmark"),
  startRun: async (options?: RunStartOptions) => await ipcRenderer.invoke("run:start", options),
  emitRunTimelineEvent: async (runId: string, eventType: string, payload: Record<string, unknown>) =>
    await ipcRenderer.invoke("run:emitTimelineEvent", runId, eventType, payload),
  inspectRun: async () => await ipcRenderer.invoke("run:inspect"),
  stopRun: async () => await ipcRenderer.invoke("run:stop"),
  listResults: async () => await ipcRenderer.invoke("results:list"),
  listResultSessions: async () => await ipcRenderer.invoke("results:listSessions"),
  getResultDetail: async (runId: string) => await ipcRenderer.invoke("results:getDetail", runId),
  exportBundle: async (runSessionId?: string, appName?: string) => await ipcRenderer.invoke("results:exportBundle", runSessionId, appName),
  pickImportCsv: async () => await ipcRenderer.invoke("results:pickImportCsv"),
  importCsv: async (filePath: string) => await ipcRenderer.invoke("results:importCsv", filePath),
  importCsvContent: async (csvText: string, sourceName: string) => await ipcRenderer.invoke("results:importCsvContent", csvText, sourceName),
  sendInputEvent: (payload: InputObservationEvent) => ipcRenderer.send("run:inputEvent", payload),
  onProgress: (handler: (payload: unknown) => void) => ipcRenderer.on("run:stateChanged", (_event, payload) => handler(payload)),
  onResult: (handler: (payload: unknown) => void) => ipcRenderer.on("run:resultAppended", (_event, payload) => handler(payload)),
  onTimeline: (handler: (payload: unknown) => void) => ipcRenderer.on("run:event", (_event, payload) => handler(payload)),
  onSelfTestText: (handler: (payload: string[]) => void) => ipcRenderer.on("run:selftestText", (_event, payload) => handler(payload)),
};

contextBridge.exposeInMainWorld("vtc", api);

export type DesktopApi = typeof api;
