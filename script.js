const pageButtons = document.querySelectorAll("[data-page-target]");
const pageRoots = document.querySelectorAll("[data-page]");
const pageTitle = document.querySelector("[data-page-title]");
const settingsOverlay = document.querySelector("[data-overlay]");
const settingsOpeners = document.querySelectorAll("[data-open-settings]");
const settingsClosers = document.querySelectorAll("[data-close-settings]");
const settingsTabs = document.querySelectorAll("[data-settings-tab]");
const settingsPanels = document.querySelectorAll("[data-settings-panel]");
const drawer = document.querySelector("[data-drawer]");
const drawerOpeners = document.querySelectorAll("[data-open-drawer]");
const drawerClosers = document.querySelectorAll("[data-close-drawer]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
const runStartButton = document.querySelector("[data-run-control='start']");
const runStopButton = document.querySelector("[data-run-control='stop']");
const body = document.body;

const appRows = document.querySelectorAll("[data-run-app]");
const sampleRows = document.querySelectorAll("[data-run-sample]");
const stepRows = document.querySelectorAll("[data-run-step]");
const timelineRows = document.querySelectorAll("[data-step-key]");

const currentApp = document.querySelector("[data-current-app]");
const currentSample = document.querySelector("[data-current-sample]");
const currentStep = document.querySelector("[data-current-step]");
const progressText = document.querySelector("[data-progress-text]");
const progressValue = document.querySelector("[data-progress-value]");
const liveState = document.querySelector("[data-live-state]");
const liveText = document.querySelector("[data-live-text]");
const metricState = document.querySelector("[data-metric-state]");
const metricFirstChar = document.querySelector("[data-metric-first-char]");
const metricFinal = document.querySelector("[data-metric-final]");
const metricLength = document.querySelector("[data-metric-length]");
const snapshotFailure = document.querySelector("[data-snapshot-failure]");
const snapshotText = document.querySelector("[data-snapshot-text]");
const snapshotSample = document.querySelector("[data-snapshot-sample]");
const snapshotMode = document.querySelector("[data-snapshot-mode]");
const failureBanner = document.querySelector("[data-failure-banner]");
const failureTitle = document.querySelector("[data-failure-title]");
const failureMessage = document.querySelector("[data-failure-message]");

const drawerTitle = document.querySelector("[data-drawer-title]");
const drawerApp = document.querySelector("[data-drawer-app]");
const drawerSample = document.querySelector("[data-drawer-sample]");
const drawerStatus = document.querySelector("[data-drawer-status]");
const drawerText = document.querySelector("[data-drawer-text]");
const drawerFirstChar = document.querySelector("[data-drawer-first-char]");
const drawerFinal = document.querySelector("[data-drawer-final]");
const drawerLength = document.querySelector("[data-drawer-length]");
const drawerFailure = document.querySelector("[data-drawer-failure]");

const pageTitleMap = {
  main: "Main",
  intro: "Intro",
  about: "About",
};

const stepTitleMap = {
  prepare: "Prepare",
  hotkey: "Send Hotkey",
  play: "Play Audio",
  observe: "Observe Input",
  settle: "Settle Result",
};

const runStates = [
  {
    app: "xiguashuo",
    appLabel: "Xiguashuo",
    sample: "mandarin/basic/zh-basic-01.wav",
    step: "prepare",
    progress: 8,
    progressLabel: "1 / 10",
    mode: "hold",
    liveStatus: "Preparing",
    tone: "info",
    resultState: "Preparing",
    firstChar: "--",
    finalLatency: "--",
    textLength: "--",
    text: "正在清空输入框，准备进入第一条样本。",
    snapshotFailure: "--",
    banner: null,
  },
  {
    app: "xiguashuo",
    appLabel: "Xiguashuo",
    sample: "mandarin/basic/zh-basic-01.wav",
    step: "hotkey",
    progress: 18,
    progressLabel: "2 / 10",
    mode: "hold",
    liveStatus: "Hotkey Down",
    tone: "info",
    resultState: "Triggering",
    firstChar: "--",
    finalLatency: "--",
    textLength: "--",
    text: "已发出全局热键，等待音频播放。",
    snapshotFailure: "--",
    banner: null,
  },
  {
    app: "xiguashuo",
    appLabel: "Xiguashuo",
    sample: "mandarin/basic/zh-basic-01.wav",
    step: "play",
    progress: 30,
    progressLabel: "3 / 10",
    mode: "hold",
    liveStatus: "Playing Audio",
    tone: "info",
    resultState: "Streaming",
    firstChar: "--",
    finalLatency: "--",
    textLength: "--",
    text: "音频已发往 BlackHole 2ch。",
    snapshotFailure: "--",
    banner: null,
  },
  {
    app: "xiguashuo",
    appLabel: "Xiguashuo",
    sample: "mandarin/basic/zh-basic-01.wav",
    step: "observe",
    progress: 42,
    progressLabel: "4 / 10",
    mode: "hold",
    liveStatus: "Capturing",
    tone: "success",
    resultState: "Receiving",
    firstChar: "850 ms",
    finalLatency: "--",
    textLength: "12",
    text: "你好，今天我们开始测试",
    snapshotFailure: "--",
    banner: null,
  },
  {
    app: "xiguashuo",
    appLabel: "Xiguashuo",
    sample: "mandarin/basic/zh-basic-01.wav",
    step: "settle",
    progress: 50,
    progressLabel: "5 / 10",
    mode: "hold",
    liveStatus: "Settled",
    tone: "success",
    resultState: "Success",
    firstChar: "850 ms",
    finalLatency: "1440 ms",
    textLength: "18",
    text: "你好，今天我们开始测试 voice typing contest。",
    snapshotFailure: "--",
    banner: null,
  },
  {
    app: "wispr-flow",
    appLabel: "Wispr Flow",
    sample: "english/short/en-short-03.wav",
    step: "prepare",
    progress: 60,
    progressLabel: "6 / 10",
    mode: "tap",
    liveStatus: "Preparing",
    tone: "info",
    resultState: "Preparing",
    firstChar: "--",
    finalLatency: "--",
    textLength: "--",
    text: "切到 Wispr Flow，准备英文短样本。",
    snapshotFailure: "--",
    banner: null,
  },
  {
    app: "wispr-flow",
    appLabel: "Wispr Flow",
    sample: "english/short/en-short-03.wav",
    step: "hotkey",
    progress: 70,
    progressLabel: "7 / 10",
    mode: "tap",
    liveStatus: "Hotkey Tap",
    tone: "info",
    resultState: "Triggering",
    firstChar: "--",
    finalLatency: "--",
    textLength: "--",
    text: "tap 模式已发出快捷键。",
    snapshotFailure: "--",
    banner: null,
  },
  {
    app: "wispr-flow",
    appLabel: "Wispr Flow",
    sample: "english/short/en-short-03.wav",
    step: "play",
    progress: 78,
    progressLabel: "8 / 10",
    mode: "tap",
    liveStatus: "Playing Audio",
    tone: "info",
    resultState: "Streaming",
    firstChar: "--",
    finalLatency: "--",
    textLength: "--",
    text: "英文短句已开始播放。",
    snapshotFailure: "--",
    banner: null,
  },
  {
    app: "wispr-flow",
    appLabel: "Wispr Flow",
    sample: "english/short/en-short-03.wav",
    step: "observe",
    progress: 88,
    progressLabel: "9 / 10",
    mode: "tap",
    liveStatus: "Waiting",
    tone: "warning",
    resultState: "No Input Yet",
    firstChar: "--",
    finalLatency: "--",
    textLength: "0",
    text: "",
    snapshotFailure: "No text observed yet",
    banner: null,
  },
  {
    app: "wispr-flow",
    appLabel: "Wispr Flow",
    sample: "english/short/en-short-03.wav",
    step: "settle",
    progress: 100,
    progressLabel: "10 / 10",
    mode: "tap",
    liveStatus: "Failed",
    tone: "danger",
    resultState: "Timeout",
    firstChar: "--",
    finalLatency: "5000 ms",
    textLength: "0",
    text: "",
    snapshotFailure: "Timeout after 5000 ms",
    banner: {
      title: "Wispr Flow timeout on english/short/en-short-03.wav",
      message: "observe 阶段 5000 ms 内没有等到任何输入。先检查 target app 是否真的在监听全局热键，再确认虚拟输入设备没有被系统切走。",
    },
  },
];

const stepOrder = ["prepare", "hotkey", "play", "observe", "settle"];
let runTimer = null;
let runIndex = -1;

function setPage(pageName) {
  pageRoots.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === pageName);
  });

  pageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.pageTarget === pageName);
  });

  if (pageTitle) {
    pageTitle.textContent = pageTitleMap[pageName] || pageName;
  }
}

