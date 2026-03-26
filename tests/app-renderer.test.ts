// @vitest-environment jsdom

import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/renderer/App.vue";
import { defaultConfig, defaultDevices, defaultPermissions } from "../src/shared/defaults";
import type { InstalledTargetAppInfo, PreflightReport, RunSessionSummary, SettingsPayload, TestRunRecord } from "../src/shared/types";

type Handler = (payload: unknown) => void;

function makeSettings(): SettingsPayload {
  return {
    ...defaultConfig(),
    permissions: [
      { id: "accessibility", name: "Accessibility", required: true, granted: true },
      ...defaultPermissions().filter((item) => item.id !== "accessibility"),
    ],
    devices: defaultDevices(),
  };
}

function makeSessions(): RunSessionSummary[] {
  return [
    {
      id: "session-1",
      startedAt: "2026-03-23T10:00:00.000Z",
      finishedAt: "2026-03-23T10:02:00.000Z",
      status: "completed",
      runCount: 2,
      successCount: 1,
      failedCount: 1,
      cancelledCount: 0,
    },
  ];
}

function setupDesktopApi(options?: {
  startRunResult?: PreflightReport;
}) {
  const settings = makeSettings();
  const sessions = makeSessions();
  const handlers: Record<string, Handler | undefined> = {};
  const installedInfo: InstalledTargetAppInfo[] = settings.targetApps.map((app) => ({
    profileId: app.id,
    installed: false,
    isBuiltin: Boolean(app.launchCommand?.startsWith("selftest://")),
  }));
  const api = {
    getVersion: vi.fn(async () => "0.1.6"),
    getSettings: vi.fn(async (): Promise<SettingsPayload> => settings),
    saveSettings: vi.fn(async () => ({ ok: true })),
    pickSampleRoot: vi.fn(async () => undefined),
    rescanSamples: vi.fn(async () => settings.audioSamples),
    pickDatabasePath: vi.fn(async () => undefined),
    refreshPermissions: vi.fn(async () => ({ permissions: settings.permissions, devices: settings.devices })),
    requestAccessibilityPermission: vi.fn(async () => ({ permissions: settings.permissions, devices: settings.devices })),
    openPermissionSettings: vi.fn(async () => ({ ok: true })),
    openExternalUrl: vi.fn(async () => ({ ok: true })),
    getInstalledAppInfo: vi.fn(async () => installedInfo),
    focusBenchmarkWindow: vi.fn(async () => ({ ok: true })),
    startRun: vi.fn(async () => options?.startRunResult ?? {
      ok: true,
      items: [],
      permissions: settings.permissions,
      devices: settings.devices,
    }),
    emitRunTimelineEvent: vi.fn(async () => ({ ok: true })),
    stopRun: vi.fn(async () => undefined),
    listResults: vi.fn(async (): Promise<TestRunRecord[]> => []),
    listResultSessions: vi.fn(async (): Promise<RunSessionSummary[]> => sessions),
    getResultDetail: vi.fn(async () => undefined),
    exportBundle: vi.fn(async () => undefined),
    pickImportCsv: vi.fn(async () => undefined),
    importCsv: vi.fn(async () => ({
      sessionId: "import-session-1",
      importedCount: 2,
      appCount: 1,
      startedAt: "2026-03-23T10:00:00.000Z",
      finishedAt: "2026-03-23T10:01:00.000Z",
      sourcePath: "/tmp/import.csv",
    })),
    importCsvContent: vi.fn(async () => ({
      sessionId: "import-session-1",
      importedCount: 2,
      appCount: 1,
      startedAt: "2026-03-23T10:00:00.000Z",
      finishedAt: "2026-03-23T10:01:00.000Z",
      sourcePath: "import.csv",
    })),
    sendInputEvent: vi.fn(),
    onProgress: vi.fn((handler: Handler) => {
      handlers.progress = handler;
    }),
    onResult: vi.fn((handler: Handler) => {
      handlers.result = handler;
    }),
    onTimeline: vi.fn((handler: Handler) => {
      handlers.timeline = handler;
    }),
    onSelfTestText: vi.fn((handler: Handler) => {
      handlers.selftest = handler;
    }),
  };

  Object.defineProperty(window, "vtc", {
    value: api,
    configurable: true,
    writable: true,
  });

  return { api, handlers, settings, sessions };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App renderer", () => {
  it("renders Chinese primary path with built-in self-test enabled", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();
    expect(wrapper.text()).toContain("开始");
    expect(wrapper.text()).toContain("运行前检查");
    expect(wrapper.text()).toContain("样本");
    expect(wrapper.text()).toContain("测试历史");
    expect(wrapper.text()).toContain("内建自测");
  });

  it("keeps App management directly below sample management in the upper navigation group", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const navGroups = wrapper.findAll(".sidebar .nav-list");
    expect(navGroups).toHaveLength(2);

    const topNavItems = navGroups[0].findAll("button.nav-button").map((item) => item.text());
    const lowerNavItems = navGroups[1].findAll("button.nav-button").map((item) => item.text());

    expect(topNavItems).toContain("App管理");
    expect(lowerNavItems).not.toContain("App管理");
    expect(topNavItems.indexOf("App管理")).toBe(topNavItems.indexOf("样本管理") + 1);
  });

  it("keeps sidebar nav labels on one line", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const sampleButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "样本管理");
    expect(sampleButton).toBeTruthy();
    expect(sampleButton!.find(".nav-label").exists()).toBe(true);
    expect(sampleButton!.find(".nav-label").text()).toBe("样本管理");
  });

  it("shows preflight in the lower navigation group directly below settings", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const navGroups = wrapper.findAll(".sidebar .nav-list");
    expect(navGroups).toHaveLength(2);

    const topNavItems = navGroups[0].findAll("button.nav-button").map((item) => item.text());
    const lowerNavItems = navGroups[1].findAll("button.nav-button").map((item) => item.text());

    expect(topNavItems).not.toContain("运行前检查");
    expect(lowerNavItems).toContain("运行前检查");
    expect(lowerNavItems.indexOf("运行前检查")).toBe(lowerNavItems.indexOf("设置") + 1);
  });

  it("lets the user choose an output device in settings", async () => {
    const { settings } = setupDesktopApi();
    settings.devices = [
      { id: "system-default", name: "System Default", available: true, isDefault: true },
      { id: "BlackHole 2ch", name: "BlackHole 2ch", available: true, isDefault: false },
    ];
    const wrapper = mount(App);
    await flushPromises();
    const settingsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "设置");
    expect(settingsButton).toBeTruthy();
    await settingsButton!.trigger("click");
    await flushPromises();

    const select = wrapper.findAll("select").find((item) => item.element instanceof HTMLSelectElement && (item.element as HTMLSelectElement).value === "system-default");
    expect(select).toBeTruthy();
    await select!.setValue("BlackHole 2ch");

    expect((select!.element as HTMLSelectElement).value).toBe("BlackHole 2ch");
    expect(wrapper.text()).toContain("当前选择");
  });

  it("lets the user disable one sample and shows enabled and disabled counts", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const sampleButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "样本管理");
    expect(sampleButton).toBeTruthy();
    await sampleButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("启用");
    expect(wrapper.text()).toContain("关闭");
    expect(wrapper.text()).toContain("总共");

    const sampleToggles = wrapper.findAll('input[type="checkbox"]');
    expect(sampleToggles).toHaveLength(3);

    await sampleToggles[1].setValue(false);
    await flushPromises();

    const toggles = wrapper.findAll('input[type="checkbox"]').map((item) => (item.element as HTMLInputElement).checked);
    expect(toggles).toEqual([false, false, true]);

    const text = wrapper.text().replace(/\s+/g, "");
    expect(text).toContain("启用1");
    expect(text).toContain("关闭1");
    expect(text).toContain("总共2");
  });

  it("auto-dismisses toast notices after a short delay", async () => {
    vi.useFakeTimers();
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const sampleButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "样本管理");
    expect(sampleButton).toBeTruthy();
    await sampleButton!.trigger("click");
    await flushPromises();

    const sampleToggles = wrapper.findAll('input[type="checkbox"]');
    await sampleToggles[1].setValue(false);
    await flushPromises();

    expect(wrapper.find(".notice-toast").exists()).toBe(true);
    vi.advanceTimersByTime(2600);
    await flushPromises();
    expect(wrapper.find(".notice-toast").exists()).toBe(false);
    vi.useRealTimers();
  });

  it("shows preflight failure hints in Chinese after clicking run", async () => {
    const startRunResult: PreflightReport = {
      ok: false,
      permissions: defaultPermissions(),
      devices: defaultDevices(),
      items: [
        {
          key: "accessibility",
          ok: false,
          message: "缺少辅助功能权限",
          category: "permission_denied_accessibility",
          hint: "先到系统设置里给这个应用打开辅助功能权限，再回来点开始。",
        },
      ],
    };
    const { api } = setupDesktopApi({ startRunResult });
    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get("button.primary-button").trigger("click");
    await flushPromises();
    expect(api.startRun).not.toHaveBeenCalled();
    await wrapper.get(".dialog-card--countdown .primary-button").trigger("click");
    await flushPromises();
    expect(api.startRun).toHaveBeenCalled();
    expect(wrapper.text()).toContain("现在还不能运行");
    expect(wrapper.text()).toContain("缺少辅助功能权限");
    expect(wrapper.text()).toContain("先到系统设置里给这个应用打开辅助功能权限");
  });

  it("sends close IPC from the close button while running", async () => {
    const { api, handlers } = setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    handlers.progress?.({
      phase: "audio_playing",
      textValue: "",
      message: "正在播放音频",
      completedRuns: 0,
      totalRuns: 2,
    });
    await flushPromises();

    const closeButton = wrapper.findAll("button").find((item) => item.text() === "关闭");
    expect(closeButton).toBeTruthy();
    expect(closeButton!.attributes("disabled")).toBeUndefined();
    await closeButton!.trigger("click");
    await flushPromises();

    expect(api.stopRun).toHaveBeenCalled();
  });

  it("keeps the close button active between samples instead of flipping back to start", async () => {
    const { handlers } = setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    handlers.progress?.({
      phase: "between_samples_wait",
      textValue: "partial result",
      message: "当前样本已完成，准备下一条",
      completedRuns: 1,
      totalRuns: 2,
    });
    await flushPromises();

    const closeButton = wrapper.findAll("button").find((item) => item.text() === "关闭");
    expect(closeButton).toBeTruthy();
    expect(wrapper.text()).not.toContain("当前阶段:完成");
  });

  it("captures hotkey by pressing real key combo after clicking record", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();
    const appsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "App管理");
    expect(appsButton).toBeTruthy();
    await appsButton!.trigger("click");
    await flushPromises();

    const recordButton = wrapper.findAll("button.ghost-button").find((item) => item.text().includes("Cmd") || item.text().includes("点击录制"));
    expect(recordButton).toBeTruthy();
    await recordButton!.trigger("click");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", metaKey: true, shiftKey: true, bubbles: true }));
    await flushPromises();

    const hotkeyInputs = wrapper.findAll("input").filter((item) => item.attributes("readonly") !== undefined);
    expect(hotkeyInputs.some((item) => item.element.value.includes("Cmd + Shift + 1"))).toBe(true);
    expect(wrapper.text()).toContain("已录入");
  });

  it("captures Fn as a modifier when recording hotkeys", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();
    const appsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "App管理");
    expect(appsButton).toBeTruthy();
    await appsButton!.trigger("click");
    await flushPromises();

    const recordButton = wrapper.findAll("button.ghost-button").find((item) => item.text().includes("Cmd") || item.text().includes("点击录制"));
    expect(recordButton).toBeTruthy();
    await recordButton!.trigger("click");

    const event = new KeyboardEvent("keydown", { key: "1", bubbles: true });
    Object.defineProperty(event, "getModifierState", {
      value: (key: string) => key === "Fn",
    });
    window.dispatchEvent(event);
    await flushPromises();

    const hotkeyInputs = wrapper.findAll("input").filter((item) => item.attributes("readonly") !== undefined);
    expect(hotkeyInputs.some((item) => item.element.value.includes("Fn + 1"))).toBe(true);
    expect(wrapper.text()).toContain("已录入");
  });

  it("captures standalone Fn when released without a main key", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();
    const appsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "App管理");
    expect(appsButton).toBeTruthy();
    await appsButton!.trigger("click");
    await flushPromises();

    const recordButton = wrapper.findAll("button.ghost-button").find((item) => item.text().includes("Cmd") || item.text().includes("点击录制"));
    expect(recordButton).toBeTruthy();
    await recordButton!.trigger("click");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Fn", bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Fn", bubbles: true }));
    await flushPromises();

    const hotkeyInputs = wrapper.findAll("input").filter((item) => item.attributes("readonly") !== undefined);
    expect(hotkeyInputs.some((item) => item.element.value.trim() === "Fn")).toBe(true);
    expect(wrapper.text()).toContain("已录入");
  });

  it("can set standalone Fn from the explicit shortcut button", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();
    const appsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "App管理");
    expect(appsButton).toBeTruthy();
    await appsButton!.trigger("click");
    await flushPromises();

    const fnButton = wrapper.findAll("button.ghost-button").find((item) => item.text() === "设为 Fn");
    expect(fnButton).toBeTruthy();
    await fnButton!.trigger("click");
    await flushPromises();

    const hotkeyInputs = wrapper.findAll("input").filter((item) => item.attributes("readonly") !== undefined);
    expect(hotkeyInputs.some((item) => item.element.value.trim() === "Fn")).toBe(true);
    expect(wrapper.text()).toContain("已录入");
  });

  it("renders a flatter App management layout with summary and direct form fields", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();
    const appsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "App管理");
    expect(appsButton).toBeTruthy();
    await appsButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("目标总数");
    expect(wrapper.text()).toContain("真实 App");
    expect(wrapper.text()).toContain("启动命令");
    expect(wrapper.text()).toContain("热键");
    expect(wrapper.text()).toContain("备注");
  });

  it("opens the configured app website from App management", async () => {
    const { api } = setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();
    const appsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "App管理");
    expect(appsButton).toBeTruthy();
    await appsButton!.trigger("click");
    await flushPromises();

    const websiteButton = wrapper.findAll("button").find((item) => item.text() === "官网");
    expect(websiteButton).toBeTruthy();
    await websiteButton!.trigger("click");

    expect(api.openExternalUrl).toHaveBeenCalledWith("https://www.xiguasay.com/");
  });

  it("renders timeline entries as readable cards instead of raw event names", async () => {
    const { handlers } = setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    handlers.timeline?.({
      id: "event-1",
      runId: "run-1",
      eventType: "app_launch",
      tsMs: 120,
      payloadJson: JSON.stringify({ app: "Wispr Flow", target: "/Applications/Wispr Flow.app" }),
    });
    handlers.timeline?.({
      id: "event-2",
      runId: "run-1",
      eventType: "trigger_start",
      tsMs: 260,
      payloadJson: JSON.stringify({ chord: "Fn" }),
    });
    await flushPromises();

    expect(wrapper.text()).toContain("后台启动目标App");
    expect(wrapper.text()).toContain("Wispr Flow 已尝试后台启动");
    expect(wrapper.text()).toContain("触发热键：Fn");
  });

  it("renders the between-samples wait as a readable timeline card", async () => {
    const { handlers } = setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    handlers.timeline?.({
      id: "event-gap-1",
      runId: "run-1",
      eventType: "between_samples_wait",
      tsMs: 320,
      payloadJson: JSON.stringify({ delayMs: 3000 }),
    });
    await flushPromises();

    expect(wrapper.text()).toContain("等待下一条样本");
    expect(wrapper.text()).toContain("等待 3000 ms，再切到下一条样本。");
  });

  it("auto-scrolls the timeline to the newest event", async () => {
    const { handlers } = setupDesktopApi();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const wrapper = mount(App, { attachTo: host });
    await flushPromises();

    const list = wrapper.get("ul.timeline-visual").element as HTMLUListElement;
    Object.defineProperty(list, "scrollHeight", {
      value: 480,
      configurable: true,
    });
    list.scrollTop = 0;
    (list as HTMLUListElement & { scrollTo?: (options?: ScrollToOptions | number, y?: number) => void }).scrollTo = (options) => {
      const top = typeof options === "number" ? options : (options?.top ?? 0);
      list.scrollTop = top;
    };

    for (let index = 0; index < 11; index += 1) {
      handlers.timeline?.({
        id: `event-scroll-${index}`,
        runId: "run-1",
        eventType: "audio_start",
        tsMs: 300 + index * 40,
        payloadJson: JSON.stringify({ sample: "__builtin__/selftest-zh-01.wav" }),
      });
    }
    await flushPromises();

    expect(list.scrollTop).toBe(480);
    wrapper.unmount();
    host.remove();
  });

  it("shows only the latest run in the timeline instead of mixing multiple runs", async () => {
    const { handlers } = setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    handlers.timeline?.({
      id: "event-old-1",
      runId: "run-1",
      eventType: "audio_end",
      tsMs: 900,
      payloadJson: JSON.stringify({}),
    });
    handlers.timeline?.({
      id: "event-old-2",
      runId: "run-1",
      eventType: "trigger_stop",
      tsMs: 1040,
      payloadJson: JSON.stringify({}),
    });
    handlers.timeline?.({
      id: "event-new-1",
      runId: "run-2",
      eventType: "focus_input",
      tsMs: 1200,
      payloadJson: JSON.stringify({}),
    });
    handlers.timeline?.({
      id: "event-new-2",
      runId: "run-2",
      eventType: "trigger_start",
      tsMs: 1380,
      payloadJson: JSON.stringify({ chord: "Ctrl + 1" }),
    });
    await flushPromises();

    expect(wrapper.text()).toContain("聚焦检测框");
    expect(wrapper.text()).toContain("发送触发热键");
    expect(wrapper.text()).not.toContain("样本播放完成");
    expect(wrapper.text()).not.toContain("发送收口热键");
  });

  it("shows only the history list on the history page", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("历史列表");
    expect(wrapper.text()).toContain("导入CSV");
    expect(wrapper.find('button[aria-label="导出本轮 ZIP"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("输入检测区");
  });

  it("opens the CSV import dialog from the history header", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    await wrapper.get("button.history-import-link").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("导入外部测试结果");
    expect(wrapper.text()).toContain("拖拽 CSV 到这里");
  });

  it("imports a CSV dropped into the history dialog", async () => {
    const { api } = setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    await wrapper.get("button.history-import-link").trigger("click");
    await flushPromises();

    const dropzone = wrapper.get("button.import-dropzone");
    await dropzone.trigger("drop", {
      dataTransfer: {
        files: [{
          text: async () => "app_name,sample_path,status,final_text_length,raw_text,created_at\nAutoGLM,a.mp3,success,5,hello,2026-03-24T03:50:22.741Z",
          name: "import.csv",
        }],
      },
    });
    await flushPromises();

    expect(api.importCsvContent).toHaveBeenCalledWith(
      "app_name,sample_path,status,final_text_length,raw_text,created_at\nAutoGLM,a.mp3,success,5,hello,2026-03-24T03:50:22.741Z",
      "import.csv",
    );
  });

  it("shows the Q&A entry in the footer nav with the mute-during-dictation troubleshooting note", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const faqButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "Q&A");
    expect(faqButton).toBeTruthy();
    await faqButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("测试时没听到扬声器声音，先看这里");
    expect(wrapper.text()).toContain("语音输入时静音");
    expect(wrapper.text()).toContain("Typeless");
    expect(wrapper.find('.faq-shot img[alt="语音输入时静音设置示意图"]').exists()).toBe(true);
  });

  it("merges same-app timeline across runs on the main console so launch and close are both visible", async () => {
    const { api } = setupDesktopApi();
    const groupedRuns: TestRunRecord[] = [
      {
        id: "run-1",
        runSessionId: "session-1",
        appId: "xiguashuo",
        appName: "西瓜说",
        sampleId: "sample-1",
        samplePath: "first.wav",
        status: "success",
        phase: "completed",
        rawText: "first",
        normalizedText: "first",
        inputEventCount: 1,
        finalTextLength: 5,
        createdAt: "2026-03-23T10:01:00.000Z",
        timeline: [
          {
            id: "event-app-start",
            runId: "run-1",
            eventType: "app_start",
            tsMs: 10,
            payloadJson: JSON.stringify({ app: "西瓜说" }),
          },
          {
            id: "event-launch",
            runId: "run-1",
            eventType: "app_launch",
            tsMs: 20,
            payloadJson: JSON.stringify({ app: "西瓜说", target: "西瓜说.app" }),
          },
        ],
      },
      {
        id: "run-2",
        runSessionId: "session-1",
        appId: "xiguashuo",
        appName: "西瓜说",
        sampleId: "sample-2",
        samplePath: "zh.wav",
        status: "success",
        phase: "completed",
        rawText: "second",
        normalizedText: "second",
        inputEventCount: 1,
        finalTextLength: 6,
        createdAt: "2026-03-23T10:02:00.000Z",
        timeline: [
          {
            id: "event-close-wait",
            runId: "run-2",
            eventType: "app_close_wait",
            tsMs: 30,
            payloadJson: JSON.stringify({ app: "西瓜说", delayMs: 3000 }),
          },
          {
            id: "event-close",
            runId: "run-2",
            eventType: "app_close",
            tsMs: 40,
            payloadJson: JSON.stringify({ app: "西瓜说" }),
          },
        ],
      },
    ];
    api.listResults.mockResolvedValueOnce(groupedRuns);
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain("后台启动目标App");
    expect(wrapper.text()).toContain("关闭目标App");
    expect(wrapper.text()).toContain("西瓜说 已尝试后台启动");
    expect(wrapper.text()).toContain("西瓜说 已发送关闭指令");
  });

  it("keeps rendering the live same-app timeline after completion so no just-finished steps disappear", async () => {
    const { handlers } = setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    handlers.progress?.({
      sessionId: "session-live",
      runId: "run-2",
      phase: "focus_input",
      currentAppName: "西瓜说",
      currentSamplePath: "zh.wav",
      textValue: "",
      message: "running",
      completedRuns: 1,
      totalRuns: 2,
    });

    handlers.timeline?.({
      id: "event-app-start",
      runId: "session-live",
      eventType: "app_start",
      tsMs: 10,
      payloadJson: JSON.stringify({ app: "西瓜说" }),
    });
    handlers.timeline?.({
      id: "event-launch",
      runId: "run-1",
      eventType: "app_launch",
      tsMs: 20,
      payloadJson: JSON.stringify({ app: "西瓜说", target: "西瓜说.app" }),
    });
    handlers.timeline?.({
      id: "event-close",
      runId: "run-2",
      eventType: "app_close",
      tsMs: 40,
      payloadJson: JSON.stringify({ app: "西瓜说" }),
    });
    handlers.progress?.({
      sessionId: "session-live",
      runId: "run-2",
      phase: "completed",
      currentAppName: "西瓜说",
      currentSamplePath: "zh.wav",
      textValue: "",
      message: "done",
      completedRuns: 2,
      totalRuns: 2,
    });
    await flushPromises();

    expect(wrapper.text()).toContain("开始处理应用");
    expect(wrapper.text()).toContain("后台启动目标App");
    expect(wrapper.text()).toContain("关闭目标App");
  });

  it("shows the full session timeline across multiple apps in sequence", async () => {
    const { api, sessions } = setupDesktopApi();
    sessions[0] = {
      ...sessions[0],
      id: "session-multi-app",
      runCount: 2,
      successCount: 2,
      failedCount: 0,
      cancelledCount: 0,
      status: "completed",
      startedAt: "2026-03-25T06:00:00.000Z",
      finishedAt: "2026-03-25T06:00:45.000Z",
    };
    api.listResults.mockResolvedValueOnce([
      {
        id: "run-xigua-1",
        runSessionId: "session-multi-app",
        appId: "xiguashuo",
        appName: "西瓜说",
        sampleId: "sample-1",
        samplePath: "first.wav",
        status: "success",
        phase: "completed",
        rawText: "first",
        normalizedText: "first",
        inputEventCount: 1,
        finalTextLength: 5,
        createdAt: "2026-03-25T06:00:20.000Z",
        timeline: [
          {
            id: "event-xigua-start",
            runId: "run-xigua-1",
            eventType: "app_start",
            tsMs: 10,
            payloadJson: JSON.stringify({ app: "西瓜说" }),
          },
          {
            id: "event-xigua-close",
            runId: "run-xigua-1",
            eventType: "app_close",
            tsMs: 20,
            payloadJson: JSON.stringify({ app: "西瓜说" }),
          },
        ],
      },
      {
        id: "run-shandian-1",
        runSessionId: "session-multi-app",
        appId: "shandianshuo",
        appName: "闪电说",
        sampleId: "sample-2",
        samplePath: "second.wav",
        status: "success",
        phase: "completed",
        rawText: "second",
        normalizedText: "second",
        inputEventCount: 1,
        finalTextLength: 6,
        createdAt: "2026-03-25T06:00:45.000Z",
        timeline: [
          {
            id: "event-shandian-start",
            runId: "run-shandian-1",
            eventType: "app_start",
            tsMs: 30,
            payloadJson: JSON.stringify({ app: "闪电说" }),
          },
          {
            id: "event-shandian-close",
            runId: "run-shandian-1",
            eventType: "app_close",
            tsMs: 40,
            payloadJson: JSON.stringify({ app: "闪电说" }),
          },
        ],
      },
    ]);

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain("切到应用：西瓜说。");
    expect(wrapper.text()).toContain("西瓜说 已发送关闭指令");
    expect(wrapper.text()).toContain("切到应用：闪电说。");
    expect(wrapper.text()).toContain("闪电说 已发送关闭指令");
  });

  it("groups results under collapsible run sessions and exports the selected session", async () => {
    const { api } = setupDesktopApi();
    const groupedRuns: TestRunRecord[] = [
      {
        id: "run-1",
        runSessionId: "session-1",
        appId: "wispr",
        appName: "Wispr Flow",
        sampleId: "sample-1",
        samplePath: "zh.wav",
        status: "success",
        phase: "completed",
        rawText: "hello",
        normalizedText: "hello",
        inputEventCount: 1,
        finalTextLength: 5,
        createdAt: "2026-03-23T10:01:00.000Z",
        timeline: [],
      },
    ];
    api.listResults.mockResolvedValueOnce(groupedRuns);
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("03/23");
    expect(wrapper.text()).toContain("Wispr Flow");

    const exportButton = wrapper.find('button[aria-label="导出本轮 ZIP"]');
    expect(exportButton.exists()).toBe(true);
    await exportButton.trigger("click");
    await flushPromises();

    expect(api.exportBundle).toHaveBeenCalledWith("session-1");
  });

  it("highlights failed history session summary text in red", async () => {
    const { api } = setupDesktopApi();
    api.listResults.mockResolvedValueOnce([
      {
        id: "run-failed-session-1",
        runSessionId: "session-1",
        appId: "wispr",
        appName: "Wispr Flow",
        sampleId: "sample-1",
        samplePath: "zh.wav",
        status: "failed",
        phase: "failed",
        rawText: "",
        normalizedText: "",
        inputEventCount: 0,
        finalTextLength: 0,
        createdAt: "2026-03-23T10:01:00.000Z",
        timeline: [],
      },
    ]);
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    expect(wrapper.find(".session-summary--danger").text()).toContain("失败 1");
  });

  it("shows the app name next to the history session timestamp", async () => {
    const { api, sessions } = setupDesktopApi();
    sessions[0] = {
      ...sessions[0],
      runCount: 1,
      successCount: 0,
      failedCount: 0,
      cancelledCount: 1,
      status: "cancelled",
    };
    api.listResults.mockResolvedValueOnce([
      {
        id: "run-typeless-1",
        runSessionId: "session-1",
        appId: "typeless",
        appName: "Typeless",
        sampleId: "sample-1",
        samplePath: "zh.wav",
        status: "cancelled",
        phase: "cancelled",
        rawText: "",
        normalizedText: "",
        inputEventCount: 0,
        finalTextLength: 0,
        createdAt: "2026-03-23T10:01:00.000Z",
        timeline: [],
      },
    ]);
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    const sessionToggle = wrapper.get("button.session-toggle");
    expect(sessionToggle.text()).toContain("Typeless");
    expect(wrapper.get(".session-app-name").text()).toBe("Typeless");
  });

  it("shows a retry icon for failed history rows and reruns only that app/sample", async () => {
    const { api } = setupDesktopApi();
    const groupedRuns: TestRunRecord[] = [
      {
        id: "run-failed-1",
        runSessionId: "session-1",
        appId: "wispr",
        appName: "Wispr Flow",
        sampleId: "sample-2",
        samplePath: "内建自测/english-01.wav",
        status: "failed",
        phase: "failed",
        failureCategory: "timeout_waiting_result",
        failureReason: "Timed out waiting for stable text",
        rawText: "",
        normalizedText: "",
        inputEventCount: 0,
        finalTextLength: 0,
        createdAt: "2026-03-23T10:01:00.000Z",
        timeline: [],
      },
    ];
    api.listResults.mockResolvedValue(groupedRuns);
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    const retryButton = wrapper.find('button[aria-label="重新测试"]');
    expect(retryButton.exists()).toBe(true);

    await retryButton.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("输入检测区");
    expect(api.startRun).not.toHaveBeenCalled();
    await wrapper.get(".dialog-card--countdown .primary-button").trigger("click");
    await flushPromises();

    expect(api.startRun).toHaveBeenCalledWith({
      appIds: ["wispr-flow"],
      sampleIds: ["builtin-en-01"],
      retryRootRunId: "run-failed-1",
    });
  });

  it("falls back to current app name and sample path when retrying stale history ids", async () => {
    const { api, settings } = setupDesktopApi();
    settings.targetApps = settings.targetApps.map((app) => (
      app.id === "typeless"
        ? { ...app, id: "typeless-current", name: "Typeless" }
        : app
    ));
    settings.audioSamples = settings.audioSamples.map((sample) => (
      sample.id === "builtin-en-01"
        ? { ...sample, id: "sample-current", relativePath: "failed.wav", displayName: "failed.wav" }
        : sample
    ));
    const groupedRuns: TestRunRecord[] = [
      {
        id: "run-failed-2",
        runSessionId: "session-1",
        appId: "typeless-old",
        appName: "Typeless",
        sampleId: "sample-old",
        samplePath: "failed.wav",
        status: "failed",
        phase: "failed",
        failureCategory: "timeout_waiting_result",
        failureReason: "Timed out waiting for stable text",
        rawText: "",
        normalizedText: "",
        inputEventCount: 0,
        finalTextLength: 0,
        createdAt: "2026-03-23T10:01:00.000Z",
        timeline: [],
      },
    ];
    api.listResults.mockResolvedValue(groupedRuns);
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    await wrapper.find('button[aria-label="重新测试"]').trigger("click");
    await flushPromises();
    await wrapper.get(".dialog-card--countdown .primary-button").trigger("click");
    await flushPromises();

    expect(api.startRun).toHaveBeenCalledWith({
      appIds: ["typeless-current"],
      sampleIds: ["sample-current"],
      retryRootRunId: "run-failed-2",
    });
  });

  it("shows danger notice styling when a retry preflight fails", async () => {
    const { api } = setupDesktopApi({
      startRunResult: {
        ok: false,
        permissions: defaultPermissions(),
        devices: defaultDevices(),
        items: [
          {
            key: "apps",
            ok: false,
            message: "当前没有启用的目标App",
            hint: "至少启用一个目标App。",
          },
        ],
      },
    });
    const groupedRuns: TestRunRecord[] = [
      {
        id: "run-failed-3",
        runSessionId: "session-1",
        appId: "typeless",
        appName: "Typeless",
        sampleId: "builtin-en-01",
        samplePath: "内建自测/english-01.wav",
        status: "failed",
        phase: "failed",
        failureCategory: "timeout_waiting_result",
        failureReason: "Timed out waiting for stable text",
        rawText: "",
        normalizedText: "",
        inputEventCount: 0,
        finalTextLength: 0,
        createdAt: "2026-03-23T10:01:00.000Z",
        timeline: [],
      },
    ];
    api.listResults.mockResolvedValue(groupedRuns);
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    await wrapper.find('button[aria-label="重新测试"]').trigger("click");
    await flushPromises();
    await wrapper.get(".dialog-card--countdown .primary-button").trigger("click");
    await flushPromises();

    expect(wrapper.find(".notice-toast--danger").exists()).toBe(true);
    expect(wrapper.text()).toContain("这次没跑起来，先看上面的红色提示。");
  });

  it("shows merged retry count on the history row", async () => {
    const { api } = setupDesktopApi();
    api.listResults.mockResolvedValue([
      {
        id: "run-merged-1",
        runSessionId: "session-1",
        appId: "typeless",
        appName: "Typeless",
        sampleId: "builtin-en-01",
        samplePath: "内建自测/english-01.wav",
        status: "success",
        phase: "completed",
        rawText: "ok",
        normalizedText: "ok",
        inputEventCount: 1,
        finalTextLength: 2,
        createdAt: "2026-03-23T10:03:00.000Z",
        retryCount: 2,
        timeline: [],
      },
    ]);
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("重试");
    expect(wrapper.text()).toContain("2");
    expect(wrapper.find(".history-sample-text").attributes("data-tooltip")).toBe("内建自测/english-01.wav");
  });

  it("uses the retry completion time as the displayed session time for merged history rows", async () => {
    const { api, sessions } = setupDesktopApi();
    sessions[0] = {
      ...sessions[0],
      startedAt: "2026-03-23T10:00:00.000Z",
    };
    api.listResults.mockResolvedValue([
      {
        id: "run-merged-time-1",
        runSessionId: "session-1",
        appId: "typeless",
        appName: "Typeless",
        sampleId: "builtin-en-01",
        samplePath: "内建自测/english-01.wav",
        status: "success",
        phase: "completed",
        rawText: "ok",
        normalizedText: "ok",
        inputEventCount: 1,
        finalTextLength: 2,
        createdAt: "2026-03-24T07:25:27.000Z",
        retryCount: 1,
        timeline: [],
      },
    ]);
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("03/24 15:25:27");
  });

  it("shows the retry action for successful rows too", async () => {
    const { api } = setupDesktopApi();
    api.listResults.mockResolvedValue([
      {
        id: "run-success-1",
        runSessionId: "session-1",
        appId: "typeless",
        appName: "Typeless",
        sampleId: "builtin-en-01",
        samplePath: "内建自测/english-01.wav",
        status: "success",
        phase: "completed",
        rawText: "ok",
        normalizedText: "ok",
        inputEventCount: 1,
        finalTextLength: 2,
        createdAt: "2026-03-23T10:03:00.000Z",
        timeline: [],
      },
    ]);
    const wrapper = mount(App);
    await flushPromises();

    const historyButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "测试历史");
    expect(historyButton).toBeTruthy();
    await historyButton!.trigger("click");
    await flushPromises();

    expect(wrapper.find('button[aria-label="重新测试"]').exists()).toBe(true);
  });

  it("clears the previous main-page results when a new run starts", async () => {
    const { handlers } = setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain("03/23");

    handlers.progress?.({
      sessionId: "session-2",
      phase: "focus_input",
      textValue: "",
      message: "新一轮开始",
      completedRuns: 0,
      totalRuns: 2,
    });
    await flushPromises();

    expect(wrapper.text()).not.toContain("03/23");
    expect(wrapper.text()).toContain("还没有测试结果");
  });

  it("moves focus into the live textarea before starting a run", async () => {
    const { api } = setupDesktopApi();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const wrapper = mount(App, { attachTo: host });
    await flushPromises();

    await wrapper.get("button.primary-button").trigger("click");
    await flushPromises();
    expect(api.startRun).not.toHaveBeenCalled();

    const textarea = wrapper.get("textarea.live-textarea").element as HTMLTextAreaElement;
    expect(api.focusBenchmarkWindow).toHaveBeenCalled();
    expect(document.activeElement).toBe(textarea);

    await wrapper.get(".dialog-card--countdown .primary-button").trigger("click");
    await flushPromises();
    expect(api.startRun).toHaveBeenCalled();
    wrapper.unmount();
    host.remove();
  });

  it("restores the latest session summary when the pre-run dialog is canceled", async () => {
    const { api } = setupDesktopApi();
    const groupedRuns: TestRunRecord[] = [
      {
        id: "run-1",
        runSessionId: "session-1",
        appId: "wispr",
        appName: "Wispr Flow",
        sampleId: "sample-1",
        samplePath: "zh.wav",
        status: "success",
        phase: "completed",
        rawText: "hello",
        normalizedText: "hello",
        inputEventCount: 1,
        finalTextLength: 5,
        createdAt: "2026-03-23T10:01:00.000Z",
        timeline: [],
      },
    ];
    api.listResults.mockResolvedValue(groupedRuns);
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain("测试统计");
    await wrapper.get("button.primary-button").trigger("click");
    await flushPromises();

    expect(wrapper.text()).not.toContain("测试统计");
    await wrapper.get(".dialog-card--countdown .ghost-button").trigger("click");
    await flushPromises();

    expect(api.startRun).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("测试统计");
    expect(wrapper.text()).toContain("Wispr Flow");
  });
});
