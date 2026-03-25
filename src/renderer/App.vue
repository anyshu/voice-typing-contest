<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { HugeiconsIcon } from "@hugeicons/vue";
import {
  Analytics01Icon,
  AppStoreIcon,
  BookOpen01Icon,
  CheckListIcon,
  DashboardSquare01Icon,
  Delete02Icon,
  FileExportIcon,
  FolderAudioIcon,
  HelpCircleIcon,
  InformationCircleIcon,
  PlayIcon,
  PlayCircleIcon,
  ReloadIcon,
  Settings01Icon,
  Shield01Icon,
  Speaker01Icon,
  StopIcon,
  StopCircleIcon,
} from "@hugeicons/core-free-icons";
import VersionNotesPanel from "./components/VersionNotesPanel.vue";
import { defaultConfig } from "../shared/defaults";
import { safeTimelinePayload, timelineDetail, timelineTitle } from "../shared/timeline";
import type {
  AppConfig,
  AudioDevice,
  AudioSample,
  CsvImportSummary,
  FailureCategory,
  InstalledTargetAppInfo,
  PermissionSnapshot,
  PreflightReport,
  RunSessionSummary,
  RunEventRecord,
  RunPhase,
  RunProgress,
  RunStartOptions,
  SettingsPayload,
  TargetAppProfile,
  TestRunRecord,
} from "../shared/types";

const brandIconUrl = new URL("../../resources/icon-macos.png", import.meta.url).href;
const muteDuringDictationImageUrl = new URL("./assets/mute-during-dictation.svg", import.meta.url).href;
const page = ref<"main" | "checks" | "samples" | "history" | "intro" | "faq" | "about" | "settings" | "apps">("main");
const config = ref<AppConfig>(defaultConfig());
const permissions = ref<PermissionSnapshot[]>([]);
const devices = ref<AudioDevice[]>([]);
const installedAppInfoById = ref<Record<string, InstalledTargetAppInfo>>({});
const sessions = ref<RunSessionSummary[]>([]);
const results = ref<TestRunRecord[]>([]);
const expandedSessionIds = ref<string[]>([]);
const progress = ref<RunProgress>({ phase: "idle", textValue: "", message: "空闲", completedRuns: 0, totalRuns: 0 });
const preflightReport = ref<PreflightReport | null>(null);
const liveTimelineByRunId = ref<Record<string, RunEventRecord[]>>({});
const lastTimelineRunId = ref<string | null>(null);
const liveTimelineEvents = ref<RunEventRecord[]>([]);
const timelineList = ref<HTMLUListElement | null>(null);
const inputProbeText = ref("");
const inputProbeTextarea = ref<HTMLTextAreaElement | null>(null);
const appVersion = ref("v0.1.4");
const notice = ref("");
const capturingAppId = ref<string | null>(null);
const capturePreview = ref("");
const completedSessionId = ref<string | null>(null);
const completionDialogVisible = ref(false);
const completionDialogShownForSessionId = ref<string | null>(null);
const pendingRunStart = ref(false);
const preRunDialogVisible = ref(false);
const preRunTimelineEvents = ref<RunEventRecord[]>([]);
const showLatestSessionTimeline = ref(true);
const importCsvDialogVisible = ref(false);
const importCsvDragActive = ref(false);
const importCsvBusy = ref(false);
const previewAudioBySampleId = new Map<string, HTMLAudioElement>();
const previewSrcBySampleId = ref<Record<string, string>>({});
const previewProgress = ref<Record<string, number>>({});
const previewCurrentTime = ref<Record<string, number>>({});
const previewDuration = ref<Record<string, number>>({});
const previewPlayingSampleId = ref<string | null>(null);
const hoveredSampleId = ref<string | null>(null);
const sampleListViewport = ref<HTMLElement | null>(null);
const sampleListScrollTop = ref(0);
const sampleListViewportHeight = ref(520);
let resolvePreRunConfirm: (() => void) | null = null;
let noticeTimer: ReturnType<typeof window.setTimeout> | null = null;

const PRE_RUN_RUN_ID_PREFIX = "prep:";
const SAMPLE_ROW_HEIGHT = 44;
const SAMPLE_LIST_OVERSCAN = 8;

const phaseLabels: Record<RunPhase, string> = {
  idle: "空闲",
  preflight: "运行前检查",
  focus_input: "聚焦输入框",
  wait_before_hotkey: "等待触发热键",
  trigger_start: "发送触发热键",
  wait_before_audio: "等待音频启动",
  audio_playing: "播放音频",
  wait_before_trigger_stop: "等待收口热键",
  trigger_stop: "发送收口热键",
  observing_text: "观察输入",
  between_samples_wait: "等待下一条样本",
  completed: "完成",
  failed: "失败",
  cancelled: "已结束",
};

const failureLabels: Record<FailureCategory, string> = {
  permission_denied_accessibility: "缺少辅助功能权限",
  permission_denied_automation: "缺少自动化权限",
  target_app_not_installed: "目标App未安装",
  target_app_not_ready: "目标App不可运行",
  target_app_launch_timeout: "目标App启动超时",
  input_focus_failed: "输入框聚焦失败",
  device_not_found: "输出设备不可用",
  audio_play_failed: "音频播放失败",
  hotkey_dispatch_failed: "发送快捷键失败",
  no_text_observed: "没有观察到任何输入",
  timeout_waiting_result: "等待结果超时",
  empty_result: "结果为空",
};

const modeLabels = {
  hold_release: "按住并保持，松开结束",
  press_start_press_stop: "按下抬起开始，再按下抬起结束",
} as const;

const running = computed(() => !["idle", "completed", "failed", "cancelled"].includes(progress.value.phase));
const enabledApps = computed(() => config.value.targetApps.filter((item) => item.enabled));
const builtinApps = computed(() => config.value.targetApps.filter((item) => isBuiltinApp(item)));
const realApps = computed(() => config.value.targetApps.filter((item) => !isBuiltinApp(item)));
const enabledRealApps = computed(() => realApps.value.filter((item) => item.enabled));
const installedRealApps = computed(() => realApps.value.filter((item) => installedAppInfoById.value[item.id]?.installed));
const enabledSamples = computed(() => config.value.audioSamples.filter((item) => item.enabled));
const disabledSamples = computed(() => config.value.audioSamples.filter((item) => !item.enabled));
const selectedDevice = computed(() => devices.value.find((item) => item.id === config.value.selectedOutputDeviceId));
const accessibility = computed(() => permissions.value.find((item) => item.id === "accessibility"));
const preflightFailures = computed(() => preflightReport.value?.items.filter((item) => !item.ok) ?? []);
const allSamplesEnabled = computed(() => config.value.audioSamples.length > 0 && config.value.audioSamples.every((item) => item.enabled));
const sampleListStartIndex = computed(() => Math.max(0, Math.floor(sampleListScrollTop.value / SAMPLE_ROW_HEIGHT) - SAMPLE_LIST_OVERSCAN));
const sampleListVisibleCount = computed(() => Math.ceil(sampleListViewportHeight.value / SAMPLE_ROW_HEIGHT) + SAMPLE_LIST_OVERSCAN * 2);
const sampleListEndIndex = computed(() => Math.min(config.value.audioSamples.length, sampleListStartIndex.value + sampleListVisibleCount.value));
const visibleSamples = computed(() => config.value.audioSamples.slice(sampleListStartIndex.value, sampleListEndIndex.value));
const sampleListTopSpacerHeight = computed(() => sampleListStartIndex.value * SAMPLE_ROW_HEIGHT);
const sampleListBottomSpacerHeight = computed(() => Math.max(0, (config.value.audioSamples.length - sampleListEndIndex.value) * SAMPLE_ROW_HEIGHT));
const resultSessionGroups = computed(() => sessions.value
  .map((session) => {
    const runs = results.value.filter((item) => item.runSessionId === session.id);
    const appNames = [...new Set(runs.map((item) => item.appName))];
    const displayTime = runs.reduce((latest, item) => item.createdAt > latest ? item.createdAt : latest, session.startedAt);
    return {
      session,
      runs,
      displayTime,
      appGroups: appNames.map((appName) => {
        const appRuns = runs.filter((item) => item.appName === appName);
        const appVersions = [...new Set(appRuns.map((item) => item.appVersion).filter((value): value is string => Boolean(value?.trim())))];
        return {
          appName,
          appVersions,
          runs: appRuns,
          successCount: appRuns.filter((item) => item.status === "success").length,
          failedCount: appRuns.filter((item) => item.status === "failed").length,
          cancelledCount: appRuns.filter((item) => item.status === "cancelled").length,
        };
      }),
    };
  })
  .sort((left, right) => right.displayTime.localeCompare(left.displayTime)));
