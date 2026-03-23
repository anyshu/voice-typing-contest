// @vitest-environment jsdom

import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/renderer/App.vue";
import { defaultConfig, defaultDevices, defaultPermissions } from "../src/shared/defaults";
import type { PreflightReport, RunSessionSummary, SettingsPayload, TestRunRecord } from "../src/shared/types";

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
  const api = {
    getSettings: vi.fn(async (): Promise<SettingsPayload> => settings),
    saveSettings: vi.fn(async () => ({ ok: true })),
    pickSampleRoot: vi.fn(async () => undefined),
    rescanSamples: vi.fn(async () => settings.audioSamples),
    pickDatabasePath: vi.fn(async () => undefined),
    refreshPermissions: vi.fn(async () => ({ permissions: settings.permissions, devices: settings.devices })),
    openPermissionSettings: vi.fn(async () => ({ ok: true })),
    focusBenchmarkWindow: vi.fn(async () => ({ ok: true })),
    startRun: vi.fn(async () => options?.startRunResult ?? {
      ok: true,
      items: [],
      permissions: settings.permissions,
      devices: settings.devices,
    }),
    stopRun: vi.fn(async () => undefined),
    listResults: vi.fn(async (): Promise<TestRunRecord[]> => []),
    listResultSessions: vi.fn(async (): Promise<RunSessionSummary[]> => sessions),
    getResultDetail: vi.fn(async () => undefined),
    exportCsv: vi.fn(async () => undefined),
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
    expect(wrapper.text()).toContain("开始运行");
    expect(wrapper.text()).toContain("运行前检查");
    expect(wrapper.text()).toContain("样本");
    expect(wrapper.text()).toContain("内建自测");
    expect(wrapper.text()).toContain("结果列表");
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
          hint: "先到系统设置里给这个应用打开辅助功能权限，再回来点开始运行。",
        },
      ],
    };
    const { api } = setupDesktopApi({ startRunResult });
    const wrapper = mount(App);
    await flushPromises();
    await wrapper.get("button.primary-button").trigger("click");
    await flushPromises();
    expect(api.startRun).toHaveBeenCalled();
    expect(wrapper.text()).toContain("现在还不能运行");
    expect(wrapper.text()).toContain("缺少辅助功能权限");
    expect(wrapper.text()).toContain("先到系统设置里给这个应用打开辅助功能权限");
  });

  it("sends stop IPC from the close-current-run button while running", async () => {
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

    const closeButton = wrapper.findAll("button").find((item) => item.text() === "关闭本轮");
    expect(closeButton).toBeTruthy();
    expect(closeButton!.attributes("disabled")).toBeUndefined();
    await closeButton!.trigger("click");
    await flushPromises();

    expect(api.stopRun).toHaveBeenCalled();
    expect(wrapper.text()).toContain("正在关闭本轮");
  });

  it("captures hotkey by pressing real key combo after clicking record", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();
    const settingsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "设置");
    expect(settingsButton).toBeTruthy();
    await settingsButton!.trigger("click");
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
    const settingsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "设置");
    expect(settingsButton).toBeTruthy();
    await settingsButton!.trigger("click");
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
    const settingsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "设置");
    expect(settingsButton).toBeTruthy();
    await settingsButton!.trigger("click");
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
    const settingsButton = wrapper.findAll("button.nav-button").find((item) => item.text() === "设置");
    expect(settingsButton).toBeTruthy();
    await settingsButton!.trigger("click");
    await flushPromises();

    const fnButton = wrapper.findAll("button.ghost-button").find((item) => item.text() === "设为 Fn");
    expect(fnButton).toBeTruthy();
    await fnButton!.trigger("click");
    await flushPromises();

    const hotkeyInputs = wrapper.findAll("input").filter((item) => item.attributes("readonly") !== undefined);
    expect(hotkeyInputs.some((item) => item.element.value.trim() === "Fn")).toBe(true);
    expect(wrapper.text()).toContain("已录入");
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

    expect(wrapper.text()).toContain("后台启动目标应用");
    expect(wrapper.text()).toContain("Wispr Flow 已尝试后台启动");
    expect(wrapper.text()).toContain("开始热键：Fn");
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
    expect(wrapper.text()).toContain("发送开始热键");
    expect(wrapper.text()).not.toContain("样本播放完成");
    expect(wrapper.text()).not.toContain("发送结束热键");
  });

  it("shows test summary above the result list on the main page", async () => {
    setupDesktopApi();
    const wrapper = mount(App);
    await flushPromises();

    const headings = wrapper.findAll("h3").map((item) => item.text());
    const detailIndex = headings.indexOf("测试结果");
    const listIndex = headings.indexOf("结果列表");
    expect(detailIndex).toBeGreaterThan(-1);
    expect(listIndex).toBeGreaterThan(-1);
    expect(detailIndex).toBeLessThan(listIndex);
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
      },
    ];
    api.listResults.mockResolvedValueOnce(groupedRuns);
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain("03/23");
    expect(wrapper.text()).toContain("Wispr Flow");

    const exportButton = wrapper.findAll("button").find((item) => item.text() === "导出本轮 CSV");
    expect(exportButton).toBeTruthy();
    await exportButton!.trigger("click");
    await flushPromises();

    expect(api.exportCsv).toHaveBeenCalledWith("session-1");
  });

  it("moves focus into the live textarea before starting a run", async () => {
    const { api } = setupDesktopApi();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const wrapper = mount(App, { attachTo: host });
    await flushPromises();

    await wrapper.get("button.primary-button").trigger("click");
    await flushPromises();

    const textarea = wrapper.get("textarea.live-textarea").element as HTMLTextAreaElement;
    expect(api.focusBenchmarkWindow).toHaveBeenCalled();
    expect(document.activeElement).toBe(textarea);
    wrapper.unmount();
    host.remove();
  });
});
