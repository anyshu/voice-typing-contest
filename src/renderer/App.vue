<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  Analytics01Icon,
  BookOpen01Icon,
  CheckListIcon,
  DashboardSquare01Icon,
  FolderAudioIcon,
  InformationCircleIcon,
  PlayCircleIcon,
  Settings01Icon,
  Shield01Icon,
  Speaker01Icon,
  StopCircleIcon,
} from "@hugeicons/core-free-icons";
import { defaultConfig } from "../shared/defaults";
import type {
  AppConfig,
  AudioDevice,
  FailureCategory,
  PermissionSnapshot,
  PreflightReport,
  RunSessionSummary,
  RunEventRecord,
  RunPhase,
  RunProgress,
  SettingsPayload,
  TestRunRecord,
} from "../shared/types";

const page = ref<"main" | "checks" | "samples" | "intro" | "about" | "settings">("main");
const config = ref<AppConfig>(defaultConfig());
const permissions = ref<PermissionSnapshot[]>([]);
const devices = ref<AudioDevice[]>([]);
const sessions = ref<RunSessionSummary[]>([]);
const results = ref<TestRunRecord[]>([]);
const expandedSessionIds = ref<string[]>([]);
const progress = ref<RunProgress>({ phase: "idle", textValue: "", message: "空闲", completedRuns: 0, totalRuns: 0 });
const preflightReport = ref<PreflightReport | null>(null);
const timeline = ref<RunEventRecord[]>([]);
const timelineList = ref<HTMLUListElement | null>(null);
const liveInput = ref("");
const liveTextarea = ref<HTMLTextAreaElement | null>(null);
const notice = ref("默认启用的是“内建自测”，先用它确认流程通了，再去接真实目标应用。");
const capturingAppId = ref<string | null>(null);
const capturePreview = ref("");
const completedSessionId = ref<string | null>(null);
const completionDialogVisible = ref(false);

const phaseLabels: Record<RunPhase, string> = {
  idle: "空闲",
  preflight: "运行前检查",
  focus_input: "聚焦输入框",
  wait_before_hotkey: "等待开始热键",
  trigger_start: "发送开始热键",
  wait_before_audio: "等待音频启动",
  audio_playing: "播放音频",
  wait_before_trigger_stop: "等待结束热键",
  trigger_stop: "发送结束热键",
  observing_text: "观察输入",
  completed: "完成",
  failed: "失败",
  cancelled: "已取消",
};

const failureLabels: Record<FailureCategory, string> = {
  permission_denied_accessibility: "缺少辅助功能权限",
  permission_denied_automation: "缺少自动化权限",
  target_app_not_installed: "目标应用未安装",
  target_app_not_ready: "目标应用不可运行",
  target_app_launch_timeout: "目标应用启动超时",
  input_focus_failed: "输入框聚焦失败",
  device_not_found: "输出设备不可用",
  audio_play_failed: "音频播放失败",
  hotkey_dispatch_failed: "发送快捷键失败",
  no_text_observed: "没有观察到任何输入",
  timeout_waiting_result: "等待结果超时",
  empty_result: "结果为空",
};

const modeLabels = {
  hold_release: "按住开始，松开结束",
  press_start_press_stop: "按一次开始，再按一次结束",
} as const;

const running = computed(() => !["idle", "completed", "failed", "cancelled"].includes(progress.value.phase));
const enabledApps = computed(() => config.value.targetApps.filter((item) => item.enabled));
const enabledSamples = computed(() => config.value.audioSamples.filter((item) => item.enabled));
const selectedDevice = computed(() => devices.value.find((item) => item.id === config.value.selectedOutputDeviceId));
const accessibility = computed(() => permissions.value.find((item) => item.id === "accessibility"));
const preflightFailures = computed(() => preflightReport.value?.items.filter((item) => !item.ok) ?? []);
const resultSessionGroups = computed(() => sessions.value.map((session) => {
  const runs = results.value.filter((item) => item.runSessionId === session.id);
  const appNames = [...new Set(runs.map((item) => item.appName))];
  return {
    session,
    runs,
    appGroups: appNames.map((appName) => {
      const appRuns = runs.filter((item) => item.appName === appName);
      return {
        appName,
        runs: appRuns,
        successCount: appRuns.filter((item) => item.status === "success").length,
        failedCount: appRuns.filter((item) => item.status === "failed").length,
        cancelledCount: appRuns.filter((item) => item.status === "cancelled").length,
      };
    }),
  };
}));
const pageTitle = computed(() => {
  if (page.value === "main") return "主控台";
  if (page.value === "checks") return "运行前检查";
  if (page.value === "samples") return "样本";
  if (page.value === "settings") return "设置";
  if (page.value === "intro") return "怎么开始";
  return "当前实现";
});
const pageSubtitle = computed(() => {
  if (page.value === "main") return "本地基准测试工具";
  if (page.value === "checks") return "开跑前检查清单";
  if (page.value === "samples") return "测试集与目录视图";
  if (page.value === "settings") return "运行参数与目标应用";
  if (page.value === "intro") return "准备路径与使用说明";
  return "当前实现状态";
});
const activeTimelineRunId = computed(() => timeline.value[timeline.value.length - 1]?.runId ?? "");
const latestTimeline = computed(() => {
  const activeRunId = activeTimelineRunId.value;
  if (!activeRunId) return [];
  return timeline.value.filter((item) => item.runId === activeRunId).slice(-10);
});
const timelineCards = computed(() => {
  const items = latestTimeline.value;
  const firstTs = items[0]?.tsMs ?? 0;
  return items.map((item, index) => ({
    ...item,
    title: timelineTitle(item),
    detail: timelineDetail(item),
    stateClass: running.value && index === items.length - 1 ? "timeline-current" : "timeline-completed",
    offsetLabel: `+${Math.max(0, Math.round(item.tsMs - firstTs))} ms`,
    gapLabel: index === 0 ? "开始" : `间隔 ${Math.max(0, Math.round(item.tsMs - items[index - 1]!.tsMs))} ms`,
  }));
});