const pageTitle = computed(() => {
  if (page.value === "main") return "主控台";
  if (page.value === "checks") return "运行前检查";
  if (page.value === "samples") return "样本管理";
  if (page.value === "apps") return "App管理";
  if (page.value === "history") return "测试历史";
  if (page.value === "settings") return "设置";
  if (page.value === "intro") return "怎么开始";
  if (page.value === "faq") return "常见问题";
  return "关于";
});
const pageSubtitle = computed(() => {
  if (page.value === "main") return "本地基准测试工具";
  if (page.value === "checks") return "开跑前检查清单";
  if (page.value === "samples") return "测试集与目录视图";
  if (page.value === "apps") return "目标 App 配置与热键";
  if (page.value === "history") return "历史结果与分轮导出";
  if (page.value === "settings") return "运行参数与环境设置";
  if (page.value === "intro") return "准备路径与使用说明";
  if (page.value === "faq") return "常见问题与排查";
  return "评测方式与当前结果";
});
const noticeTone = computed(() => {
  if (!notice.value) return "info";
  if (
    notice.value.includes("失败")
    || notice.value.includes("缺少")
    || notice.value.includes("不能")
    || notice.value.includes("没跑起来")
    || notice.value.includes("红色提示")
  ) return "danger";
  if (notice.value.includes("取消") || notice.value.includes("未")) return "warning";
  return "success";
});
function buildTimelineCards(
  items: RunEventRecord[],
  showLiveState: boolean,
  terminalStatus?: string,
) {
  if (!items.length) return [];

  const firstTs = items[0]?.tsMs ?? 0;
  const formatTimelineOffset = (offsetMs: number): string => {
    const totalMs = Math.max(0, Math.round(offsetMs));
    const hours = Math.floor(totalMs / 3_600_000);
    const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
    const seconds = Math.floor((totalMs % 60_000) / 1000);
    const milliseconds = totalMs % 1000;
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":") + `.${String(milliseconds).padStart(3, "0")}`;
  };
  const baseItems = items.map((item, index) => ({
    ...item,
    title: timelineTitle(item),
    detail: timelineDetail(item),
    stateClass: timelineStateClass(item, showLiveState && index === items.length - 1),
    timestampLabel: formatTimelineOffset(item.tsMs - firstTs),
  }));

  const syntheticStart = {
    id: "__timeline_start__",
    runId: items[0]?.runId ?? "",
    eventType: "__start__",
    tsMs: firstTs,
    payloadJson: "{}",
    title: "开始",
    detail: "整轮测试开始。",
    stateClass: "timeline-bookend",
    timestampLabel: "00:00:00.000",
  };

  const cards = [syntheticStart, ...baseItems];
  if ((showLiveState && isTerminalPhase(progress.value.phase)) || (!showLiveState && terminalStatus && ["completed", "failed", "cancelled"].includes(terminalStatus))) {
    const lastTs = items[items.length - 1]?.tsMs ?? firstTs;
    cards.push({
      id: "__timeline_close__",
      runId: items[items.length - 1]?.runId ?? "",
      eventType: "__close__",
      tsMs: lastTs,
      payloadJson: "{}",
      title: "结束",
      detail: "整轮测试已结束。",
      stateClass: "timeline-bookend",
      timestampLabel: formatTimelineOffset(lastTs - firstTs),
    });
  }

  return cards;
}

function isBuiltinApp(app: TargetAppProfile): boolean {
  return Boolean(app.launchCommand?.startsWith("selftest://"));
}

function appKindLabel(app: TargetAppProfile): string {
  return isBuiltinApp(app) ? "内建自测" : "真实 App";
}

function appStatusLabel(app: TargetAppProfile): string {
  return app.enabled ? "已启用" : "未启用";
}

function appVersionLabel(app: TargetAppProfile): string {
  const info = installedAppInfoById.value[app.id];
  if (isBuiltinApp(app) || !info?.installed) return "";
  if (info.version) return `v${info.version}`;
  if (info.buildVersion) return `build ${info.buildVersion}`;
  return "";
}

function appLaunchSummary(app: TargetAppProfile): string {
  return isBuiltinApp(app)
    ? "内建流程"
    : (app.launchCommand?.trim() || app.appFileName || "按 .app 文件名查找");
}