function syncScrollLock() {
  const locked = !settingsOverlay.hidden || !drawer.hidden;
  body.classList.toggle("is-locked", locked);
}

function openSettings() {
  settingsOverlay.hidden = false;
  syncScrollLock();
}

function closeSettings() {
  settingsOverlay.hidden = true;
  syncScrollLock();
}

function setSettingsTab(tabName) {
  settingsTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.settingsTab === tabName);
  });

  settingsPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.settingsPanel === tabName);
  });
}

function openDrawer() {
  drawer.hidden = false;
  syncScrollLock();
}

function closeDrawer() {
  drawer.hidden = true;
  syncScrollLock();
}

function setTheme(theme) {
  body.dataset.theme = theme;
  try {
    localStorage.setItem("vtc-theme", theme);
  } catch (_error) {
    // Ignore storage errors in static preview mode.
  }
}

function toggleTheme() {
  setTheme(body.dataset.theme === "dark" ? "light" : "dark");
}

function setSidebarCollapsed(collapsed) {
  body.classList.toggle("sidebar-collapsed", collapsed);
  try {
    localStorage.setItem("vtc-sidebar-collapsed", String(collapsed));
  } catch (_error) {
    // Ignore storage errors in static preview mode.
  }
}

function setTone(element, tone, fallbackText) {
  element.className = "state-pill";
  if (tone === "success") {
    element.classList.add("state-pill--success");
  } else if (tone === "warning") {
    element.classList.add("state-pill--warning");
  } else if (tone === "danger") {
    element.classList.add("state-pill--danger");
  } else {
    element.classList.add("state-pill--info");
  }
  if (fallbackText) {
    element.textContent = fallbackText;
  }
}

