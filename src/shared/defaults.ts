import type { AppConfig, AudioDevice, PermissionSnapshot } from "./types";
import { defaultTargetApps } from "./target-app-presets";

export const defaultPermissions = (): PermissionSnapshot[] => [
  { id: "accessibility", name: "Accessibility", required: true, granted: false },
  { id: "automation", name: "Automation", required: false, granted: false },
  { id: "input-monitoring", name: "Input Monitoring", required: false, granted: false },
];

export const defaultDevices = (): AudioDevice[] => [
  { id: "system-default", name: "System Default", available: true, isDefault: true },
];

export const defaultConfig = (): AppConfig => {
  return {
    locale: "zh",
    theme: "light",
    workspaceLabel: "Contest Lab",
    sampleRoot: "",
    databasePath: "~/Library/Application Support/vtc/voice-typing-contest.sqlite",
    logFolder: "~/Library/Logs/vtc",
    helperPathOverride: "",
    selectedOutputDeviceId: "system-default",
    appLaunchDelayMs: 5000,
    focusInputDelayMs: 2000,
    resultTimeoutMs: 5000,
    resourceSampleIntervalMs: 1000,
    betweenSamplesDelayMs: 3000,
    closeAppDelayMs: 3000,
    runNotes: "默认先用内建自测确认流程正常，再去接真实目标App。",
    targetApps: defaultTargetApps(),
    audioSamples: [
      {
        id: "builtin-zh-01",
        filePath: "__builtin__/selftest-zh-01.wav",
        relativePath: "内建自测/中文-01.wav",
        displayName: "中文-01.wav",
        expectedText: "这是第一条内建自测文本，用来确认运行流程是通的。",
        language: "zh",
        durationMs: 850,
        tags: ["builtin", "selftest", "zh"],
        enabled: true,
      },
      {
        id: "builtin-en-01",
        filePath: "__builtin__/selftest-en-01.wav",
        relativePath: "内建自测/english-01.wav",
        displayName: "english-01.wav",
        expectedText: "This is the built in self test sentence for the run flow.",
        language: "en",
        durationMs: 760,
        tags: ["builtin", "selftest", "en"],
        enabled: true,
      },
    ],
  };
};

export const translations = {
  zh: {
    appTitle: "Voice Typing Contest",
    run: "开始",
    stop: "停止",
    save: "保存设置",
    settings: "设置",
    close: "关闭",
    main: "主控台",
    intro: "说明",
    about: "关于",
    ready: "已就绪",
    blocked: "阻塞",
    granted: "已授权",
    missing: "缺失",
    exportCsv: "导出 CSV",
    refresh: "刷新",
    rescan: "重新扫描",
    noResults: "还没有结果。",
    livePlaceholder: "运行时输入会出现在这里。",
  },
  en: {
    appTitle: "Voice Typing Contest",
    run: "Run",
    stop: "Stop",
    save: "Save Settings",
    settings: "Settings",
    close: "Close",
    main: "Main",
    intro: "Intro",
    about: "About",
    ready: "Ready",
    blocked: "Blocked",
    granted: "Granted",
    missing: "Missing",
    exportCsv: "Export CSV",
    refresh: "Refresh",
    rescan: "Rescan",
    noResults: "No results yet.",
    livePlaceholder: "Observed input will appear here during runs.",
  },
} as const;