async function openAppWebsite(app: TargetAppProfile): Promise<void> {
  const url = app.websiteUrl?.trim();
  if (!url) {
    showToast(`${app.name} 还没配置官网链接。`);
    return;
  }
  try {
    await window.vtc.openExternalUrl(url);
  } catch (error) {
    showToast(`打开官网失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

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
  if (status === "cancelled") return "已结束";
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

async function jumpToGuideTarget(target: "apps" | "hotkey" | "samples" | "run"): Promise<void> {
  if (target === "run") {
    page.value = "main";
  } else if (target === "samples") {
    page.value = "samples";
  } else if (target === "apps" || target === "hotkey") {
    page.value = "apps";
  } else {
    page.value = "settings";
  }
  await nextTick();
  const element = document.querySelector<HTMLElement>(`[data-guide-target="${target}"]`);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  if (typeof element.focus === "function") {
    element.focus({ preventScroll: true });
  }
}

function sampleMeta(language: string, durationMs?: number): string {
  if (!durationMs) return language;
  return `${language} / ${(durationMs / 1000).toFixed(2)} 秒`;
}

function formatPreviewTime(seconds?: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds ?? 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
}

function getSamplePreviewDuration(sampleId: string, fallbackMs?: number): number {
  const seconds = previewDuration.value[sampleId];
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) return seconds;
  return Math.max(0, (fallbackMs ?? 0) / 1000);
}

async function ensureSamplePreviewSrc(sample: AudioSample): Promise<string | undefined> {
  const sampleId = sample.id;
  const cached = previewSrcBySampleId.value[sampleId];
  if (cached) return cached;
  try {
    const src = await window.vtc.getSamplePreviewData({
      id: sample.id,
      filePath: sample.filePath,
      relativePath: sample.relativePath,
      displayName: sample.displayName,
      expectedText: sample.expectedText,
      language: sample.language,
      durationMs: sample.durationMs,
      tags: [...sample.tags],
      enabled: sample.enabled,
    }) as string;
    previewSrcBySampleId.value = { ...previewSrcBySampleId.value, [sampleId]: src };
    return src;
  } catch {
    notice.value = "样本预览加载失败，请确认音频文件仍然存在。";
    return undefined;
  }
}

function registerPreviewAudio(sampleId: string, element: HTMLAudioElement | null): void {
  const existing = previewAudioBySampleId.get(sampleId);
  if (existing && existing !== element) existing.pause();

  if (!element) {
    previewAudioBySampleId.delete(sampleId);
    return;
  }

  previewAudioBySampleId.set(sampleId, element);
  previewCurrentTime.value = { ...previewCurrentTime.value, [sampleId]: element.currentTime || 0 };
  previewDuration.value = {
    ...previewDuration.value,
    [sampleId]: Number.isFinite(element.duration) && element.duration > 0
      ? element.duration
      : getSamplePreviewDuration(sampleId),
  };
}

function syncPreviewAudioState(sampleId: string): void {
  const audio = previewAudioBySampleId.get(sampleId);
  if (!audio) return;
  const duration = Number.isFinite(audio.duration) && audio.duration > 0
    ? audio.duration
    : getSamplePreviewDuration(sampleId);
  const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  previewDuration.value = { ...previewDuration.value, [sampleId]: duration };
  previewCurrentTime.value = { ...previewCurrentTime.value, [sampleId]: currentTime };
  previewProgress.value = {
    ...previewProgress.value,
    [sampleId]: duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0,
  };
}

async function toggleSamplePreview(sample: AudioSample): Promise<void> {
  const sampleId = sample.id;
  const audio = previewAudioBySampleId.get(sampleId);
  if (!audio) return;
  const src = await ensureSamplePreviewSrc(sample);
  if (!src) return;
  if (audio.src !== src) {
    audio.src = src;
    audio.load();
  }

  if (previewPlayingSampleId.value && previewPlayingSampleId.value !== sampleId) {
    const activeAudio = previewAudioBySampleId.get(previewPlayingSampleId.value);
    activeAudio?.pause();
  }

  if (audio.paused) {
    try {
      await audio.play();
      previewPlayingSampleId.value = sampleId;
      syncPreviewAudioState(sampleId);
    } catch {
      notice.value = "样本预览播放失败。";
    }
    return;
  }

  audio.pause();
  previewPlayingSampleId.value = null;
  syncPreviewAudioState(sampleId);
}

function seekSamplePreview(sampleId: string, event: Event): void {
  const audio = previewAudioBySampleId.get(sampleId);
  const target = event.target as HTMLInputElement | null;
  if (!audio || !target) return;
  const duration = getSamplePreviewDuration(sampleId);
  const progressValue = Number(target.value);
  if (!Number.isFinite(progressValue) || duration <= 0) return;
  audio.currentTime = (progressValue / 100) * duration;
  syncPreviewAudioState(sampleId);
}

function releaseSamplePreviewFocus(sampleId: string): void {
  const container = document.querySelector<HTMLElement>(`[data-sample-preview-id="${sampleId}"]`);
  const activeElement = document.activeElement as HTMLElement | null;
  if (container && activeElement && container.contains(activeElement)) {
    activeElement.blur();
  }
}

function onSamplePreviewEnded(sampleId: string): void {
  if (previewPlayingSampleId.value === sampleId) previewPlayingSampleId.value = null;
  releaseSamplePreviewFocus(sampleId);
  syncPreviewAudioState(sampleId);
}

function onSamplePreviewPause(sampleId: string): void {
  if (previewPlayingSampleId.value === sampleId) previewPlayingSampleId.value = null;
  syncPreviewAudioState(sampleId);
}

function previewSliderStyle(sampleId: string): { background: string } {
  const progress = Math.max(0, Math.min(100, previewProgress.value[sampleId] ?? 0));
  return {
    background: `linear-gradient(90deg, #2563eb 0%, #2563eb ${progress}%, rgba(15, 23, 42, 0.18) ${progress}%, rgba(15, 23, 42, 0.18) 100%)`,
  };
}

function shouldRenderSamplePreview(sampleId: string): boolean {
  return hoveredSampleId.value === sampleId || previewPlayingSampleId.value === sampleId;
}

function onSampleRowEnter(sampleId: string): void {
  hoveredSampleId.value = sampleId;
}

function onSampleRowLeave(sampleId: string): void {
  if (hoveredSampleId.value === sampleId) hoveredSampleId.value = null;
}

function measureSampleListViewport(): void {
  sampleListViewportHeight.value = sampleListViewport.value?.clientHeight || 520;
}

function onSampleListScroll(event: Event): void {
  const target = event.target as HTMLElement | null;
  sampleListScrollTop.value = target?.scrollTop ?? 0;
}

function clearNoticeTimer(): void {
  if (noticeTimer) {
    window.clearTimeout(noticeTimer);
    noticeTimer = null;
  }
}

function showToast(message: string): void {
  notice.value = message;
}

function scheduleNoticeDismiss(message: string): void {
  clearNoticeTimer();
  noticeTimer = window.setTimeout(() => {
    if (notice.value === message) {
      notice.value = "";
    }
    noticeTimer = null;
  }, 2600);
}

function toggleSampleEnabled(sampleId: string, enabled: boolean): void {
  const sample = config.value.audioSamples.find((item) => item.id === sampleId);
  if (!sample) return;
  sample.enabled = enabled;
  showToast(`${sample.displayName} 已${enabled ? "启用" : "关闭"}，${enabled ? "会" : "不会"}参与后续测试。`);
}

function setAllSamplesEnabled(enabled: boolean): void {
  if (!config.value.audioSamples.length) return;
  for (const sample of config.value.audioSamples) {
    sample.enabled = enabled;
  }
  showToast(`已${enabled ? "全局开启" : "全局关闭"}全部样本。`);
}

function toggleAllSamples(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  setAllSamplesEnabled(Boolean(target?.checked));
}

function onSampleToggle(sampleId: string, event: Event): void {
  toggleSampleEnabled(sampleId, (event.target as HTMLInputElement).checked);
}

function sessionStatusText(status: RunSessionSummary["status"]): string {
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "cancelled") return "已结束";
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

function sessionAppLabel(appGroups: Array<{ appName: string; appVersions?: string[] }>): string {
  if (appGroups.length === 0) return "";
  if (appGroups.length === 1) return appGroups[0].appName;
  return `${appGroups[0].appName} 等 ${appGroups.length} 个 App`;
}

function sessionAppVersionText(appGroups: Array<{ appName: string; appVersions?: string[] }>): string {
  if (appGroups.length !== 1) return "";
  return appGroups[0].appVersions?.[0] ?? "";
}

function appGroupVersionText(appGroup: { appVersions?: string[] }): string {
  const versions = appGroup.appVersions ?? [];
  if (versions.length === 0) return "";
  if (versions.length === 1) return versions[0];
  return `${versions[0]} 等 ${versions.length} 个版本`;
}

function formatSessionTimestamp(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}

function formatLatencyMs(value?: number): string {
  if (value === undefined) return "-";
  if (value < 0) return `提前 ${Math.abs(value)}`;
  return `${value}`;
}

function historyResultTooltip(result: TestRunRecord): string {
  const capturedText = result.normalizedText.trim() || result.rawText.trim();
  if (capturedText) {
    return capturedText;
  }
  if (result.failureReason?.trim()) {
    return result.failureReason.trim();
  }
  return "未捕获到结果";
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
const mainSessionGroup = computed(() => {
  if (pendingRunStart.value || running.value) {
    return resultSessionGroups.value.find((item) => item.session.id === progress.value.sessionId);
  }
  if (!showLatestSessionTimeline.value) {
    return undefined;
  }
  return latestSessionGroup.value;
});
const latestMainRun = computed(() => mainSessionGroup.value?.runs[0]);
const displayedTimeline = computed(() => {
  const preRunEvents = preRunTimelineEvents.value;
  const liveSessionId = progress.value.sessionId;
  const hasSessionRuns = Boolean(mainSessionGroup.value?.runs.length);
  const normalizeTimeline = (items: RunEventRecord[]) => [...items]
    .sort((left, right) => left.tsMs - right.tsMs)
    .filter((event, index, all) => index === all.findIndex((candidate) => candidate.id === event.id));

  // If the current batch has not been associated with a session yet, keep the
  // older behavior of showing only the latest run so unrelated stale events do
  // not get mixed together on first paint.
  if (!liveSessionId && !hasSessionRuns) {
    const liveRunId = progress.value.runId ?? lastTimelineRunId.value;
    const liveEvents = liveRunId ? (liveTimelineByRunId.value[liveRunId] ?? []) : [];
    return [...preRunEvents, ...normalizeTimeline(liveEvents)];
  }

  const normalizedLive = normalizeTimeline(liveTimelineEvents.value);
  if (normalizedLive.length) {
    return [...preRunEvents, ...normalizedLive];
  }

  const persisted = (mainSessionGroup.value?.runs ?? []).flatMap((run) => run.timeline);
  const merged = normalizeTimeline(persisted);
  return [...preRunEvents, ...merged];
});
const timelineCards = computed(() => buildTimelineCards(
  displayedTimeline.value,
  running.value || pendingRunStart.value,
  latestMainRun.value?.phase,
));
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
const mainSessionAppStats = computed(() => (mainSessionGroup.value?.appGroups ?? []).map((group) => {
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
    sampleCount: new Set(group.runs.map((item) => item.sampleId)).size,
    elapsed: formatElapsedDuration(group.session.startedAt, group.session.finishedAt),
  };
});

function timelineStateClass(item: RunEventRecord, isLatest: boolean): string {
  if (item.eventType === "run_failed") return "timeline-failure";
  if (item.eventType.startsWith("pre_run_")) return "timeline-prep";
  if (item.eventType === "app_start") return "timeline-app";
  if (item.eventType === "sample_start") return "timeline-sample";
  if (isLatest && running.value) return "timeline-live";
  return "timeline-action";
}

async function loadBootstrap(): Promise<void> {
  appVersion.value = `v${await window.vtc.getVersion() as string}`;
  const settings = await window.vtc.getSettings() as SettingsPayload;
  config.value = settings;
  permissions.value = settings.permissions;
  devices.value = settings.devices;
  await refreshInstalledAppInfo();
  await refreshResultData();
}

async function refreshEnvironment(): Promise<void> {
  const snapshot = await window.vtc.refreshPermissions() as { permissions: PermissionSnapshot[]; devices: AudioDevice[] };
  permissions.value = snapshot.permissions;
  devices.value = snapshot.devices;
}

async function refreshInstalledAppInfo(): Promise<void> {
  const entries = await window.vtc.getInstalledAppInfo(plainConfig().targetApps) as InstalledTargetAppInfo[];
  installedAppInfoById.value = Object.fromEntries(entries.map((item) => [item.profileId, item]));
}

async function inspectRunReadiness(): Promise<void> {
  await saveSettings(false);
  await refreshEnvironment();
  preflightReport.value = await window.vtc.inspectRun() as PreflightReport;
  notice.value = preflightReport.value.ok ? "检查完成，可以开始。" : "检查完成，请先处理未通过项。";
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
  maybeShowCompletionDialog();
}

function maybeShowCompletionDialog(): void {
  const { sessionId, phase, completedRuns, totalRuns } = progress.value;
  if (!sessionId || totalRuns <= 0) {
    return;
  }
  const batchFinished = isTerminalPhase(phase) && completedRuns >= totalRuns;
  const sessionGroup = resultSessionGroups.value.find((item) => item.session.id === sessionId);
  const sessionPersisted = Boolean(sessionGroup?.session.finishedAt);
  const allRunsPersisted = (sessionGroup?.runs.length ?? 0) >= totalRuns;
  if (!batchFinished || !sessionPersisted || !allRunsPersisted || completionDialogShownForSessionId.value === sessionId) {
    return;
  }
  completedSessionId.value = sessionId;
  completionDialogVisible.value = true;
  completionDialogShownForSessionId.value = sessionId;
}

async function saveSettings(showNotice = true): Promise<void> {
  try {
    await window.vtc.saveSettings(plainConfig());
    await refreshEnvironment();
    await refreshInstalledAppInfo();
    if (showNotice) {
      showToast("设置已保存。");
    }
  } catch (error) {
    showToast(`保存设置失败：${error instanceof Error ? error.message : String(error)}`);
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
  await startRunBatch();
}

async function startRunBatch(options?: RunStartOptions): Promise<void> {
  try {
    pendingRunStart.value = true;
    preflightReport.value = null;
    inputProbeText.value = "";
    liveTimelineByRunId.value = {};
    lastTimelineRunId.value = null;
    liveTimelineEvents.value = [];
    preRunTimelineEvents.value = [];
    showLatestSessionTimeline.value = false;
    notice.value = "开始前提示已弹出，确认开始后请不要操作鼠标和键盘。";
    await focusInputProbe();
    await saveSettings(false);
    await runPreStartCountdown();
    const report = await window.vtc.startRun(options) as PreflightReport;
    preflightReport.value = report;
    await refreshResultData();
    if (!report.ok) {
      notice.value = "这次没跑起来，先看上面的红色提示。";
    } else if (progress.value.phase === "completed") {
      notice.value = "测试已完成。";
    }
  } catch (error) {
    preRunDialogVisible.value = false;
    resolvePreRunConfirm = null;
    notice.value = `开始失败：${error instanceof Error ? error.message : String(error)}`;
    pendingRunStart.value = false;
  }
}

async function retryHistoryResult(result: TestRunRecord): Promise<void> {
  if (running.value || pendingRunStart.value || preRunDialogVisible.value) {
    notice.value = "当前已有测试在跑，先等这一轮结束。";
    return;
  }
  const targetApp = config.value.targetApps.find((item) => item.id === result.appId)
    ?? config.value.targetApps.find((item) => item.name === result.appName);
  const targetSample = config.value.audioSamples.find((item) => item.id === result.sampleId)
    ?? config.value.audioSamples.find((item) => item.relativePath === result.samplePath);
  if (!targetApp) {
    notice.value = `重试失败：当前配置里找不到 ${result.appName}，请先去 App 管理确认它还在。`;
    return;
  }
  if (!targetSample) {
    notice.value = `重试失败：当前配置里找不到样本 ${result.samplePath}，请先确认样本目录已重新扫描。`;
    return;
  }
  if (page.value !== "main") {
    page.value = "main";
    await nextTick();
  }
  notice.value = `准备重试 ${result.appName} / ${result.samplePath}。`;
  await startRunBatch({
    appIds: [targetApp.id],
    sampleIds: [targetSample.id],
    retryRootRunId: result.retryRootRunId ?? result.id,
  });
}

async function runPreStartCountdown(): Promise<void> {
  const runId = `${PRE_RUN_RUN_ID_PREFIX}${Date.now()}`;
  preRunDialogVisible.value = true;

  await emitRunTimelineEvent(runId, "pre_run_prompt", {
    message: "开始测试前请先确认已经准备好；不确认则不会开始。",
  });
  notice.value = "开始前提示已弹出，点击“我已准备好，开始测试”后会立即开始。";
  await new Promise<void>((resolve) => {
    resolvePreRunConfirm = resolve;
  });

  preRunDialogVisible.value = false;
  notice.value = "已确认，开始正式测试。";
  await emitRunTimelineEvent(runId, "pre_run_acknowledged", {
    message: "测试员确认可以开始。",
  });
  await emitRunTimelineEvent(runId, "pre_run_begin", {
    message: "提示对话框已关闭，正式开始测试。",
  });
  preRunTimelineEvents.value = [];
  resolvePreRunConfirm = null;
}

async function emitRunTimelineEvent(runId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
  const emitter = window.vtc.emitRunTimelineEvent as ((runId: string, eventType: string, payload: Record<string, unknown>) => Promise<unknown>) | undefined;
  if (typeof emitter !== "function") {
    return;
  }
  await emitter(runId, eventType, payload);
}

function confirmPreRunDialog(): void {
  if (!preRunDialogVisible.value) return;
  resolvePreRunConfirm?.();
}

function cancelPreRunDialog(): void {
  if (!preRunDialogVisible.value) return;
  preRunDialogVisible.value = false;
  preRunTimelineEvents.value = [];
  liveTimelineByRunId.value = {};
  liveTimelineEvents.value = [];
  lastTimelineRunId.value = null;
  showLatestSessionTimeline.value = true;
  resolvePreRunConfirm = null;
  pendingRunStart.value = false;
  notice.value = "已取消开始，准备好之后再点开始。";
}

async function focusInputProbe(): Promise<void> {
  const textarea = inputProbeTextarea.value;
  if (document.hasFocus() && textarea && document.activeElement === textarea) {
    return;
  }

  await window.vtc.focusBenchmarkWindow();
  await nextTick();
  const currentTextarea = inputProbeTextarea.value;
  if (!currentTextarea) return;
  currentTextarea.focus({ preventScroll: true });
  const end = currentTextarea.value.length;
  currentTextarea.setSelectionRange(end, end);
}

function scrollTimelineToLatest(list = timelineList.value): void {
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
    notice.value = "正在关闭测试。";
  } catch (error) {
    notice.value = `关闭失败：${error instanceof Error ? error.message : String(error)}`;
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

function openImportCsvDialog(): void {
  importCsvDialogVisible.value = true;
  importCsvDragActive.value = false;
}

function closeImportCsvDialog(): void {
  if (importCsvBusy.value) return;
  importCsvDialogVisible.value = false;
  importCsvDragActive.value = false;
}

async function importCsvFromPath(filePath?: string): Promise<void> {
  if (!filePath) {
    showToast("已取消导入。");
    return;
  }

  try {
    importCsvBusy.value = true;
    const summary = await window.vtc.importCsv(filePath) as CsvImportSummary;
    await refreshResultData();
    ensureSessionExpanded(summary.sessionId);
    page.value = "history";
    importCsvDialogVisible.value = false;
    importCsvDragActive.value = false;
    showToast(`已导入 CSV：${summary.importedCount} 条记录，来自 ${summary.appCount} 个应用。`);
  } catch (error) {
    notice.value = `导入失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    importCsvBusy.value = false;
  }
}

async function chooseImportCsvFile(): Promise<void> {
  const picked = await window.vtc.pickImportCsv() as string | undefined;
  await importCsvFromPath(picked);
}

function handleImportCsvDragEnter(event: DragEvent): void {
  event.preventDefault();
  importCsvDragActive.value = true;
}

function handleImportCsvDragOver(event: DragEvent): void {
  event.preventDefault();
  importCsvDragActive.value = true;
}

function handleImportCsvDragLeave(event: DragEvent): void {
  event.preventDefault();
  const relatedTarget = event.relatedTarget as Node | null;
  if (relatedTarget && (event.currentTarget as HTMLElement | null)?.contains(relatedTarget)) return;
  importCsvDragActive.value = false;
}

async function handleImportCsvDrop(event: DragEvent): Promise<void> {
  event.preventDefault();
  importCsvDragActive.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) {
    showToast("没有检测到可导入的 CSV 文件。");
    return;
  }

  try {
    importCsvBusy.value = true;
    const csvText = await file.text();
    const summary = await window.vtc.importCsvContent(csvText, file.name) as CsvImportSummary;
    await refreshResultData();
    ensureSessionExpanded(summary.sessionId);
    page.value = "history";
    importCsvDialogVisible.value = false;
    showToast(`已导入 CSV：${summary.importedCount} 条记录，来自 ${summary.appCount} 个应用。`);
  } catch (error) {
    notice.value = `导入失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    importCsvBusy.value = false;
  }
}

function addApp(): void {
  config.value.targetApps.push({
    id: `app-${Date.now()}`,
    name: "新应用",
    appFileName: "New App.app",
    websiteUrl: "",
    hotkeyChord: "Cmd + Shift + 1",
    hotkeyTriggerMode: "hold_release",
    hotkeyToAudioDelayMs: 120,
    audioToTriggerStopDelayMs: 160,
    settleWindowMs: 600,
    enabled: false,
    notes: "",
  });
}

function removeApp(appId: string): void {
  const app = config.value.targetApps.find((item) => item.id === appId);
  if (!app) return;
  const confirmed = window.confirm(`确定要删除 ${app.name} 吗？`);
  if (!confirmed) return;
  config.value.targetApps = config.value.targetApps.filter((item) => item.id !== appId);
  if (capturingAppId.value === appId) {
    capturingAppId.value = null;
    capturePreview.value = "";
  }
  notice.value = `已删除 ${app.name}。记得保存设置。`;
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
  if (preRunDialogVisible.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
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
  if (preRunDialogVisible.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
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

function onInputProbeChange(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  inputProbeText.value = target.value;
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

function lockDialogPointerInput(event: MouseEvent): void {
  if (!preRunDialogVisible.value) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest(".dialog-card--countdown")) return;
  event.preventDefault();
  event.stopPropagation();
}

onMounted(async () => {
  try {
    await loadBootstrap();
  } catch (error) {
    notice.value = `初始化失败：${error instanceof Error ? error.message : String(error)}`;
  }
  void refreshEnvironment().catch((error) => {
    notice.value = `环境刷新失败：${error instanceof Error ? error.message : String(error)}`;
  });
  window.addEventListener("keydown", handleGlobalKeydown, true);
  window.addEventListener("keyup", handleGlobalKeyup, true);
  window.addEventListener("mousedown", lockDialogPointerInput, true);
  window.addEventListener("mouseup", lockDialogPointerInput, true);
  window.addEventListener("click", lockDialogPointerInput, true);
  window.addEventListener("resize", measureSampleListViewport);
  void nextTick(measureSampleListViewport);

  window.vtc.onProgress((payload) => {
    progress.value = payload as RunProgress;
    if (progress.value.sessionId || isTerminalPhase(progress.value.phase)) {
      pendingRunStart.value = false;
      showLatestSessionTimeline.value = true;
    }
    maybeShowCompletionDialog();
    if (progress.value.textValue !== undefined) {
      inputProbeText.value = progress.value.textValue;
    }
    const shouldReclaimInputFocus = progress.value.phase === "observing_text"
      || (progress.value.phase === "focus_input" && progress.value.message.includes("回到检测框"));
    if (shouldReclaimInputFocus) {
      void focusInputProbe();
    }
  });

  window.vtc.onResult((payload) => {
    const record = payload as TestRunRecord;
    void refreshResultData(record.id);
  });

  window.vtc.onTimeline((payload) => {
    const record = payload as RunEventRecord;
    if (record.runId.startsWith(PRE_RUN_RUN_ID_PREFIX)) {
      preRunTimelineEvents.value = [...preRunTimelineEvents.value, record];
      lastTimelineRunId.value = record.runId;
      return;
    }
    const nextTimeline = [...(liveTimelineByRunId.value[record.runId] ?? []), record];
    liveTimelineByRunId.value = {
      ...liveTimelineByRunId.value,
      [record.runId]: nextTimeline,
    };
    liveTimelineEvents.value = [...liveTimelineEvents.value, record];
    lastTimelineRunId.value = record.runId;
  });

  window.vtc.onSelfTestText((chunks) => {
    let index = 0;
    const timer = window.setInterval(() => {
      if (index >= chunks.length) {
        window.clearInterval(timer);
        return;
      }
      inputProbeText.value = chunks[index];
      window.vtc.sendInputEvent({
        type: "input",
        tsMs: performance.now(),
        value: chunks[index],
      });
      index += 1;
    }, 120);
  });
});

watch(() => displayedTimeline.value[displayedTimeline.value.length - 1]?.id, async (latestId) => {
  if (!latestId) return;
  await nextTick();
  scrollTimelineToLatest();
});

watch(() => notice.value, (message) => {
  if (!message) {
    clearNoticeTimer();
    return;
  }
  scheduleNoticeDismiss(message);
});

watch(() => progress.value.phase, async (phase, previousPhase) => {
  if (!isTerminalPhase(phase) || !previousPhase || isTerminalPhase(previousPhase) || previousPhase === "idle") {
    return;
  }
  await refreshResultData();
});

watch(() => page.value, async (nextPage) => {
  if (nextPage !== "samples") return;
  await nextTick();
  measureSampleListViewport();
});

watch(() => config.value.audioSamples.length, async () => {
  if (page.value !== "samples") return;
  await nextTick();
  measureSampleListViewport();
});

onBeforeUnmount(() => {
  clearNoticeTimer();
  previewAudioBySampleId.forEach((audio) => audio.pause());
  previewAudioBySampleId.clear();
  window.removeEventListener("resize", measureSampleListViewport);
  window.removeEventListener("keydown", handleGlobalKeydown, true);
  window.removeEventListener("keyup", handleGlobalKeyup, true);
  window.removeEventListener("mousedown", lockDialogPointerInput, true);
  window.removeEventListener("mouseup", lockDialogPointerInput, true);
  window.removeEventListener("click", lockDialogPointerInput, true);
});
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">
          <img :src="brandIconUrl" alt="Logo" class="brand-mark__image" />
        </div>
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
              <span class="nav-label">主控台</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'samples' }" @click="page = 'samples'">
              <HugeiconsIcon :icon="FolderAudioIcon" :size="18" class="nav-icon" />
              <span class="nav-label">样本管理</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'apps' }" @click="page = 'apps'">
              <HugeiconsIcon :icon="AppStoreIcon" :size="18" class="nav-icon" />
              <span class="nav-label">App管理</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'history' }" @click="page = 'history'">
              <HugeiconsIcon :icon="Analytics01Icon" :size="18" class="nav-icon" />
              <span class="nav-label">测试历史</span>
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
              <span class="nav-label">设置</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'checks' }" @click="page = 'checks'">
              <HugeiconsIcon :icon="CheckListIcon" :size="18" class="nav-icon" />
              <span class="nav-label">运行前检查</span>
            </button>
          </li>
          <li>
            <button class="nav-button nav-button-guide" :class="{ active: page === 'intro' }" @click="page = 'intro'">
              <HugeiconsIcon :icon="BookOpen01Icon" :size="18" class="nav-icon" />
              <span class="nav-label">怎么开始</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'faq' }" @click="page = 'faq'">
              <HugeiconsIcon :icon="HelpCircleIcon" :size="18" class="nav-icon" />
              <span class="nav-label">常见问题</span>
            </button>
          </li>
          <li>
            <button class="nav-button" :class="{ active: page === 'about' }" @click="page = 'about'">
              <HugeiconsIcon :icon="InformationCircleIcon" :size="18" class="nav-icon" />
              <span class="nav-label">关于</span>
            </button>
          </li>
        </ul>
        <div class="sidebar-version">
          <strong>{{ appVersion }}</strong>
        </div>
      </div>
    </aside>

    <main class="content">
      <transition name="toast">
        <div v-if="notice" class="notice-toast" :class="`notice-toast--${noticeTone}`" role="status" aria-live="polite">
          {{ notice }}
        </div>
      </transition>

      <header class="topbar">
        <div v-if="page !== 'main'">
          <p class="muted">{{ pageSubtitle }}</p>
          <h2>{{ pageTitle }}</h2>
        </div>
        <div v-if="page === 'main'" class="topbar-main-actions">
          <section class="summary-strip">
            <div class="summary-item">
              <HugeiconsIcon :icon="DashboardSquare01Icon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">已启用应用</span>
              <strong>{{ enabledApps.length }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="FolderAudioIcon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">已启用样本</span>
              <strong>{{ enabledSamples.length }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="Shield01Icon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">辅助功能权限</span>
              <strong>{{ accessibility?.granted ? "已授权" : "未授权" }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="Speaker01Icon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">输出设备</span>
              <strong>{{ selectedDevice?.name || "未选择" }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="Analytics01Icon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">当前进度</span>
              <strong>{{ progress.completedRuns }} / {{ progress.totalRuns }}</strong>
            </div>
          </section>
          <button
            class="action-button"
            :class="running ? 'ghost-button' : 'primary-button'"
            :data-guide-target="running ? undefined : 'run'"
            :disabled="pendingRunStart || preRunDialogVisible"
            @click="running ? stopBatch() : runBatch()"
          >
            <HugeiconsIcon :icon="running ? StopCircleIcon : PlayCircleIcon" :size="18" class="button-icon" />
            <span>{{ running ? "关闭" : (preRunDialogVisible ? "准备中" : "开始") }}</span>
          </button>
        </div>
      </header>


      <template v-if="page === 'main'">
        <div v-if="preflightFailures.length" class="banner">
          <strong>现在还不能运行</strong>
          <ul class="banner-list">
            <li v-for="item in preflightFailures" :key="item.key">
              <strong>{{ item.message }}</strong>
              <span>{{ item.hint || "先处理完这一项，再点开始。" }}</span>
            </li>
          </ul>
        </div>

        <section class="main-grid">
          <div class="stack">
            <article class="panel panel-main panel-apps">
              <div class="panel-header-row">
                <h3>目标App</h3>
                <button class="secondary-button" @click="page = 'apps'">去 App 管理</button>
              </div>
              <ul class="meta-list panel-scroll">
                <li v-for="app in config.targetApps" :key="app.id" class="app-row">
                  <div>
                    <strong>{{ app.name }}</strong>
                    <div class="muted">{{ app.launchCommand?.startsWith("selftest://") ? "内建自测，不依赖真实目标App" : app.appFileName }}</div>
                    <div class="muted">{{ appModeText(app.hotkeyTriggerMode) }}</div>
                  </div>
                  <span class="pill" :class="app.enabled ? 'success' : 'warning'">{{ app.enabled ? "已启用" : "未启用" }}</span>
                </li>
              </ul>
            </article>
          </div>

          <article class="panel panel-main panel-live">
            <div class="panel-header-row">
              <h3>输入检测区</h3>
              <span class="pill" :class="statusTone(progress.phase)">{{ phaseText(progress.phase) }}</span>
            </div>
            <p class="muted">这里是统一的输入检测区。真实目标App和内建自测都会把文本写到这里，方便确认是否命中测试落点，并观察 first char 与最终稳定文本。</p>
            <textarea
              ref="inputProbeTextarea"
              class="live-textarea"
              :value="inputProbeText"
              @input="onInputProbeChange"
              @beforeinput="onBeforeInput"
              @compositionstart="onComposition"
              @compositionend="onComposition"
              @focus="onFocusState"
              @blur="onFocusState"
            />
          </article>

          <article class="panel panel-main panel-timeline">
            <h3>时间线</h3>
            <p class="muted">这里按整轮连续展示所有动作：新应用蓝色，新样本绿色，普通动作白色，失败红色。</p>
            <ul ref="timelineList" class="timeline-list timeline-visual">
              <li v-for="item in timelineCards" :key="item.id" class="timeline-row timeline-card" :class="item.stateClass">
                <div class="timeline-marker">
                  <span class="timeline-dot"></span>
                </div>
                <div class="timeline-body">
                  <div class="timeline-topline">
                    <span class="pill mono">{{ item.timestampLabel }}</span>
                    <strong>{{ item.title }}</strong>
                  </div>
                  <div class="timeline-detail">{{ item.detail }}</div>
                </div>
              </li>
              <li v-if="!timelineCards.length" class="timeline-row timeline-card timeline-neutral">
                <div class="timeline-marker">
                  <span class="timeline-dot"></span>
                </div>
                <div>
                  <strong>还没有时间线</strong>
                  <div class="muted">开始之后，这里会显示关键事件。</div>
                </div>
              </li>
            </ul>
          </article>
        </section>

        <section class="result-stack">
          <article class="panel">
            <template v-if="mainSessionGroup">
              <div class="detail-headline">
                <strong>测试统计 {{ formatSessionTimestamp(mainSessionGroup.displayTime) }}</strong>
                <span class="pill">{{ sessionStatusText(mainSessionGroup.session.status) }}</span>
              </div>
              <div class="app-summary-stack">
                <section v-for="appSummary in mainSessionAppStats" :key="appSummary.appName" class="app-summary-block">
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
        </section>

      </template>

      <section v-else-if="page === 'checks'" class="stack">
        <article class="panel" data-guide-target="samples">
          <div class="panel-header-row">
            <div>
              <h3>运行前检查</h3>
              <p class="muted">这里只看当前能不能跑，以及具体卡在哪一项。</p>
            </div>
            <button class="ghost-button" @click="inspectRunReadiness">刷新</button>
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
                <div class="muted">点右上角“刷新”，立即开始检测当前配置。</div>
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
              <h3>样本管理</h3>
              <p class="muted">集中查看样本目录、扫描结果和启用状态。</p>
            </div>
            <strong>{{ config.sampleRoot || "未选择目录" }}</strong>
            <div class="toolbar">
              <button class="ghost-button" @click="chooseSampleRoot">选择目录</button>
              <button class="secondary-button" @click="rescanSamples">重新扫描</button>
            </div>
          </div>
        </article>

        <article class="panel">
          <section class="summary-strip summary-strip--samples">
            <div class="summary-item">
              <HugeiconsIcon :icon="FolderAudioIcon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">启用</span>
              <strong>{{ enabledSamples.length }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="FolderAudioIcon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">关闭</span>
              <strong>{{ disabledSamples.length }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="Analytics01Icon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">总共</span>
              <strong>{{ config.audioSamples.length }}</strong>
            </div>
            <label v-if="config.audioSamples.length" class="switch-row sample-global-toggle">
              <span class="sample-global-toggle__label">全选</span>
              <input
                :checked="allSamplesEnabled"
                type="checkbox"
                @change="toggleAllSamples"
              />
            </label>
          </section>
          <div
            v-if="config.audioSamples.length"
            ref="sampleListViewport"
            class="sample-list-viewport"
            @scroll="onSampleListScroll"
          >
            <div class="sample-list-clean">
            <div v-if="sampleListTopSpacerHeight > 0" class="sample-list-spacer" :style="{ height: `${sampleListTopSpacerHeight}px` }" />
            <div
              v-for="(sample, offset) in visibleSamples"
              :key="sample.id"
              class="sample-row-clean"
              @mouseenter="onSampleRowEnter(sample.id)"
              @mouseleave="onSampleRowLeave(sample.id)"
            >
              <div class="sample-row-index">{{ sampleListStartIndex + offset + 1 }}、</div>
              <div class="sample-row-main">
                <span class="sample-row-path">{{ sample.relativePath }}</span>
                <div
                  v-if="shouldRenderSamplePreview(sample.id)"
                  class="sample-preview"
                  :class="{ 'sample-preview--active': previewPlayingSampleId === sample.id }"
                  :data-sample-preview-id="sample.id"
                >
                  <button
                    class="sample-preview__button"
                    type="button"
                    :aria-label="previewPlayingSampleId === sample.id ? '暂停预览' : '播放预览'"
                    :title="previewPlayingSampleId === sample.id ? '暂停' : '播放'"
                    @click="toggleSamplePreview(sample)"
                  >
                    <HugeiconsIcon :icon="previewPlayingSampleId === sample.id ? StopIcon : PlayIcon" :size="14" />
                  </button>
                  <input
                    class="sample-preview__slider"
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    :value="previewProgress[sample.id] ?? 0"
                    :style="previewSliderStyle(sample.id)"
                    @input="seekSamplePreview(sample.id, $event)"
                  />
                  <span class="sample-preview__time">{{ formatPreviewTime(previewCurrentTime[sample.id]) }} / {{ formatPreviewTime(getSamplePreviewDuration(sample.id, sample.durationMs)) }}</span>
                  <span class="sample-preview__duration">{{ formatPreviewTime(getSamplePreviewDuration(sample.id, sample.durationMs)) }}</span>
                  <audio
                    preload="none"
                    :ref="(el) => registerPreviewAudio(sample.id, el as HTMLAudioElement | null)"
                    @loadedmetadata="syncPreviewAudioState(sample.id)"
                    @timeupdate="syncPreviewAudioState(sample.id)"
                    @pause="onSamplePreviewPause(sample.id)"
                    @play="previewPlayingSampleId = sample.id"
                    @ended="onSamplePreviewEnded(sample.id)"
                  />
                </div>
                <span v-else class="sample-preview__duration">{{ formatPreviewTime(getSamplePreviewDuration(sample.id, sample.durationMs)) }}</span>
              </div>
              <div class="sample-row-actions">
                <span class="pill" :class="sample.enabled ? 'success' : 'warning'">{{ sample.enabled ? "启用" : "关闭" }}</span>
                <label class="switch-row sample-switch-row">
                  <input
                    :checked="sample.enabled"
                    type="checkbox"
                    @change="onSampleToggle(sample.id, $event)"
                  />
                </label>
              </div>
            </div>
            <div v-if="sampleListBottomSpacerHeight > 0" class="sample-list-spacer" :style="{ height: `${sampleListBottomSpacerHeight}px` }" />
            </div>
          </div>
          <div v-else class="muted">还没有样本。</div>
        </article>
      </section>

      <section v-else-if="page === 'history'" class="result-stack">
        <article class="panel">
          <div class="panel-header-row history-page-header">
            <div>
              <h3>历史列表</h3>
              <p class="muted">支持导出每轮结果，也支持把外部 CSV 补录成历史测试记录。</p>
            </div>
            <button class="history-import-link" @click="openImportCsvDialog">导入CSV</button>
          </div>
          <div class="session-stack">
            <article v-for="group in resultSessionGroups" :key="group.session.id" class="session-card">
              <div class="session-header">
                <button class="session-toggle" @click="toggleSession(group.session.id)">
                  <strong>{{ formatSessionTime(group.displayTime) }}</strong>
                  <span v-if="sessionAppLabel(group.appGroups)" class="session-app-name">
                    {{ sessionAppLabel(group.appGroups) }}
                  </span>
                  <span v-if="sessionAppVersionText(group.appGroups)" class="session-app-version">
                    {{ sessionAppVersionText(group.appGroups) }}
                  </span>
                  <div
                    class="muted session-summary"
                    :class="{ 'session-summary--danger': group.session.failedCount > 0 }"
                  >
                    {{ sessionStatusText(group.session.status) }}
                    · 共 {{ group.session.runCount }} 条
                    · 成功 {{ group.session.successCount }}
                    · 失败 {{ group.session.failedCount }}
                    · 取消 {{ group.session.cancelledCount }}
                  </div>
                  <span class="pill">{{ isSessionExpanded(group.session.id) ? "收起" : "展开" }}</span>
                </button>
                <button
                  class="history-export-button"
                  aria-label="导出本轮 CSV"
                  data-tooltip="导出本轮 CSV"
                  @click="exportCsv(group.session.id)"
                >
                  <HugeiconsIcon :icon="FileExportIcon" :size="14" class="button-icon" />
                </button>
              </div>

              <div v-if="isSessionExpanded(group.session.id)" class="app-group-stack">
                <section v-for="appGroup in group.appGroups" :key="`${group.session.id}-${appGroup.appName}`" class="app-group-card">
                  <div v-if="group.appGroups.length > 1" class="app-group-header">
                    <div class="app-group-title">
                      <strong>{{ appGroup.appName }}</strong>
                      <span v-if="appGroupVersionText(appGroup)" class="history-app-version">{{ appGroupVersionText(appGroup) }}</span>
                    </div>
                    <div class="muted">
                      共 {{ appGroup.runs.length }} 条
                      · 成功 {{ appGroup.successCount }}
                      · 失败 {{ appGroup.failedCount }}
                      · 取消 {{ appGroup.cancelledCount }}
                    </div>
                  </div>

                  <table class="result-table">
                    <colgroup>
                      <col style="width: 60%" />
                      <col style="width: 6%" />
                      <col style="width: 8%" />
                      <col style="width: 8%" />
                      <col style="width: 8%" />
                      <col style="width: 5%" />
                      <col style="width: 5%" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>样本</th>
                        <th>状态</th>
                        <th>首字ms</th>
                        <th>定稿ms</th>
                        <th>长度</th>
                        <th>重试</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="result in appGroup.runs"
                        :key="result.id"
                      >
                        <td class="history-sample-cell">
                          <div class="history-sample-main">
                            <span
                              class="history-sample-tooltip"
                              tabindex="0"
                              :data-tooltip="historyResultTooltip(result)"
                            ><span class="history-sample-text">{{ result.samplePath }}</span></span>
                            <div v-if="result.appVersion" class="history-app-version">v{{ result.appVersion.replace(/^v/i, '') }}</div>
                          </div>
                        </td>
                        <td class="history-status-cell">
                          <div class="history-status-wrap">
                            <span class="pill" :class="statusTone(result.status)">{{ resultStatusText(result.status) }}</span>
                          </div>
                        </td>
                        <td>{{ formatLatencyMs(result.triggerStopToFirstCharMs) }}</td>
                        <td>{{ formatLatencyMs(result.triggerStopToFinalTextMs) }}</td>
                        <td>{{ result.finalTextLength }}</td>
                        <td>{{ result.retryCount ?? 0 }}</td>
                        <td class="history-action-cell">
                          <button
                            class="history-retry-button"
                            :disabled="running || pendingRunStart || preRunDialogVisible"
                            aria-label="重新测试"
                            data-tooltip="重新测试"
                            @click.stop="retryHistoryResult(result)"
                          >
                            <HugeiconsIcon :icon="ReloadIcon" :size="14" class="button-icon" />
                          </button>
                        </td>
                      </tr>
                      <tr v-if="!appGroup.runs.length">
                        <td colspan="7">这个应用在本轮还没有结果。</td>
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

      <section v-else-if="page === 'apps'" class="settings-page apps-page">
        <article class="panel apps-page__panel">
          <div class="panel-header-row apps-page__header">
            <div>
              <h3>目标App</h3>
              <p class="muted">把真实目标 App 和内建自测都收在一个清爽的配置面板里，先启用再去跑批量测试。</p>
            </div>
            <div class="toolbar">
              <button class="ghost-button" @click="refreshInstalledAppInfo">刷新安装信息</button>
              <button class="secondary-button" @click="addApp">新增应用</button>
              <button class="secondary-button" @click="saveSettings">保存设置</button>
            </div>
          </div>

          <section class="summary-strip summary-strip--apps">
            <div class="summary-item">
              <HugeiconsIcon :icon="AppStoreIcon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">目标总数</span>
              <strong>{{ config.targetApps.length }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="PlayCircleIcon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">已启用</span>
              <strong>{{ enabledApps.length }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="DashboardSquare01Icon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">真实 App</span>
              <strong>{{ enabledRealApps.length }} / {{ realApps.length }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="CheckListIcon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">已安装真实 App</span>
              <strong>{{ installedRealApps.length }} / {{ realApps.length }}</strong>
            </div>
            <div class="summary-item">
              <HugeiconsIcon :icon="CheckListIcon" :size="16" class="summary-inline-icon" />
              <span class="summary-label">内建自测</span>
              <strong>{{ builtinApps.length ? (builtinApps[0]?.enabled ? "已启用" : "未启用") : "未配置" }}</strong>
            </div>
          </section>

          <div class="app-editor-list">
            <div
              v-for="app in config.targetApps"
              :key="app.id"
              class="app-editor-card"
              :class="{ 'app-editor-card--builtin': isBuiltinApp(app) }"
              :data-guide-target="app.enabled ? 'apps' : undefined"
            >
              <div class="app-editor-card__top">
                <div class="app-editor-card__headline">
                  <div class="app-editor-card__title-row">
                    <strong>{{ app.name }}</strong>
                    <button
                      v-if="app.websiteUrl"
                      type="button"
                      class="app-title-link"
                      :title="`打开 ${app.name} 官网`"
                      @click="openAppWebsite(app)"
                    >
                      官网
                    </button>
                  </div>
                  <span v-if="appVersionLabel(app)" class="app-editor-card__version">{{ appVersionLabel(app) }}</span>
                  <div class="app-editor-card__badges">
                    <span class="pill" :class="isBuiltinApp(app) ? 'warning' : ''">{{ appKindLabel(app) }}</span>
                    <span class="pill" :class="app.enabled ? 'success' : 'warning'">{{ appStatusLabel(app) }}</span>
                  </div>
                </div>
                <div class="toolbar app-editor-card__actions">
                  <label class="switch-row">
                    <span>启用</span>
                    <input v-model="app.enabled" type="checkbox" />
                  </label>
                  <button
                    class="ghost-button icon-only-button"
                    :aria-label="`删除 ${app.name}`"
                    :title="`删除 ${app.name}`"
                    @click="removeApp(app.id)"
                  >
                    <HugeiconsIcon :icon="Delete02Icon" :size="18" class="button-icon" />
                  </button>
                </div>
              </div>

              <div class="app-editor-card__summary">
                <span class="muted">热键 {{ app.hotkeyChord || "未设置" }}</span>
                <span class="muted">·</span>
                <span class="muted">{{ appModeText(app.hotkeyTriggerMode) }}</span>
                <span class="muted">·</span>
                <span class="muted">启动目标：{{ appLaunchSummary(app) }}</span>
              </div>

              <div class="settings-grid app-editor-form">
                <label class="app-form-row">
                  <span class="app-form-label">名称 <em class="required-mark">*</em></span>
                  <input v-model="app.name" />
                </label>
                <label class="app-form-row">
                  <span class="app-form-label">.app 文件名 <em class="required-mark">*</em></span>
                  <input v-model="app.appFileName" :disabled="isBuiltinApp(app)" />
                </label>
                <label class="app-form-row">
                  <span class="app-form-label">官网链接</span>
                  <input v-model="app.websiteUrl" placeholder="https://example.com" />
                </label>
                <label class="app-form-row app-form-row--wide" style="grid-column: 1 / -1">
                  <span class="app-form-label">启动命令</span>
                  <input v-model="app.launchCommand" placeholder="留空时按 .app 文件名去找" />
                </label>
                <label class="app-form-row app-form-row--wide" :data-guide-target="app.enabled ? 'hotkey' : undefined" style="grid-column: 1 / -1">
                  <span class="app-form-label">热键 <em class="required-mark">*</em></span>
                  <div class="inline-field inline-field--triple">
                    <input :value="app.hotkeyChord" readonly />
                    <button class="ghost-button" @click="beginHotkeyCapture(app.id)">{{ hotkeyButtonText(app.id, app.hotkeyChord) }}</button>
                    <button class="ghost-button" @click="setHotkeyForApp(app.id, 'Fn')">设为 Fn</button>
                  </div>
                  <div class="muted">macOS 上物理 Fn 常常不会被 Electron 上报。录不到时，直接点右边这个“设为 Fn”。</div>
                </label>
                <label class="app-form-row compact-field">
                  <span class="app-form-label">触发方式 <em class="required-mark">*</em></span>
                  <select v-model="app.hotkeyTriggerMode" class="compact-select">
                    <option value="hold_release">按住并保持，松开结束</option>
                    <option value="press_start_press_stop">按下抬起开始，再按下抬起结束</option>
                  </select>
                </label>
                <label class="app-form-row app-form-row--wide" style="grid-column: 1 / -1">
                  <span class="app-form-label">备注</span>
                  <textarea v-model="app.notes" rows="2" placeholder="例如：先关闭“语音输入时静音”，或者需要登录后再触发。" />
                </label>
              </div>
            </div>
          </div>
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

      <section v-else-if="page === 'intro'" class="panel intro-panel">
        <h3>怎么开始</h3>
        <p class="muted">先按这个顺序走。</p>
        <div class="intro-steps">
          <button class="intro-step" @click="jumpToGuideTarget('apps')">
            <strong>1）添加 app</strong>
            <span>去 App 管理页添加或启用目标App。</span>
          </button>
          <button class="intro-step" @click="jumpToGuideTarget('hotkey')">
            <strong>2）热键</strong>
            <span>录入热键，并确认触发方式。</span>
          </button>
          <button class="intro-step" @click="jumpToGuideTarget('samples')">
            <strong>3）样本添加</strong>
            <span>选择样本目录，确认样本已启用。</span>
          </button>
          <button class="intro-step" @click="jumpToGuideTarget('run')">
            <strong>4）开始</strong>
            <span>回到主控台，点击开始。</span>
          </button>
        </div>
      </section>

      <section v-else-if="page === 'faq'" class="stack faq-page">
        <article class="panel faq-hero">
          <div>
            <h3>测试时没听到扬声器声音，先看这里</h3>
            <p class="muted">有些语音输入 App 会在听写开始时自动把其他活动音频静音。如果测试时听不到扬声器的声音，不一定是输出设备坏了，也可能是目标 App 自己把声音压掉了。</p>
          </div>
          <div class="pill warning">常见于语音输入类 App</div>
        </article>

        <article class="panel faq-card">
          <div class="faq-card__copy">
            <div class="faq-eyebrow">常见问题 01</div>
            <h3>为什么开始测试后，扬声器没声音了？</h3>
            <p>先检查对应 voice-typing App 里是否打开了类似 <strong>“语音输入时静音”</strong> 的选项。</p>
            <p class="muted">例如 Typeless 这类 App 可能会在语音输入时自动静音其他活动音频。这样一来，测试音频虽然已经发出播放指令，但你主观上会觉得“扬声器没声音”。</p>
            <div class="faq-callout">
              <strong>排查建议</strong>
              <p>如果这轮测试没有听到喇叭出声，先去目标 App 的设置页找这一类开关，临时关闭后再重新跑一轮。</p>
            </div>
          </div>
          <figure class="faq-shot">
            <img :src="muteDuringDictationImageUrl" alt="语音输入时静音设置示意图" />
            <figcaption>示意图：开启后，语音输入时会自动静音其他活动音频。</figcaption>
          </figure>
        </article>
      </section>

      <VersionNotesPanel v-else :version-label="appVersion" />

      <div v-if="preRunDialogVisible" class="dialog-backdrop dialog-backdrop--countdown">
        <div class="dialog-card dialog-card--countdown" role="dialog" aria-modal="true" aria-labelledby="pre-run-dialog-title">
          <div class="countdown-orb countdown-orb--confirm">
            <span>!</span>
            <small>等待确认</small>
          </div>
          <div class="dialog-hero dialog-hero--countdown">
            <div class="dialog-hero-copy">
              <span class="dialog-kicker">开始前提示</span>
              <h3 id="pre-run-dialog-title">开始后请不要操作鼠标和键盘</h3>
              <p>点击按钮后会立即开始正式测试。</p>
            </div>
          </div>
          <div class="dialog-actions">
            <button class="ghost-button" @click="cancelPreRunDialog">还没准备好</button>
            <button class="primary-button" @click="confirmPreRunDialog">我已准备好，开始测试</button>
          </div>
        </div>
      </div>

      <div v-if="completionDialogVisible && completedDialogSummary" class="dialog-backdrop" @click.self="completionDialogVisible = false">
        <div class="dialog-card">
          <div class="dialog-hero">
            <div class="dialog-hero-copy">
              <span class="dialog-kicker">Batch Finished</span>
              <h3>已结束</h3>
              <p>结果已经落库，可以继续看明细，或者直接再次开始。</p>
            </div>
            <div class="dialog-status-badge">
              <span class="pill">{{ completedDialogSummary.status }}</span>
            </div>
          </div>
          <div class="dialog-stat-grid">
            <div class="dialog-stat-card">
              <span class="dialog-stat-label">应用数</span>
              <strong>{{ completedDialogSummary.appCount }}</strong>
            </div>
            <div class="dialog-stat-card">
              <span class="dialog-stat-label">样本数</span>
              <strong>{{ completedDialogSummary.sampleCount }}</strong>
            </div>
            <div class="dialog-stat-card">
              <span class="dialog-stat-label">总耗时</span>
              <strong>{{ completedDialogSummary.elapsed }}</strong>
            </div>
          </div>
          <div class="dialog-actions">
            <button class="ghost-button" @click="page = 'main'; completionDialogVisible = false">回主控台</button>
            <button class="primary-button" @click="completionDialogVisible = false">知道了</button>
          </div>
        </div>
      </div>

      <div v-if="importCsvDialogVisible" class="dialog-backdrop" @click.self="closeImportCsvDialog()">
        <div class="dialog-card import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-csv-dialog-title">
          <div class="dialog-hero">
            <div class="dialog-hero-copy">
              <span class="dialog-kicker">CSV Import</span>
              <h3 id="import-csv-dialog-title">导入外部测试结果</h3>
              <p>把导出的结果 CSV 拖进来，系统会补录成一轮新的历史测试记录。</p>
            </div>
          </div>
          <button
            class="import-dropzone"
            :class="{ 'import-dropzone--active': importCsvDragActive, 'import-dropzone--busy': importCsvBusy }"
            :disabled="importCsvBusy"
            @dragenter="handleImportCsvDragEnter"
            @dragover="handleImportCsvDragOver"
            @dragleave="handleImportCsvDragLeave"
            @drop="handleImportCsvDrop"
            @click="chooseImportCsvFile"
          >
            <strong>{{ importCsvBusy ? "正在导入..." : "拖拽 CSV 到这里" }}</strong>
            <span>{{ importCsvBusy ? "请稍候，不要关闭窗口。" : "或者点击这里选择一个 .csv 文件" }}</span>
          </button>
          <div class="dialog-actions">
            <button class="ghost-button" :disabled="importCsvBusy" @click="closeImportCsvDialog()">取消</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