function clearRunHighlights() {
  appRows.forEach((row) => row.classList.remove("is-running"));
  sampleRows.forEach((row) => row.classList.remove("is-running"));
  stepRows.forEach((row) => row.classList.remove("is-running", "is-done"));
  timelineRows.forEach((row) => row.classList.remove("is-running", "is-done"));
}

function updateFailureBanner(banner) {
  if (!banner) {
    failureBanner.hidden = true;
    return;
  }

  failureBanner.hidden = false;
  failureTitle.textContent = banner.title;
  failureMessage.textContent = banner.message;
}

function updateRunState(state) {
  clearRunHighlights();

  appRows.forEach((row) => {
    row.classList.toggle("is-running", row.dataset.runApp === state.app);
  });

  sampleRows.forEach((row) => {
    row.classList.toggle("is-running", row.dataset.runSample === state.sample);
  });

  const currentStepIndex = stepOrder.indexOf(state.step);

  stepRows.forEach((row) => {
    const index = stepOrder.indexOf(row.dataset.runStep);
    row.classList.toggle("is-running", row.dataset.runStep === state.step);
    row.classList.toggle("is-done", index > -1 && index < currentStepIndex);
  });

  timelineRows.forEach((row) => {
    const index = stepOrder.indexOf(row.dataset.stepKey);
    row.classList.toggle("is-running", row.dataset.stepKey === state.step);
    row.classList.toggle("is-done", index > -1 && index < currentStepIndex);
  });

  currentApp.textContent = state.appLabel;
  currentSample.textContent = state.sample;
  currentStep.textContent = stepTitleMap[state.step] || state.step;
  progressText.textContent = state.progressLabel;
  progressValue.style.width = `${state.progress}%`;

  setTone(liveState, state.tone, state.liveStatus);
  metricState.textContent = state.resultState;
  metricFirstChar.textContent = state.firstChar;
  metricFinal.textContent = state.finalLatency;
  metricLength.textContent = state.textLength;
  liveText.value = state.text || "";

  snapshotFailure.textContent = state.snapshotFailure || "--";
  snapshotText.textContent = state.text || "--";
  snapshotSample.textContent = state.sample;
  snapshotMode.textContent = state.mode;

  drawerTitle.textContent = `${state.appLabel} / ${state.sample}`;
  drawerApp.textContent = state.appLabel;
  drawerSample.textContent = state.sample;
  drawerStatus.textContent = state.resultState.toLowerCase();
  drawerText.textContent = state.text || "--";
  drawerFirstChar.textContent = state.firstChar;
  drawerFinal.textContent = state.finalLatency;
  drawerLength.textContent = state.textLength;
  drawerFailure.textContent = state.snapshotFailure || "--";

  updateFailureBanner(state.banner);
}