function plainConfig(): AppConfig {
  return JSON.parse(JSON.stringify(config.value)) as AppConfig;
}

function phaseText(phase: RunPhase): string {
  return phaseLabels[phase] ?? phase;
}

function failureText(category?: FailureCategory): string {
  return category ? (failureLabels[category] ?? category) : "-";
}

function resultStatusText(status: TestRunRecord["status"]): string {
  if (status === "success") return "成功";
  if (status === "cancelled") return "已取消";
  return "失败";
}

function statusTone(status: string): string {
  if (status === "success" || status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "cancelled") return "warning";
  return "";
}

function appModeText(mode: keyof typeof modeLabels): string {
  return modeLabels[mode];
}

function sampleMeta(language: string, durationMs?: number): string {
  if (!durationMs) return language;
  return `${language} / ${(durationMs / 1000).toFixed(2)} 秒`;
}

function sessionStatusText(status: RunSessionSummary["status"]): string {
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "cancelled") return "已取消";
  if (status === "preflight") return "检查中";
  return phaseText(status);
}

function formatSessionTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatLatencyMs(value?: number): string {
  if (value === undefined) return "-";
  if (value < 0) return `提前 ${Math.abs(value)} ms`;
  return `${value} ms`;
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

const latestSessionGroup = computed(() => resultSessionGroups.value[0]);
const completedSessionGroup = computed(() => resultSessionGroups.value.find((item) => item.session.id === completedSessionId.value));
const latestSessionAppStats = computed(() => (latestSessionGroup.value?.appGroups ?? []).map((group) => {
  const runs = group.runs;
  const firstCharValues = runs
    .map((item) => item.triggerStopToFirstCharMs)
    .filter((value): value is number => value !== undefined);
  const textLengths = runs
    .map((item) => item.finalTextLength)
    .filter((value): value is number => value !== undefined);
  const totalRunValues = runs
    .map((item) => item.totalRunMs)
    .filter((value): value is number => value !== undefined);

  return {
    appName: group.appName,
    summary: `共 ${runs.length} 条 · 成功 ${group.successCount} · 失败 ${group.failedCount}${group.cancelledCount ? ` · 取消 ${group.cancelledCount}` : ""}`,
    stats: [
      { label: "样本总数", value: String(runs.length), tone: "" },
      { label: "成功", value: String(group.successCount), tone: "success" },
      { label: "失败", value: String(group.failedCount), tone: "danger" },
      { label: "平均首字时间", value: formatLatencyMs(average(firstCharValues)), tone: "accent" },
      { label: "平均字数", value: textLengths.length ? String(Math.round(textLengths.reduce((sum, value) => sum + value, 0) / textLengths.length)) : "-", tone: "" },
      { label: "最长首字时间", value: formatLatencyMs(firstCharValues.length ? Math.max(...firstCharValues) : undefined), tone: "accent" },
      { label: "首字时间中位数", value: formatLatencyMs(median(firstCharValues)), tone: "accent" },
      { label: "总共耗时", value: formatLatencyMs(totalRunValues.length ? totalRunValues.reduce((sum, value) => sum + value, 0) : undefined), tone: "" },
    ],
  };
}));

function isTerminalPhase(phase: RunPhase): boolean {
  return phase === "completed" || phase === "failed" || phase === "cancelled";
}

function formatElapsedDuration(startedAt?: string, finishedAt?: string): string {
  if (!startedAt || !finishedAt) return "-";
  const elapsedMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());
  if (elapsedMs < 1000) return `${elapsedMs} ms`;
  if (elapsedMs < 60_000) return `${(elapsedMs / 1000).toFixed(1)} 秒`;
  const minutes = Math.floor(elapsedMs / 60_000);
  const seconds = Math.round((elapsedMs % 60_000) / 1000);
  return `${minutes} 分 ${seconds} 秒`;
}

const completedDialogSummary = computed(() => {
  const group = completedSessionGroup.value;
  if (!group) return null;
  return {
    status: sessionStatusText(group.session.status),
    appCount: group.appGroups.length,
    sampleCount: group.runs.length,
    elapsed: formatElapsedDuration(group.session.startedAt, group.session.finishedAt),
  };
});

