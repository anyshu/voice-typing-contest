export type Locale = "zh" | "en";
export type Theme = "light" | "dark";
export type HotkeyTriggerMode = "hold_release" | "press_start_press_stop";
export type RunPhase =
  | "idle"
  | "preflight"
  | "focus_input"
  | "wait_before_hotkey"
  | "trigger_start"
  | "wait_before_audio"
  | "audio_playing"
  | "wait_before_trigger_stop"
  | "trigger_stop"
  | "observing_text"
  | "between_samples_wait"
  | "completed"
  | "failed"
  | "cancelled";
export type FailureCategory =
  | "permission_denied_accessibility"
  | "permission_denied_automation"
  | "target_app_not_installed"
  | "target_app_not_ready"
  | "target_app_launch_timeout"
  | "input_focus_failed"
  | "device_not_found"
  | "audio_play_failed"
  | "hotkey_dispatch_failed"
  | "no_text_observed"
  | "timeout_waiting_result"
  | "empty_result";
export type ResultStatus = "success" | "failed" | "cancelled";

export interface PermissionSnapshot {
  id: "accessibility" | "automation" | "input-monitoring";
  name: string;
  required: boolean;
  granted: boolean;
}

export interface AudioDevice {
  id: string;
  name: string;
  available: boolean;
  isDefault?: boolean;
}

export interface TargetAppProfile {
  id: string;
  name: string;
  appFileName: string;
  websiteUrl?: string;
  launchCommand?: string;
  hotkeyChord: string;
  hotkeyTriggerMode: HotkeyTriggerMode;
  audioInputDeviceName?: string;
  launchTimeoutMs?: number;
  preHotkeyDelayMs?: number;
  hotkeyToAudioDelayMs: number;
  audioToTriggerStopDelayMs: number;
  resultTimeoutMs?: number;
  settleWindowMs: number;
  postRunCooldownMs?: number;
  enabled: boolean;
  notes: string;
}

export interface InstalledTargetAppInfo {
  profileId: string;
  installed: boolean;
  isBuiltin: boolean;
  appPath?: string;
  version?: string;
  buildVersion?: string;
}

export interface AudioSample {
  id: string;
  filePath: string;
  relativePath: string;
  displayName: string;
  expectedText?: string;
  language: string;
  durationMs: number;
  tags: string[];
  enabled: boolean;
  exists?: boolean;
}

export interface AppConfig {
  locale: Locale;
  theme: Theme;
  workspaceLabel: string;
  sampleRoot: string;
  databasePath: string;
  logFolder: string;
  helperPathOverride: string;
  selectedOutputDeviceId: string;
  appLaunchDelayMs: number;
  focusInputDelayMs: number;
  resultTimeoutMs: number;
  resourceSampleIntervalMs: number;
  betweenSamplesDelayMs: number;
  closeAppDelayMs: number;
  runNotes: string;
  targetApps: TargetAppProfile[];
  audioSamples: AudioSample[];
}

export interface PreflightItem {
  key: string;
  ok: boolean;
  message: string;
  category?: FailureCategory;
  hint?: string;
}

export interface PreflightReport {
  ok: boolean;
  items: PreflightItem[];
  permissions: PermissionSnapshot[];
  devices: AudioDevice[];
}

export interface RunStartOptions {
  appIds?: string[];
  sampleIds?: string[];
  retryRootRunId?: string;
}

export interface RunSessionRecord {
  id: string;
  startedAt: string;
  finishedAt?: string;
  selectedAppIds: string[];
  selectedSampleIds: string[];
  permissionSnapshot: PermissionSnapshot[];
  deviceSnapshot: AudioDevice[];
  configSnapshot: AppConfig;
  status: RunPhase;
}

export interface RunSessionSummary {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: RunPhase;
  runCount: number;
  successCount: number;
  failedCount: number;
  cancelledCount: number;
}

export interface TestRunRecord {
  id: string;
  runSessionId: string;
  appId: string;
  appName: string;
  appVersion?: string;
  sampleId: string;
  samplePath: string;
  status: ResultStatus;
  phase: RunPhase;
  failureCategory?: FailureCategory;
  failureReason?: string;
  rawText: string;
  normalizedText: string;
  expectedText?: string;
  hotkeyToAudioMs?: number;
  triggerStopToFirstCharMs?: number;
  triggerStopToFinalTextMs?: number;
  totalRunMs?: number;
  averageCpuPercent?: number;
  peakCpuPercent?: number;
  averageMemoryMb?: number;
  peakMemoryMb?: number;
  inputEventCount: number;
  finalTextLength: number;
  createdAt: string;
  retryRootRunId?: string;
  retryAttempt?: number;
  retryCount?: number;
  timeline: RunEventRecord[];
}

export interface ResourceSampleRecord {
  id: string;
  runId: string;
  sampleIndex: number;
  sampledAt: string;
  mainPid: number;
  processCount: number;
  mainCpuPercent: number;
  totalCpuPercent: number;
  mainMemoryMb: number;
  totalMemoryMb: number;
  intervalMs: number;
}

export interface RunEventRecord {
  id: string;
  runId: string;
  eventType: string;
  tsMs: number;
  payloadJson: string;
}

export interface TimelineItem {
  id: string;
  type: string;
  tsMs: number;
  detail: string;
}

export interface RunProgress {
  sessionId?: string;
  runId?: string;
  phase: RunPhase;
  currentAppName?: string;
  currentSamplePath?: string;
  textValue: string;
  message: string;
  failureCategory?: FailureCategory;
  failureReason?: string;
  completedRuns: number;
  totalRuns: number;
}

export interface InputObservationEvent {
  type: string;
  tsMs: number;
  value: string;
}

export interface ResultDetail {
  record: TestRunRecord;
  events: RunEventRecord[];
}

export interface CsvImportSummary {
  sessionId: string;
  importedCount: number;
  appCount: number;
  startedAt: string;
  finishedAt: string;
  sourcePath: string;
}

export interface SettingsPayload extends AppConfig {
  permissions: PermissionSnapshot[];
  devices: AudioDevice[];
}

export interface HelperPermissionResult {
  permissions: PermissionSnapshot[];
}

export interface HelperResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
}