function resetRunState() {
  clearRunHighlights();
  currentApp.textContent = "--";
  currentSample.textContent = "--";
  currentStep.textContent = "Waiting";
  progressText.textContent = "Idle";
  progressValue.style.width = "0%";
  setTone(liveState, "info", "Idle");
  metricState.textContent = "Idle";
  metricFirstChar.textContent = "--";
  metricFinal.textContent = "--";
  metricLength.textContent = "--";
  liveText.value = "点击 Run 后，这里会跟着自动运行状态一起变化。";
  snapshotFailure.textContent = "--";
  snapshotText.textContent = "还没有开始运行。";
  snapshotSample.textContent = "--";
  snapshotMode.textContent = "--";
  drawerTitle.textContent = "Xiguashuo / mandarin/basic/zh-basic-01.wav";
  drawerApp.textContent = "Xiguashuo";
  drawerSample.textContent = "mandarin/basic/zh-basic-01.wav";
  drawerStatus.textContent = "idle";
  drawerText.textContent = "点击 Run 后，这里会跟着当前状态刷新。";
  drawerFirstChar.textContent = "--";
  drawerFinal.textContent = "--";
  drawerLength.textContent = "--";
  drawerFailure.textContent = "--";
  updateFailureBanner(null);
}

function tickRunState() {
  runIndex = (runIndex + 1) % runStates.length;
  updateRunState(runStates[runIndex]);
}

function startRun() {
  if (runTimer) {
    return;
  }

  tickRunState();
  runTimer = window.setInterval(tickRunState, 1400);
}

function stopRun() {
  if (runTimer) {
    window.clearInterval(runTimer);
    runTimer = null;
  }

  setTone(liveState, "warning", "Stopped");
  progressText.textContent = runIndex >= 0 ? `Stopped @ ${runStates[runIndex].progressLabel}` : "Stopped";
}

pageButtons.forEach((button) => {
  button.addEventListener("click", () => setPage(button.dataset.pageTarget));
});

settingsOpeners.forEach((button) => {
  button.addEventListener("click", openSettings);
});

settingsClosers.forEach((button) => {
  button.addEventListener("click", closeSettings);
});

settingsOverlay.addEventListener("click", (event) => {
  if (event.target === settingsOverlay) {
    closeSettings();
  }
});

settingsTabs.forEach((tab) => {
  tab.addEventListener("click", () => setSettingsTab(tab.dataset.settingsTab));
});

drawerOpeners.forEach((button) => {
  button.addEventListener("click", openDrawer);
});

drawerClosers.forEach((button) => {
  button.addEventListener("click", closeDrawer);
});

if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    setSidebarCollapsed(!body.classList.contains("sidebar-collapsed"));
  });
}

if (runStartButton) {
  runStartButton.addEventListener("click", startRun);
}

if (runStopButton) {
  runStopButton.addEventListener("click", stopRun);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSettings();
    closeDrawer();
  }

  if (event.key.toLowerCase() === "t" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    toggleTheme();
  }
});

try {
  const savedTheme = localStorage.getItem("vtc-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    setTheme(savedTheme);
  }

  const savedSidebarCollapsed = localStorage.getItem("vtc-sidebar-collapsed");
  if (savedSidebarCollapsed === "true") {
    setSidebarCollapsed(true);
  }
} catch (_error) {
  // Ignore storage errors in static preview mode.
}

setPage("main");
setSettingsTab("general");
resetRunState();
syncScrollLock();