function safePayload(item: RunEventRecord): Record<string, unknown> {
  try {
    return JSON.parse(item.payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function tailName(value: unknown): string {
  const text = typeof value === "string" ? value : "";
  if (!text) return "-";
  const normalized = text.replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).pop() ?? text;
}

function timelineTitle(item: RunEventRecord): string {
  const labels: Record<string, string> = {
    focus_input: "聚焦检测框",
    selftest_mode: "进入内建自测",
    app_launch: "后台启动目标应用",
    app_launch_wait: "等待应用启动",
    focus_input_wait: "等待检测框稳定",
    trigger_start: "发送开始热键",
    audio_start: "开始播放样本",
    audio_end: "样本播放完成",
    trigger_stop: "发送结束热键",
    input_observed: "检测到文本输入",
    between_samples_wait: "等待下一条样本",
    app_close_wait: "等待关闭应用",
    app_close: "关闭目标应用",
  };
  return labels[item.eventType] ?? item.eventType;
}

function timelineDetail(item: RunEventRecord): string {
  const payload = safePayload(item);
  switch (item.eventType) {
    case "focus_input":
      return "把焦点拉回实时输入框，后面的文本应该落在这里。";
    case "selftest_mode":
      return `本轮用的是 ${String(payload.app ?? "内建自测")}。`;
    case "app_launch":
      return `${String(payload.app ?? "目标应用")} 已尝试后台启动，目标是 ${tailName(payload.target)}。`;
    case "app_launch_wait":
      return `等待 ${String(payload.delayMs ?? 0)} ms，让 ${String(payload.app ?? "目标应用")} 启动稳定。`;
    case "focus_input_wait":
      return `等待 ${String(payload.delayMs ?? 0)} ms，再开始发送热键。`;
    case "trigger_start":
      return `开始热键：${String(payload.chord ?? "-")}`;
    case "audio_start":
      return `播放样本：${tailName(payload.playableSamplePath ?? payload.sample)}`;
    case "audio_end":
      return "音频已经播完，准备收尾。";
    case "trigger_stop":
      return "结束热键已经发出。";
    case "input_observed":
      return `共观察到 ${String(payload.count ?? 0)} 次输入事件。`;
    case "between_samples_wait":
      return `等待 ${String(payload.delayMs ?? 0)} ms，再切到下一条样本。`;
    case "app_close_wait":
      return `等待 ${String(payload.delayMs ?? 0)} ms，然后关闭 ${String(payload.app ?? "目标应用")}。`;
    case "app_close":
      return `${String(payload.app ?? "目标应用")} 已发送关闭指令。`;
    default:
      return item.payloadJson === "{}" ? "无额外信息" : item.payloadJson;
  }
}

async function loadBootstrap(): Promise<void> {
  const settings = await window.vtc.getSettings() as SettingsPayload;
  config.value = settings;
  permissions.value = settings.permissions;
  devices.value = settings.devices;
  await refreshResultData();
}

async function refreshEnvironment(): Promise<void> {
  const snapshot = await window.vtc.refreshPermissions() as { permissions: PermissionSnapshot[]; devices: AudioDevice[] };
  permissions.value = snapshot.permissions;
  devices.value = snapshot.devices;
}

async function refreshResultData(preferredRunId?: string): Promise<void> {
  const [nextResults, nextSessions] = await Promise.all([
    window.vtc.listResults() as Promise<TestRunRecord[]>,
    window.vtc.listResultSessions() as Promise<RunSessionSummary[]>,
  ]);
  results.value = nextResults;
  sessions.value = nextSessions;

  const validExpandedIds = expandedSessionIds.value.filter((id) => nextSessions.some((item) => item.id === id));
  if (!validExpandedIds.length && nextSessions[0]?.id) {
    validExpandedIds.push(nextSessions[0].id);
  }
  expandedSessionIds.value = validExpandedIds;
}

async function saveSettings(showNotice = true): Promise<void> {
  try {
    await window.vtc.saveSettings(plainConfig());
    await refreshEnvironment();
    if (showNotice) {
      notice.value = "设置已保存。";
    }
  } catch (error) {
    notice.value = `保存设置失败：${error instanceof Error ? error.message : String(error)}`;
    throw error;
  }
}

async function chooseSampleRoot(): Promise<void> {
  const picked = await window.vtc.pickSampleRoot();
  if (!picked) return;
  config.value.sampleRoot = picked;
  await rescanSamples();
}

async function rescanSamples(): Promise<void> {
  if (!config.value.sampleRoot) {
    notice.value = "还没有选外部样本目录。现在仍然可以直接跑内建自测。";
    return;
  }
  config.value.audioSamples = await window.vtc.rescanSamples(config.value.sampleRoot);
  notice.value = `重新扫描完成，共拿到 ${config.value.audioSamples.length} 条样本。`;
}

async function chooseDatabasePath(): Promise<void> {
  const picked = await window.vtc.pickDatabasePath();
  if (!picked) return;
  config.value.databasePath = picked;
}

async function runBatch(): Promise<void> {
  try {
    preflightReport.value = null;
    liveInput.value = "";
    timeline.value = [];
    notice.value = "正在开始运行。";
    await focusLiveTextarea();
    await saveSettings(false);
    const report = await window.vtc.startRun() as PreflightReport;
    preflightReport.value = report;
    await refreshResultData();
    if (!report.ok) {
      notice.value = "这次没跑起来，先看上面的红色提示。";
    } else if (progress.value.phase === "completed") {
      notice.value = "本轮已经跑完。";
    }
  } catch (error) {
    notice.value = `开始运行失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

async function focusLiveTextarea(): Promise<void> {
  const textarea = liveTextarea.value;
  if (document.hasFocus() && textarea && document.activeElement === textarea) {
    return;
  }

  await window.vtc.focusBenchmarkWindow();
  await nextTick();
  const currentTextarea = liveTextarea.value;
  if (!currentTextarea) return;
  currentTextarea.focus({ preventScroll: true });
  const end = currentTextarea.value.length;
  currentTextarea.setSelectionRange(end, end);
}

function scrollTimelineToLatest(): void {
  const list = timelineList.value;
  if (!list) return;
  if (typeof list.scrollTo === "function") {
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    return;
  }
  list.scrollTop = list.scrollHeight;
}

async function stopBatch(): Promise<void> {
  try {
    await window.vtc.stopRun();
    notice.value = "正在关闭本轮。";
  } catch (error) {
    notice.value = `停止失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

function ensureSessionExpanded(sessionId: string): void {
  if (expandedSessionIds.value.includes(sessionId)) return;
  expandedSessionIds.value = [sessionId, ...expandedSessionIds.value];
}

function toggleSession(sessionId: string): void {
  if (expandedSessionIds.value.includes(sessionId)) {
    expandedSessionIds.value = expandedSessionIds.value.filter((item) => item !== sessionId);
    return;
  }
  ensureSessionExpanded(sessionId);
}

function isSessionExpanded(sessionId: string): boolean {
  return expandedSessionIds.value.includes(sessionId);
}

async function exportCsv(runSessionId?: string): Promise<void> {
  try {
    const path = await window.vtc.exportCsv(runSessionId) as string | undefined;
    notice.value = path ? `CSV 已导出到：${path}` : "已取消导出。";
  } catch (error) {
    notice.value = `导出失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

function addApp(): void {
  config.value.targetApps.push({
    id: `app-${Date.now()}`,
    name: "新应用",
    appFileName: "New App.app",
    hotkeyChord: "Cmd + Shift + 1",
    hotkeyTriggerMode: "hold_release",
    hotkeyToAudioDelayMs: 120,
    audioToTriggerStopDelayMs: 160,
    settleWindowMs: 600,
    enabled: false,
    notes: "",
  });
}

function beginHotkeyCapture(appId: string): void {
  capturingAppId.value = appId;
  capturePreview.value = "";
  notice.value = "请直接按组合键。按 Esc 可以取消。";
}

function hotkeyButtonText(appId: string, currentValue: string): string {
  if (capturingAppId.value === appId) {
    return capturePreview.value || "请按组合键";
  }
  return currentValue || "点击录制";
}

function hasFnModifier(event: KeyboardEvent): boolean {
  return event.key === "Fn"
    || event.key === "Globe"
    || event.getModifierState?.("Fn") === true;
}

function isModifierOnly(event: KeyboardEvent): boolean {
  return ["Meta", "Control", "Alt", "Shift", "Fn", "Globe"].includes(event.key);
}

function commitCapturedHotkey(hotkey: string): void {
  const app = config.value.targetApps.find((item) => item.id === capturingAppId.value);
  if (!app) {
    capturingAppId.value = null;
    capturePreview.value = "";
    return;
  }

  app.hotkeyChord = hotkey;
  capturingAppId.value = null;
  capturePreview.value = "";
  notice.value = `已录入 ${app.name} 的快捷键：${hotkey}`;
}

function setHotkeyForApp(appId: string, hotkey: string): void {
  const app = config.value.targetApps.find((item) => item.id === appId);
  if (!app) {
    return;
  }
  app.hotkeyChord = hotkey;
  if (capturingAppId.value === appId) {
    capturingAppId.value = null;
    capturePreview.value = "";
  }
  notice.value = `已录入 ${app.name} 的快捷键：${hotkey}`;
}

function normalizeHotkey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.metaKey) parts.push("Cmd");
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Option");
  if (event.shiftKey) parts.push("Shift");
  if (hasFnModifier(event)) parts.push("Fn");

  const keyMap: Record<string, string> = {
    " ": "Space",
    Escape: "Esc",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
  };

  if (!isModifierOnly(event)) {
    const key = event.key.length === 1 ? event.key.toUpperCase() : (keyMap[event.key] ?? event.key);
    parts.push(key);
  }

  return parts.join(" + ");
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (!capturingAppId.value) return;
  event.preventDefault();
  event.stopPropagation();

  if (event.key === "Escape") {
    capturingAppId.value = null;
    capturePreview.value = "";
    notice.value = "已取消快捷键录制。";
    return;
  }

  const hotkey = normalizeHotkey(event);
  if (!hotkey) {
    return;
  }

  if (isModifierOnly(event)) {
    capturePreview.value = hotkey;
    notice.value = "继续按其他键，或者直接松开完成录制。";
    return;
  }

  if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !hasFnModifier(event)) {
    capturePreview.value = hotkey;
    notice.value = "快捷键至少带一个 Cmd / Ctrl / Option / Shift / Fn 修饰键。";
    return;
  }

  commitCapturedHotkey(hotkey);
}

function handleGlobalKeyup(event: KeyboardEvent): void {
  if (!capturingAppId.value) return;
  if (!isModifierOnly(event)) return;
  event.preventDefault();
  event.stopPropagation();

  const hotkey = capturePreview.value.trim();
  if (!hotkey) return;
  commitCapturedHotkey(hotkey);
}

function openAccessibilitySettings(): void {
  void window.vtc.openPermissionSettings("Privacy_Accessibility");
}

async function requestAccessibilityPermission(): Promise<void> {
  try {
    const snapshot = await window.vtc.requestAccessibilityPermission() as { permissions: PermissionSnapshot[]; devices: AudioDevice[] };
    permissions.value = snapshot.permissions;
    devices.value = snapshot.devices;
    notice.value = "已经发起辅助功能权限请求。系统如果没自动弹窗，你再点旁边的“打开系统设置”。";
  } catch (error) {
    notice.value = `请求辅助功能权限失败：${error instanceof Error ? error.message : String(error)}`;
  }
}

function onLiveInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  liveInput.value = target.value;
  window.vtc.sendInputEvent({
    type: "input",
    tsMs: performance.now(),
    value: target.value,
  });
}

function onBeforeInput(event: InputEvent): void {
  const target = event.target as HTMLTextAreaElement;
  window.vtc.sendInputEvent({
    type: event.type,
    tsMs: performance.now(),
    value: target.value,
  });
}

function onComposition(event: CompositionEvent): void {
  const target = event.target as HTMLTextAreaElement;
  window.vtc.sendInputEvent({
    type: event.type,
    tsMs: performance.now(),
    value: target.value,
  });
}

function onFocusState(event: FocusEvent): void {
  const target = event.target as HTMLTextAreaElement;
  window.vtc.sendInputEvent({
    type: event.type,
    tsMs: performance.now(),
    value: target.value,
  });
}

onMounted(async () => {
  await loadBootstrap();
  window.addEventListener("keydown", handleGlobalKeydown, true);
  window.addEventListener("keyup", handleGlobalKeyup, true);

  window.vtc.onProgress((payload) => {
    progress.value = payload as RunProgress;
    if (progress.value.textValue !== undefined) {
      liveInput.value = progress.value.textValue;
    }
    const shouldReclaimInputFocus = progress.value.phase === "observing_text"
      || (progress.value.phase === "focus_input" && progress.value.message.includes("回到检测框"));
    if (shouldReclaimInputFocus) {
      void focusLiveTextarea();
    }
  });

  window.vtc.onResult((payload) => {
    const record = payload as TestRunRecord;
    void refreshResultData(record.id);
  });

  window.vtc.onTimeline((payload) => {
    timeline.value = [...timeline.value, payload as RunEventRecord];
  });

  window.vtc.onSelfTestText((chunks) => {
    let index = 0;
    const timer = window.setInterval(() => {
      if (index >= chunks.length) {
        window.clearInterval(timer);
        return;
      }
      liveInput.value = chunks[index];
      window.vtc.sendInputEvent({
        type: "input",
        tsMs: performance.now(),
        value: chunks[index],
      });
      index += 1;
    }, 120);
  });
});

watch(() => timeline.value[timeline.value.length - 1]?.id, async (latestId) => {
  if (!latestId) return;
  await nextTick();
  scrollTimelineToLatest();
});

watch(() => progress.value.phase, async (phase, previousPhase) => {
  if (!isTerminalPhase(phase) || !previousPhase || isTerminalPhase(previousPhase) || previousPhase === "idle") {
    return;
  }
  await refreshResultData();
  completedSessionId.value = resultSessionGroups.value[0]?.session.id ?? null;
  completionDialogVisible.value = Boolean(completedSessionId.value);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown, true);
  window.removeEventListener("keyup", handleGlobalKeyup, true);
});
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">VT</div>
        <div class="brand-copy">
          <strong>Voice Typing</strong>
          <span>{{ config.workspaceLabel }}</span>
        </div>
      </div>

      <div class="sidebar-group">
        <div class="sidebar-label">运行</div>
        <ul class="nav-list">
          <li>
            <button class="nav-button" :class="{ active: page === 'main' }" @click="page = 'main'">
              <HugeiconsIcon :icon="DashboardSquare01Icon" :size="18" class="nav-icon" />
              <span>主控台</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'checks' }" @click="page = 'checks'">
              <HugeiconsIcon :icon="CheckListIcon" :size="18" class="nav-icon" />
              <span>运行前检查</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'samples' }" @click="page = 'samples'">
              <HugeiconsIcon :icon="FolderAudioIcon" :size="18" class="nav-icon" />
              <span>样本</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="sidebar-group sidebar-group--secondary">
        <div class="sidebar-label">其他</div>
        <ul class="nav-list">
          <li>
            <button class="nav-button" :class="{ active: page === 'settings' }" @click="page = 'settings'">
              <HugeiconsIcon :icon="Settings01Icon" :size="18" class="nav-icon" />
              <span>设置</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'intro' }" @click="page = 'intro'">
              <HugeiconsIcon :icon="BookOpen01Icon" :size="18" class="nav-icon" />
              <span>怎么开始</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'about' }" @click="page = 'about'">
              <HugeiconsIcon :icon="InformationCircleIcon" :size="18" class="nav-icon" />
              <span>当前实现</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>

    <main class="content">
      <header class="topbar">
        <div>
          <p class="muted">{{ pageSubtitle }}</p>
          <h2>{{ pageTitle }}</h2>
        </div>
        <div v-if="page === 'main'" class="top-actions">
          <button class="primary-button action-button" :disabled="running" @click="runBatch">
            <HugeiconsIcon :icon="PlayCircleIcon" :size="18" class="button-icon" />
            <span>开始运行</span>
          </button>
          <button class="ghost-button action-button" :disabled="!running" @click="stopBatch">
            <HugeiconsIcon :icon="StopCircleIcon" :size="18" class="button-icon" />
            <span>关闭本轮</span>
          </button>
        </div>
      </header>

      <div class="notice-bar">
        <strong>最近消息：</strong>{{ notice }}
      </div>

      <template v-if="page === 'main'">
        <section class="summary-grid">
          <article class="panel summary-card">
            <div class="summary-icon-wrap">
              <HugeiconsIcon :icon="DashboardSquare01Icon" :size="18" class="summary-icon" />
            </div>
            <div class="summary-copy">
              <span class="muted">已启用应用</span>
              <strong>{{ enabledApps.length }}</strong>
            </div>
          </article>
          <article class="panel summary-card">
            <div class="summary-icon-wrap">
              <HugeiconsIcon :icon="FolderAudioIcon" :size="18" class="summary-icon" />
            </div>
            <div class="summary-copy">
              <span class="muted">已启用样本</span>
              <strong>{{ enabledSamples.length }}</strong>
            </div>
          </article>
          <article class="panel summary-card">
            <div class="summary-icon-wrap">
              <HugeiconsIcon :icon="Shield01Icon" :size="18" class="summary-icon" />
            </div>
            <div class="summary-copy">
              <span class="muted">辅助功能权限</span>
              <strong>{{ accessibility?.granted ? "已授权" : "未授权" }}</strong>
            </div>
          </article>
          <article class="panel summary-card">
            <div class="summary-icon-wrap">
              <HugeiconsIcon :icon="Speaker01Icon" :size="18" class="summary-icon" />
            </div>
            <div class="summary-copy">
              <span class="muted">当前设备</span>
              <strong>{{ selectedDevice?.name || "未选择" }}</strong>
            </div>
          </article>
          <article class="panel summary-card">
            <div class="summary-icon-wrap">
              <HugeiconsIcon :icon="Analytics01Icon" :size="18" class="summary-icon" />
            </div>
            <div class="summary-copy">
              <span class="muted">当前进度</span>
              <strong>{{ progress.completedRuns }} / {{ progress.totalRuns }}</strong>
            </div>
          </article>
        </section>

        <div v-if="preflightFailures.length" class="banner">
          <strong>现在还不能运行</strong>
          <ul class="banner-list">
            <li v-for="item in preflightFailures" :key="item.key">
              <strong>{{ item.message }}</strong>
              <span>{{ item.hint || "先处理完这一项，再点开始运行。" }}</span>
            </li>
          </ul>
        </div>

        <div v-else-if="progress.phase === 'failed'" class="banner">
          <strong>{{ failureText(progress.failureCategory) }}</strong>
          <div>{{ progress.failureReason || progress.message }}</div>
        </div>

        <section class="main-grid">
          <div class="stack">
            <article class="panel">
              <div class="panel-header-row">
                <h3>目标应用</h3>
                <button class="secondary-button" @click="page = 'settings'">去设置</button>
              </div>
              <ul class="meta-list">
                <li v-for="app in config.targetApps" :key="app.id" class="app-row">
                  <div>
                    <strong>{{ app.name }}</strong>
                    <div class="muted">{{ app.launchCommand?.startsWith("selftest://") ? "内建自测，不依赖真实目标应用" : app.appFileName }}</div>
                    <div class="muted">{{ appModeText(app.hotkeyTriggerMode) }}</div>
                  </div>
                  <span class="pill" :class="app.enabled ? 'success' : 'warning'">{{ app.enabled ? "已启用" : "未启用" }}</span>
                </li>
              </ul>
            </article>
          </div>

          <article class="panel">
            <div class="panel-header-row">
              <h3>实时输入</h3>
              <span class="pill" :class="statusTone(progress.phase)">{{ phaseText(progress.phase) }}</span>
            </div>
            <p class="muted">这里是唯一输入落点。真实目标应用要把文本打到这里，内建自测也会往这里回写文本。</p>
            <textarea
              ref="liveTextarea"
              class="live-textarea"
              :value="liveInput"
              @input="onLiveInput"
              @beforeinput="onBeforeInput"
              @compositionstart="onComposition"
              @compositionend="onComposition"
              @focus="onFocusState"
              @blur="onFocusState"
            />
            <div class="status-strip">
              <div class="status-chip">
                <span>当前阶段:</span>
                <strong>{{ phaseText(progress.phase) }}</strong>
              </div>
              <span class="status-divider" aria-hidden="true">•</span>
              <div class="status-chip status-chip--wide">
                <span>当前消息:</span>
                <strong>{{ progress.message || "等待开始" }}</strong>
              </div>
              <span class="status-divider" aria-hidden="true">•</span>
              <div class="status-chip">
                <span>当前应用:</span>
                <strong>{{ progress.currentAppName || "-" }}</strong>
              </div>
              <span class="status-divider" aria-hidden="true">•</span>
              <div class="status-chip status-chip--wide">
                <span>当前样本:</span>
                <strong>{{ progress.currentSamplePath || "-" }}</strong>
              </div>
            </div>
          </article>

          <article class="panel">
            <h3>时间线</h3>
            <p class="muted">这里只展示最近 10 个关键动作。上面是动作名，下面是人话说明。</p>
            <ul ref="timelineList" class="timeline-list timeline-visual">
              <li v-for="item in timelineCards" :key="item.id" class="timeline-row timeline-card" :class="item.stateClass">
                <div class="timeline-marker">
                  <span class="timeline-dot"></span>
                </div>
                <div class="timeline-body">
                  <div class="timeline-topline">
                    <strong>{{ item.title }}</strong>
                    <span class="pill">{{ item.offsetLabel }}</span>
                  </div>
                  <div class="timeline-detail">{{ item.detail }}</div>
                  <div class="muted">{{ item.gapLabel }}</div>
                </div>
              </li>
              <li v-if="!timelineCards.length" class="timeline-row timeline-card timeline-neutral">
                <div class="timeline-marker">
                  <span class="timeline-dot"></span>
                </div>
                <div>
                  <strong>还没有时间线</strong>
                  <div class="muted">开始运行之后，这里会显示关键事件。</div>
                </div>
              </li>
            </ul>
          </article>
        </section>

        <section v-if="!running" class="result-stack">
          <article class="panel">
            <h3>测试结果</h3>
            <template v-if="latestSessionGroup">
              <div class="detail-headline">
                <div>
                  <div class="muted">统计范围</div>
                  <strong>{{ formatSessionTime(latestSessionGroup.session.startedAt) }}</strong>
                  <div class="muted">按最新一轮、按 app 分开汇总，不跟下面列表点击联动。</div>
                </div>
                <span class="pill">{{ sessionStatusText(latestSessionGroup.session.status) }}</span>
              </div>
              <div class="app-summary-stack">
                <section v-for="appSummary in latestSessionAppStats" :key="appSummary.appName" class="app-summary-block">
                  <div class="app-summary-header">
                    <strong>{{ appSummary.appName }}</strong>
                    <span>{{ appSummary.summary }}</span>
                  </div>
                  <div class="detail-stat-grid detail-stat-grid--plain">
                    <div
                      v-for="item in appSummary.stats"
                      :key="`${appSummary.appName}-${item.label}`"
                      class="detail-stat"
                      :class="{
                        'detail-stat--accent': item.tone === 'accent',
                        'detail-stat--success': item.tone === 'success',
                        'detail-stat--danger': item.tone === 'danger',
                        'detail-stat--warning': item.tone === 'warning',
                      }"
                    >
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </div>
                  </div>
                </section>
              </div>
            </template>
            <p v-else class="muted">还没有测试结果。先跑一轮再看这里的汇总。</p>
          </article>

          <article class="panel">
            <div class="panel-header-row">
              <h3>结果列表</h3>
            </div>
            <div class="session-stack">
              <article v-for="group in resultSessionGroups" :key="group.session.id" class="session-card">
                <div class="session-header">
                  <button class="session-toggle" @click="toggleSession(group.session.id)">
                    <div>
                      <strong>{{ formatSessionTime(group.session.startedAt) }}</strong>
                      <div class="muted">
                        {{ sessionStatusText(group.session.status) }}
                        · 共 {{ group.session.runCount }} 条
                        · 成功 {{ group.session.successCount }}
                        · 失败 {{ group.session.failedCount }}
                        · 取消 {{ group.session.cancelledCount }}
                      </div>
                    </div>
                    <span class="pill">{{ isSessionExpanded(group.session.id) ? "收起" : "展开" }}</span>
                  </button>
                  <button class="secondary-button" @click="exportCsv(group.session.id)">导出本轮 CSV</button>
                </div>

                <div v-if="isSessionExpanded(group.session.id)" class="app-group-stack">
                  <section v-for="appGroup in group.appGroups" :key="`${group.session.id}-${appGroup.appName}`" class="app-group-card">
                    <div class="app-group-header">
                      <div>
                        <strong>{{ appGroup.appName }}</strong>
                        <div class="muted">
                          共 {{ appGroup.runs.length }} 条
                          · 成功 {{ appGroup.successCount }}
                          · 失败 {{ appGroup.failedCount }}
                          · 取消 {{ appGroup.cancelledCount }}
                        </div>
                      </div>
                    </div>

                    <table class="result-table">
                      <thead>
                        <tr>
                          <th>样本</th>
                          <th>状态</th>
                          <th>停止到首字</th>
                          <th>停止到定稿</th>
                          <th>长度</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="result in appGroup.runs"
                          :key="result.id"
                        >
                          <td>{{ result.samplePath }}</td>
                          <td><span class="pill" :class="statusTone(result.status)">{{ resultStatusText(result.status) }}</span></td>
                          <td>{{ formatLatencyMs(result.triggerStopToFirstCharMs) }}</td>
                          <td>{{ formatLatencyMs(result.triggerStopToFinalTextMs) }}</td>
                          <td>{{ result.finalTextLength }}</td>
                        </tr>
                        <tr v-if="!appGroup.runs.length">
                          <td colspan="5">这个应用在本轮还没有结果。</td>
                        </tr>
                      </tbody>
                    </table>
                  </section>
                </div>
              </article>

              <div v-if="!resultSessionGroups.length" class="muted">还没有结果。先跑一次“内建自测”。</div>
            </div>
          </article>
        </section>
      </template>

      <section v-else-if="page === 'checks'" class="stack">
        <article class="panel">
          <div class="panel-header-row">
            <div>
              <h3>运行前检查</h3>
              <p class="muted">这里只看当前能不能跑，以及具体卡在哪一项。</p>
            </div>
            <button class="ghost-button" @click="refreshEnvironment">刷新</button>
          </div>
          <ul class="meta-list">
            <li
              v-for="item in preflightReport?.items ?? []"
              :key="item.key"
              class="check-row"
            >
              <div>
                <strong>{{ item.message }}</strong>
                <div class="muted">{{ item.hint || "这项已经通过。" }}</div>
              </div>
              <span class="pill" :class="item.ok ? 'success' : 'danger'">{{ item.ok ? "通过" : "失败" }}</span>
            </li>
            <li v-if="!preflightReport" class="check-row">
              <div>
                <strong>还没开始检查</strong>
                <div class="muted">直接点“开始运行”，或者先在设置页把目标应用和样本确认好。</div>
              </div>
            </li>
          </ul>
          <div class="toolbar" v-if="!accessibility?.granted">
            <button class="secondary-button" @click="requestAccessibilityPermission">请求辅助功能权限</button>
            <button class="ghost-button" @click="openAccessibilitySettings">打开系统设置</button>
          </div>
        </article>
      </section>

      <section v-else-if="page === 'samples'" class="stack">
        <article class="panel">
          <div class="panel-header-row">
            <div>
              <h3>样本</h3>
              <p class="muted">这里只保留目录和当前可用样本。</p>
            </div>
            <div class="toolbar">
              <button class="ghost-button" @click="chooseSampleRoot">选择目录</button>
              <button class="secondary-button" @click="rescanSamples">重新扫描</button>
            </div>
          </div>
          <div class="field" style="margin-bottom: 12px">
            <span class="muted">外部样本目录</span>
            <strong>{{ config.sampleRoot || "还没选，当前只跑内建自测" }}</strong>
          </div>
          <ul class="meta-list">
            <li v-for="sample in config.audioSamples" :key="sample.id" class="sample-row">
              <div>
                <strong>{{ sample.relativePath }}</strong>
                <div class="muted">
                  {{ sampleMeta(sample.language, sample.durationMs) }}
                  <span v-if="sample.enabled"> · 已启用</span>
                </div>
              </div>
              <span class="pill" :class="sample.enabled ? 'success' : 'warning'">{{ sample.enabled ? "启用" : "关闭" }}</span>
            </li>
          </ul>
        </article>
      </section>

      <section v-else-if="page === 'settings'" class="settings-page">
        <article class="panel">
          <div class="panel-header-row">
            <h3>基础设置</h3>
            <button class="secondary-button" @click="saveSettings">保存设置</button>
          </div>
          <div class="settings-grid">
            <label>
              <span>工作区名称</span>
              <input v-model="config.workspaceLabel" />
            </label>
            <label>
              <span>输出设备</span>
              <select v-model="config.selectedOutputDeviceId">
                <option v-for="item in devices" :key="item.id" :value="item.id">
                  {{ item.name }}{{ item.available ? "" : "（不可用）" }}
                </option>
              </select>
            </label>
            <label>
              <span>数据库路径</span>
              <div class="inline-field">
                <input v-model="config.databasePath" />
                <button class="ghost-button" @click="chooseDatabasePath">选择</button>
              </div>
            </label>
            <label>
              <span>外部样本目录</span>
              <div class="inline-field">
                <input v-model="config.sampleRoot" placeholder="不填也可以，默认直接跑内建自测" />
                <button class="ghost-button" @click="chooseSampleRoot">选择</button>
              </div>
            </label>
            <label>
              <span>启动 app 延时（毫秒）</span>
              <input v-model.number="config.appLaunchDelayMs" type="number" min="0" step="100" />
            </label>
            <label>
              <span>聚焦检测框延时（毫秒）</span>
              <input v-model.number="config.focusInputDelayMs" type="number" min="0" step="100" />
            </label>
            <label>
              <span>结果超时（毫秒）</span>
              <input v-model.number="config.resultTimeoutMs" type="number" min="100" step="100" />
            </label>
            <label>
              <span>下一条样本播放延时（毫秒）</span>
              <input v-model.number="config.betweenSamplesDelayMs" type="number" min="0" step="100" />
            </label>
            <label>
              <span>关闭 app 延时（毫秒）</span>
              <input v-model.number="config.closeAppDelayMs" type="number" min="0" step="100" />
            </label>
            <label style="grid-column: 1 / -1">
              <span>运行备注</span>
              <textarea v-model="config.runNotes" rows="3" />
            </label>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header-row">
            <h3>目标应用</h3>
            <button class="secondary-button" @click="addApp">新增应用</button>
          </div>
          <p class="muted">如果你现在只想确认工具能不能跑，保留“内建自测”开启就够了。</p>
          <div v-for="app in config.targetApps" :key="app.id" class="app-editor-card">
            <div class="panel-header-row">
              <div>
                <strong>{{ app.name }}</strong>
                <div class="muted">{{ app.launchCommand?.startsWith("selftest://") ? "这是工具自带的自测目标，不依赖真实应用。" : "真实目标应用配置" }}</div>
              </div>
              <label class="switch-row">
                <span>启用</span>
                <input v-model="app.enabled" type="checkbox" />
              </label>
            </div>
            <div class="settings-grid">
              <label><span>名称</span><input v-model="app.name" /></label>
              <label><span>.app 文件名</span><input v-model="app.appFileName" :disabled="Boolean(app.launchCommand?.startsWith('selftest://'))" /></label>
              <label>
                <span>热键</span>
                <div class="inline-field">
                  <input :value="app.hotkeyChord" readonly />
                  <button class="ghost-button" @click="beginHotkeyCapture(app.id)">{{ hotkeyButtonText(app.id, app.hotkeyChord) }}</button>
                  <button class="ghost-button" @click="setHotkeyForApp(app.id, 'Fn')">设为 Fn</button>
                </div>
                <div class="muted">macOS 上物理 Fn 常常不会被 Electron 上报。录不到时，直接点右边这个“设为 Fn”。</div>
              </label>
              <label>
                <span>触发方式</span>
                <select v-model="app.hotkeyTriggerMode">
                  <option value="hold_release">按住开始，松开结束</option>
                  <option value="press_start_press_stop">按一次开始，再按一次结束</option>
                </select>
              </label>
              <label><span>启动命令</span><input v-model="app.launchCommand" placeholder="留空时按 .app 文件名去找" /></label>
              <label style="grid-column: 1 / -1"><span>备注</span><textarea v-model="app.notes" rows="2" /></label>
            </div>
          </div>
        </article>

        <div class="settings-grid">
          <article class="panel">
            <div class="panel-header-row">
              <h3>权限</h3>
              <button class="ghost-button" @click="refreshEnvironment">刷新</button>
            </div>
            <ul class="meta-list">
              <li v-for="item in permissions" :key="item.id" class="permission-row">
                <div>
                  <strong>{{ item.name }}</strong>
                  <div class="muted">{{ item.required ? "必需" : "可选" }}</div>
                </div>
                <span class="pill" :class="item.granted ? 'success' : 'warning'">{{ item.granted ? "已授权" : "未授权" }}</span>
              </li>
            </ul>
          </article>

          <article class="panel">
            <h3>设备</h3>
            <ul class="meta-list">
              <li v-for="item in devices" :key="item.id" class="device-row">
                <div>
                  <strong>{{ item.name }}</strong>
                  <div class="muted">
                    {{ item.id }}
                    <span v-if="item.id === config.selectedOutputDeviceId"> · 当前选择</span>
                  </div>
                </div>
                <span class="pill" :class="item.available ? 'success' : 'warning'">{{ item.available ? "可用" : "不可用" }}</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section v-else-if="page === 'intro'" class="panel">
        <h3>怎么开始</h3>
        <p>先别急着配真实 app。默认已经启用了“内建自测”，你直接点主控台的“开始运行”就能验证主流程。</p>
        <p>确认主流程没问题之后，再去设置页打开真实目标应用，录入快捷键，选择外部 WAV 目录。</p>
        <pre>
+------------------------------+
| 先跑内建自测                |
| 看能不能写 SQLite           |
| 看结果列表和详情有没有数据   |
| 再接真实目标应用             |
+------------------------------+
        </pre>
      </section>

      <section v-else class="about-grid">
        <article class="panel">
          <h3>现在这版有什么</h3>
          <div class="field"><span class="muted">桌面壳</span><strong>Electron + Vue</strong></div>
          <div class="field"><span class="muted">结果存储</span><strong>{{ config.databasePath }}</strong></div>
          <div class="field"><span class="muted">默认可跑路径</span><strong>内建自测</strong></div>
          <div class="field"><span class="muted">当前 helper</span><strong>当前机器优先走备用 helper</strong></div>
        </article>
        <article class="panel">
          <h3>还没做完的地方</h3>
          <pre>1. 真实目标应用的全量手工回归还没补齐。
2. Swift 原生 helper 在这台机器上还没编过。
3. 现在先以“能跑通流程、能看清错误”为第一目标。</pre>
        </article>
      </section>

      <div v-if="completionDialogVisible && completedDialogSummary" class="dialog-backdrop" @click.self="completionDialogVisible = false">
        <div class="dialog-card">
          <div class="panel-header-row">
            <div>
              <h3>测试结束</h3>
              <p class="muted">这一轮已经跑完，汇总如下。</p>
            </div>
            <span class="pill">{{ completedDialogSummary.status }}</span>
          </div>
          <div class="dialog-stat-grid">
            <div class="field">
              <span class="muted">应用数</span>
              <strong>{{ completedDialogSummary.appCount }}</strong>
            </div>
            <div class="field">
              <span class="muted">样本数</span>
              <strong>{{ completedDialogSummary.sampleCount }}</strong>
            </div>
            <div class="field">
              <span class="muted">总耗时</span>
              <strong>{{ completedDialogSummary.elapsed }}</strong>
            </div>
          </div>
          <div class="toolbar">
            <button class="secondary-button" @click="completionDialogVisible = false">知道了</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
