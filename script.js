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
const languageToggle = document.querySelector("[data-language-toggle]");
const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
const runStartButton = document.querySelector("[data-run-control='start']");
const runStopButton = document.querySelector("[data-run-control='stop']");
const hotkeyCaptureButton = document.querySelector("[data-hotkey-capture='true']");
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
  zh: {
    main: "主控台",
    intro: "说明",
    about: "关于",
  },
  en: {
    main: "Main",
    intro: "Intro",
    about: "About",
  },
};

const stepTitleMap = {
  zh: {
    prepare: "准备输入",
    hotkey: "触发开始",
    play: "播放音频",
    observe: "观察输入",
    settle: "触发停止并等待稳定",
  },
  en: {
    prepare: "Prepare",
    hotkey: "Trigger Start",
    play: "Play Audio",
    observe: "Observe Input",
    settle: "Trigger Stop + Settle",
  },
};

const messages = {
  zh: {
    nav: ["主控台", "说明", "关于", "设置"],
    eyebrow: "本地基准测试工具",
    mainTitle: "主控台",
    mainDesc: "同一套音频测试集，递归扫子文件夹，统一落到 SQLite 结果视图里。",
    run: "开始",
    stop: "停止",
    summaryLabels: ["应用", "测试集", "权限", "设备", "SQLite"],
    summaryValues: ["3 已就绪", "24 / 5 个目录", "已就绪", "BlackHole 2ch", "正常"],
    failureTitle: "运行被阻塞",
    failureMessage: "如果某一步失败，这里会直接说明失败原因、所属 app 和建议动作。",
    sections: ["目标应用", "音频测试集", "批量进度", "实时输入", "结果快照", "运行步骤", "时间线", "运行备注", "结果表"],
    sectionDescs: [
      "自动运行时会高亮当前 app，并把 blocked 项单独标出来。",
      "目录按递归方式扫描，子文件夹直接保留相对路径。",
      "自动运行时，这里实时显示 app、音频和步骤。",
      "这是唯一的文字落点，用来观察 first char 和最终稳定文本。",
      "失败时明确到 app、sample、step；成功时给你留最关键的 timing。",
      "当前步骤会高亮，走完的步骤会保留完成态。",
      "和运行步骤对齐，方便看卡在哪一步。",
      "重要前置条件直接贴在侧边，不用来回翻设置。",
      "横向比较 app 时，SQLite 里最终会存成结构化结果行。",
    ],
    currentLabels: ["当前应用", "当前样本", "当前步骤"],
    resultLabels: ["状态", "首字", "最终延迟", "文本长度"],
    snapshotLabels: ["失败原因", "最终文本", "存储", "音频路径", "触发模式"],
    drawerOpen: "打开详情",
    export: "导出 CSV",
    tableHeaders: ["应用", "样本", "状态", "首字", "最终", "原始文本"],
    introTitle: "说明",
    introDesc: "这一页只讲准备路径，避免你一开始就扎进细碎配置。",
    introHero: "一个偏实验室风格的本地 benchmark 工具。",
    introHeroDesc: "它会递归读取音频测试集子文件夹，驱动多个 app，用统一输入框接收文本，再把时序和结果写进 SQLite。",
    introSteps: ["准备", "配置", "运行"],
    introStepDescs: [
      "装好 BlackHole，确认 target app 已配置好全局热键。",
      "在左侧导航底部打开 Settings，录入 app 文件名、音频根目录和 SQLite 路径。",
      "回到 Main 开始自动运行，看高亮步骤和失败提示。",
    ],
    checklistTitle: "检查清单",
    checklistDesc: "开跑前四项都过，失败率会低很多。",
    checklistItems: ["Accessibility 已授权", "虚拟设备已安装", "目标应用已配置", "递归样本目录已准备"],
    goMain: "回到主控台",
    aboutTitle: "关于",
    aboutDesc: "这里把项目定位、版本、主题和语言支持一次讲清楚。",
    aboutVersion: "Version 0.3.0 prototype",
    aboutHero: "这版原型已经同步了 Vue renderer、app 文件名启动、统一热键输入、双触发模式，以及中英文界面切换。",
    aboutBlocks: ["信息", "路径"],
    aboutMeta: ["平台", "运行时", "存储", "界面模式", "SQLite DB", "日志", "样本根目录"],
    aboutMetaValues: ["macOS 桌面", "Electron + Vue renderer + native helper", "本地 SQLite", "亮 / 暗 + 中 / 英", "~/Library/Application Support/vtc/voice-typing-contest.sqlite", "~/Library/Logs/vtc", "~/benchmarks/vtc-audio-set"],
    openLogs: "打开日志",
    openDb: "打开数据库目录",
    settingsTitle: "设置",
    settingsTabs: ["通用", "目标应用", "音频样本", "时间参数", "设备", "权限", "数据库", "高级"],
    settingsHeaders: ["通用", "目标应用", "音频样本", "时间参数", "设备", "权限", "数据库", "高级"],
    settingsDescs: [
      "环境名、界面语言、默认主题和一些常驻备注放这儿。",
      "左边选 app，右边改 app 文件名、热键和触发模式。",
      "选择一个根目录后，递归吃进去所有子文件夹。",
      "给所有 app 一个一致的默认 timing 基线。",
      "虚拟输出设备和当前可用设备列表。",
      "核心 benchmark 只硬依赖 Accessibility。",
      "结果写入本地 SQLite，导出只是读取层的附加动作。",
      "把容易误触的高权限和重日志选项放到最后。",
    ],
    generalLabels: ["工作区名称", "界面语言", "主题偏好", "默认运行备注"],
    targetLabels: ["名称", "App 文件名", "热键录入", "触发模式", "结果超时"],
    hotkeyCapture: "点击后按任意组合键",
    triggerChoices: ["按住开始 -> 松开结束", "按一次开始 -> 再按一次结束"],
    settingsFooter: ["取消", "应用", "保存并关闭"],
    languageButton: "EN",
  },
  en: {
    nav: ["Main", "Intro", "About", "Settings"],
    eyebrow: "Local Benchmark Tool",
    mainTitle: "Main",
    mainDesc: "Run one recursive audio test set against multiple apps and land results in a SQLite benchmark view.",
    run: "Run",
    stop: "Stop",
    summaryLabels: ["Apps", "Audio Set", "Permission", "Device", "SQLite"],
    summaryValues: ["3 Ready", "24 / 5 folders", "Ready", "BlackHole 2ch", "Healthy"],
    failureTitle: "Run blocked",
    failureMessage: "If a step fails, this banner should tell you the exact app, sample, and suggested action.",
    sections: ["Target Apps", "Audio Test Set", "Batch Progress", "Live Input", "Result Snapshot", "Run Steps", "Timeline", "Run Notes", "Result Table"],
    sectionDescs: [
      "Highlight the active app during autorun and keep blocked entries explicit.",
      "Scan folders recursively and preserve subfolder paths in the list.",
      "Show the current app, sample, and step while autorun is active.",
      "This is the only text sink used to observe first char and final stable text.",
      "On failure, call out the app, sample, and step; on success, keep the key timings visible.",
      "Highlight the current step and keep completed steps dimmed but visible.",
      "Align with the run steps so it is obvious where the flow gets stuck.",
      "Pin critical environment notes on the side instead of burying them in settings.",
      "SQLite eventually stores these rows in a structured format for comparison.",
    ],
    currentLabels: ["Current App", "Current Sample", "Current Step"],
    resultLabels: ["State", "First Char", "Final Latency", "Text Length"],
    snapshotLabels: ["Failure Reason", "Final Text", "Storage", "Audio Path", "Trigger Mode"],
    drawerOpen: "Open Detail",
    export: "Export CSV",
    tableHeaders: ["App", "Sample", "Status", "First Char", "Final", "Raw Text"],
    introTitle: "Intro",
    introDesc: "This page only explains the setup path so you do not get lost in fine-grained settings on first launch.",
    introHero: "A local benchmark tool with a test-lab feel.",
    introHeroDesc: "It walks recursive audio folders, drives multiple apps, captures text in one controlled input, and writes timings plus results into SQLite.",
    introSteps: ["Prepare", "Configure", "Run"],
    introStepDescs: [
      "Install BlackHole and make sure each target app already has a global shortcut configured.",
      "Open Settings from the lower sidebar and fill in app file names, sample root, and SQLite path.",
      "Go back to Main, start autorun, and watch the highlighted steps plus failure feedback.",
    ],
    checklistTitle: "Checklist",
    checklistDesc: "Clear these four items before running if you want fewer false failures.",
    checklistItems: ["Accessibility granted", "Virtual device installed", "Target apps configured", "Recursive sample folder ready"],
    goMain: "Go Main",
    aboutTitle: "About",
    aboutDesc: "This page explains the product shape, version, theme support, and language support in one place.",
    aboutVersion: "Version 0.3.0 prototype",
    aboutHero: "This prototype now reflects the Vue renderer stack, app-file-name startup, unified hotkey capture, dual trigger modes, and zh/en UI switching.",
    aboutBlocks: ["Info", "Paths"],
    aboutMeta: ["Platform", "Runtime", "Storage", "UI Mode", "SQLite DB", "Logs", "Sample Root"],
    aboutMetaValues: ["macOS desktop", "Electron + Vue renderer + native helper", "Local SQLite", "Light / Dark + zh / en", "~/Library/Application Support/vtc/voice-typing-contest.sqlite", "~/Library/Logs/vtc", "~/benchmarks/vtc-audio-set"],
    openLogs: "Open Logs",
    openDb: "Open DB Folder",
    settingsTitle: "Settings",
    settingsTabs: ["General", "Target Apps", "Audio Samples", "Timing", "Devices", "Permissions", "Database", "Advanced"],
    settingsHeaders: ["General", "Target Apps", "Audio Samples", "Timing", "Devices", "Permissions", "Database", "Advanced"],
    settingsDescs: [
      "Workspace name, interface language, preferred theme, and sticky notes live here.",
      "Pick an app on the left, then edit app file name, hotkey capture, and trigger mode on the right.",
      "Choose one root folder and scan every nested subfolder.",
      "Set a shared default timing baseline for every app.",
      "Show the selected virtual output and the currently available devices.",
      "Accessibility is the only hard requirement for the core benchmark path.",
      "Results go into local SQLite; export is just a read-side convenience.",
      "Hide noisy logging and dangerous override options at the end.",
    ],
    generalLabels: ["Workspace label", "Interface language", "Preferred theme", "Default run notes"],
    targetLabels: ["Name", "App file name", "Hotkey capture", "Trigger mode", "Result timeout"],
    hotkeyCapture: "Click and press any key combo",
    triggerChoices: ["hold -> release", "press start -> press stop"],
    settingsFooter: ["Cancel", "Apply", "Save and Close"],
    languageButton: "中文",
  },
};

const runStates = [
  {
    app: "xiguashuo",
    appLabel: "Xiguashuo",
    sample: "mandarin/basic/zh-basic-01.wav",
    step: "prepare",
    progress: 8,
    progressLabel: "1 / 10",
    mode: "hold -> release",
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
    mode: "hold -> release",
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
    mode: "hold -> release",
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
    mode: "hold -> release",
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
    mode: "hold -> release",
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
    mode: "press start -> press stop",
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
    mode: "press start -> press stop",
    liveStatus: "Trigger Start",
    tone: "info",
    resultState: "Triggering",
    firstChar: "--",
    finalLatency: "--",
    textLength: "--",
    text: "start trigger 已发出，等待音频播放。",
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
    mode: "press start -> press stop",
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
    mode: "press start -> press stop",
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
    mode: "press start -> press stop",
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
let currentLanguage = "zh";

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function applyLanguage(language) {
  currentLanguage = language;
  body.dataset.language = language;

  const dict = messages[language];
  const navMain = document.querySelectorAll(".sidebar__nav .nav-item__label");
  const navFooter = document.querySelectorAll(".sidebar__footer .nav-item__label");
  const pageHeaders = document.querySelectorAll(".page-header__copy h2");
  const pageDescs = document.querySelectorAll(".page-header__copy p");
  const sectionTitles = document.querySelectorAll(".main-grid .section-header h3, .result-table-section .section-header h3");
  const sectionDescs = document.querySelectorAll(".main-grid .section-header p, .result-table-section .section-header p");
  const summaryLabels = document.querySelectorAll(".summary-strip .status-chip__label");
  const summaryValues = document.querySelectorAll(".summary-strip .status-chip__value");
  const currentMetricLabels = document.querySelectorAll(".progress-metrics .metric-inline span");
  const resultMetricLabels = document.querySelectorAll(".live-result-summary .metric-tile span");
  const snapshotLabels = document.querySelectorAll(".result-highlight .eyebrow, .result-highlight .metric-block span");
  const introStepTitles = document.querySelectorAll(".intro-step-grid .step-card h4");
  const introStepDescs = document.querySelectorAll(".intro-step-grid .step-card p");
  const checklistRows = document.querySelectorAll(".checklist__row");
  const aboutBlockTitles = document.querySelectorAll(".about-block h4");
  const aboutMetaLabels = document.querySelectorAll(".about-block .meta-list li span");
  const aboutMetaValues = document.querySelectorAll(".about-block .meta-list li strong");
  const settingsTabsEls = document.querySelectorAll(".settings-tab");
  const settingsHeadersEls = document.querySelectorAll(".settings-panel__header h3");
  const settingsDescsEls = document.querySelectorAll(".settings-panel__header p");
  const generalLabels = document.querySelectorAll("[data-settings-panel='general'] .form-row span");
  const targetLabels = document.querySelectorAll("[data-settings-panel='target-apps'] .form-row span");
  const footerButtons = document.querySelectorAll(".settings-modal__footer .btn");
  const tableHeaders = document.querySelectorAll(".result-table th");
  const appTags = document.querySelectorAll(".app-list .tag");
  const stepTitles = document.querySelectorAll(".step-row strong");
  const stepDescs = document.querySelectorAll(".step-row .meta-text");

  setText(navMain[0], dict.nav[0]);
  setText(navMain[1], dict.nav[1]);
  setText(navFooter[0], dict.nav[2]);
  setText(navFooter[1], dict.nav[3]);
  setText(document.querySelector(".top-bar__eyebrow"), dict.eyebrow);
  setText(languageToggle, dict.languageButton);
  setText(document.querySelector('[data-page="main"] .page-header__copy h2'), dict.mainTitle);
  setText(document.querySelector('[data-page="main"] .page-header__copy p'), dict.mainDesc);
  setText(runStartButton?.querySelector("span"), dict.run);
  setText(runStopButton?.querySelector("span"), dict.stop);

  summaryLabels.forEach((el, index) => setText(el, dict.summaryLabels[index]));
  summaryValues.forEach((el, index) => setText(el, dict.summaryValues[index]));
  setText(failureTitle, dict.failureTitle);
  setText(failureMessage, dict.failureMessage);

  sectionTitles.forEach((el, index) => setText(el, dict.sections[index]));
  sectionDescs.forEach((el, index) => setText(el, dict.sectionDescs[index]));
  currentMetricLabels.forEach((el, index) => setText(el, dict.currentLabels[index]));
  resultMetricLabels.forEach((el, index) => setText(el, dict.resultLabels[index]));
  snapshotLabels.forEach((el, index) => setText(el, dict.snapshotLabels[index]));
  setText(document.querySelector("[data-open-drawer] span"), dict.drawerOpen);
  setText(document.querySelector(".result-table-section .btn"), dict.export);
  tableHeaders.forEach((el, index) => setText(el, dict.tableHeaders[index]));

  setText(pageHeaders[1], dict.introTitle);
  setText(pageDescs[1], dict.introDesc);
  setText(document.querySelector(".hero-card__copy h3"), dict.introHero);
  setText(document.querySelector(".hero-card__copy p"), dict.introHeroDesc);
  introStepTitles.forEach((el, index) => setText(el, dict.introSteps[index]));
  introStepDescs.forEach((el, index) => setText(el, dict.introStepDescs[index]));
  setText(document.querySelector(".intro-checklist .section-header h3"), dict.checklistTitle);
  setText(document.querySelector(".intro-checklist .section-header p"), dict.checklistDesc);
  checklistRows.forEach((row, index) => {
    const textNode = row.lastChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      textNode.textContent = dict.checklistItems[index];
    } else {
      row.append(dict.checklistItems[index]);
    }
  });
  setText(document.querySelector('[data-page="intro"] .page-actions .btn'), dict.goMain);

  setText(pageHeaders[2], dict.aboutTitle);
  setText(pageDescs[2], dict.aboutDesc);
  setText(document.querySelector(".about-card__hero h3"), dict.aboutVersion);
  setText(document.querySelector(".about-card__hero > p"), dict.aboutHero);
  aboutBlockTitles.forEach((el, index) => setText(el, dict.aboutBlocks[index]));
  aboutMetaLabels.forEach((el, index) => setText(el, dict.aboutMeta[index]));
  aboutMetaValues.forEach((el, index) => setText(el, dict.aboutMetaValues[index]));
  const aboutButtons = document.querySelectorAll('[data-page="about"] .page-actions .btn');
  setText(aboutButtons[0], dict.openLogs);
  setText(aboutButtons[1], dict.openDb);

  setText(document.querySelector("#settings-title"), dict.settingsTitle);
  settingsTabsEls.forEach((el, index) => setText(el, dict.settingsTabs[index]));
  settingsHeadersEls.forEach((el, index) => setText(el, dict.settingsHeaders[index]));
  settingsDescsEls.forEach((el, index) => setText(el, dict.settingsDescs[index]));
  generalLabels.forEach((el, index) => setText(el, dict.generalLabels[index]));
  targetLabels.forEach((el, index) => setText(el, dict.targetLabels[index]));
  setText(hotkeyCaptureButton, dict.hotkeyCapture);
  const choicePills = document.querySelectorAll(".choice-pill");
  choicePills.forEach((el, index) => setText(el, dict.triggerChoices[index]));
  footerButtons.forEach((el, index) => setText(el, dict.settingsFooter[index]));

  appTags.forEach((tag, index) => {
    setText(tag, index === 1 ? dict.triggerChoices[1] : dict.triggerChoices[0]);
  });
  setText(stepTitles[0], stepTitleMap[language].prepare);
  setText(stepTitles[1], stepTitleMap[language].hotkey);
  setText(stepTitles[2], stepTitleMap[language].play);
  setText(stepTitles[3], stepTitleMap[language].observe);
  setText(stepTitles[4], stepTitleMap[language].settle);
  setText(stepDescs[0], language === "zh" ? "聚焦输入框并清空上一次文本" : "focus the input box and clear previous text");
  setText(stepDescs[1], language === "zh" ? "发送已录入组合键，作为开始触发" : "send the captured shortcut as the start trigger");
  setText(stepDescs[2], language === "zh" ? "把 wav 路由到指定虚拟设备" : "route the wav sample to the configured virtual device");
  setText(stepDescs[3], language === "zh" ? "观察 first text 和原始输出" : "watch first text and collect raw output");
  setText(stepDescs[4], language === "zh" ? "松开或再按一次，然后等待文本稳定" : "release or press again, then wait for stable text");

  setPage(document.querySelector(".page-root.is-active")?.dataset.page || "main");
  if (runIndex >= 0) {
    updateRunState(runStates[runIndex]);
  } else {
    resetRunState();
  }
}

function normalizeHotkey(event) {
  const parts = [];
  if (event.metaKey) {
    parts.push("Cmd");
  }
  if (event.ctrlKey) {
    parts.push("Ctrl");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }

  const rawKey = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const map = {
    " ": "Space",
    Escape: "Esc",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
  };
  const key = map[rawKey] || rawKey;

  if (!["Meta", "Control", "Alt", "Shift"].includes(event.key)) {
    parts.push(key);
  }

  return parts.join(" + ");
}

function setPage(pageName) {
  pageRoots.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === pageName);
  });

  pageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.pageTarget === pageName);
  });

  if (pageTitle) {
    pageTitle.textContent = pageTitleMap[currentLanguage][pageName] || pageName;
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
  currentStep.textContent = stepTitleMap[currentLanguage][state.step] || state.step;
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
  currentStep.textContent = currentLanguage === "zh" ? "等待中" : "Waiting";
  progressText.textContent = currentLanguage === "zh" ? "空闲" : "Idle";
  progressValue.style.width = "0%";
  setTone(liveState, "info", currentLanguage === "zh" ? "空闲" : "Idle");
  metricState.textContent = currentLanguage === "zh" ? "空闲" : "Idle";
  metricFirstChar.textContent = "--";
  metricFinal.textContent = "--";
  metricLength.textContent = "--";
  liveText.value = "点击 Run 后，这里会跟着自动运行状态一起变化。";
  snapshotFailure.textContent = "--";
  snapshotText.textContent = currentLanguage === "zh" ? "还没有开始运行。" : "No run yet.";
  snapshotSample.textContent = "--";
  snapshotMode.textContent = "--";
  drawerTitle.textContent = "Xiguashuo / mandarin/basic/zh-basic-01.wav";
  drawerApp.textContent = "Xiguashuo";
  drawerSample.textContent = "mandarin/basic/zh-basic-01.wav";
  drawerStatus.textContent = currentLanguage === "zh" ? "空闲" : "idle";
  drawerText.textContent = currentLanguage === "zh" ? "点击开始后，这里会跟着当前状态刷新。" : "Click Run and this panel updates with the current state.";
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

  setTone(liveState, "warning", currentLanguage === "zh" ? "已停止" : "Stopped");
  progressText.textContent = runIndex >= 0
    ? currentLanguage === "zh"
      ? `停止于 ${runStates[runIndex].progressLabel}`
      : `Stopped @ ${runStates[runIndex].progressLabel}`
    : currentLanguage === "zh"
      ? "已停止"
      : "Stopped";
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

if (languageToggle) {
  languageToggle.addEventListener("click", () => {
    applyLanguage(currentLanguage === "zh" ? "en" : "zh");
    try {
      localStorage.setItem("vtc-language", currentLanguage);
    } catch (_error) {
      // Ignore storage errors in static preview mode.
    }
  });
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

if (hotkeyCaptureButton) {
  hotkeyCaptureButton.addEventListener("click", () => {
    hotkeyCaptureButton.dataset.capturing = "true";
    hotkeyCaptureButton.textContent = currentLanguage === "zh" ? "请现在按组合键..." : "Press the combo now...";
  });
}

document.addEventListener("keydown", (event) => {
  if (hotkeyCaptureButton?.dataset.capturing === "true") {
    event.preventDefault();
    hotkeyCaptureButton.textContent = normalizeHotkey(event) || messages[currentLanguage].hotkeyCapture;
    hotkeyCaptureButton.dataset.capturing = "false";
    return;
  }

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

  const savedLanguage = localStorage.getItem("vtc-language");
  if (savedLanguage === "zh" || savedLanguage === "en") {
    currentLanguage = savedLanguage;
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
applyLanguage(currentLanguage);
syncScrollLock();
