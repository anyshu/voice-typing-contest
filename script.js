const STEP_SEQUENCE = ["prepare", "hotkey", "play", "observe", "settle"];

const TRANSLATIONS = {
  zh: {
    nav: { main: "主控台", intro: "说明", about: "关于", settings: "设置" },
    pageTitle: { main: "主控台", intro: "说明", about: "关于" },
    topEyebrow: "本地基准测试工具",
    topActionLanguage: "EN",
    main: {
      title: "主控台",
      desc: "同一套音频测试集，递归扫子文件夹，统一落到 SQLite 结果视图里。",
      run: "开始",
      stop: "停止",
    },
    summary: {
      apps: "应用",
      samples: "测试集",
      permission: "权限",
      device: "设备",
      database: "SQLite",
      ready: "已就绪",
      blocked: "阻塞",
      healthy: "正常",
      folders: "个目录",
    },
    sections: {
      targetApps: ["目标应用", "自动运行时会高亮当前 app，并把 blocked 项单独标出来。"],
      audioSet: ["音频测试集", "目录按递归方式扫描，子文件夹直接保留相对路径。"],
      progress: ["批量进度", "自动运行时，这里实时显示 app、音频和步骤。"],
      liveInput: ["输入检测区", "这是统一的输入检测区，用来确认文本是否命中测试落点，并观察 first char 与最终稳定文本。"],
      snapshot: ["结果快照", "失败时明确到 app、sample、step；成功时给你留最关键的 timing。"],
      runSteps: ["运行步骤", "当前步骤会高亮，走完的步骤会保留完成态。"],
      timeline: ["时间线", "和 Run Steps 对齐，方便看卡在哪一步。"],
      notes: ["运行备注", "重要前置条件直接贴在侧边，不用来回翻设置。"],
      results: ["结果表", "横向比较 app 时，SQLite 里最终会存成结构化结果行。"],
    },
    currentLabels: {
      app: "当前应用",
      sample: "当前样本",
      step: "当前步骤",
      idle: "空闲",
      waiting: "等待中",
      completed: "批量完成",
      stopped: "已停止",
    },
    metricLabels: {
      state: "状态",
      firstChar: "首字",
      finalLatency: "最终延迟",
      textLength: "文本长度",
    },
    snapshotLabels: {
      failure: "失败原因",
      finalText: "最终文本",
      storage: "存储",
      audioPath: "音频路径",
      triggerMode: "触发模式",
      notStarted: "还没有开始运行。",
    },
    table: {
      app: "应用",
      sample: "样本",
      status: "状态",
      firstChar: "首字",
      final: "最终",
      rawText: "原始文本",
      export: "导出 CSV",
      empty: "还没有结果。先跑一轮。",
    },
    intro: {
      title: "说明",
      desc: "这一页只讲准备路径，避免你一开始就扎进细碎配置。",
      eyebrow: "Voice Typing Contest",
      heroTitle: "一个偏实验室风格的本地 benchmark 工具。",
      heroDesc: "它会递归读取音频测试集的子文件夹，驱动多个 app，用统一输入检测区接收文本，再把时序和结果写进 SQLite。",
      steps: [
        ["Prepare", "装好 BlackHole，确认 target app 已配置好全局热键。"],
        ["Configure", "在左侧导航底部打开 Settings，录入 app、音频根目录和 SQLite 路径。"],
        ["Run", "回到 Main 开始自动运行，看高亮步骤和失败提示。"],
      ],
      checklistTitle: "检查清单",
      checklistDesc: "开跑前四项都过，失败率会低很多。",
      checklist: ["Accessibility 已授权", "虚拟设备已安装", "目标应用已配置", "递归样本目录已准备"],
      goMain: "回到主控台",
    },
    about: {
      title: "关于",
      desc: "这里把项目定位、版本、主题支持和本地路径一次讲清楚。",
      eyebrow: "Voice Typing Contest",
      version: "Version 0.4.0 prototype",
      hero: "这版先把 renderer 从静态稿推进成可交互原型：设置能改、批量运行会走完整步骤、结果表和详情抽屉都跟着状态更新。",
      blocks: ["信息", "路径"],
      meta: ["平台", "运行时", "存储", "界面模式", "SQLite DB", "日志", "样本根目录"],
      openLogs: "打开日志",
      openDb: "打开数据库目录",
    },
    settings: {
      eyebrow: "配置",
      title: "设置",
      tabs: {
        general: "通用",
        targetApps: "目标应用",
        audioSamples: "音频样本",
        timing: "时间参数",
        devices: "设备",
        permissions: "权限",
        database: "数据库",
        advanced: "高级",
      },
      footer: { cancel: "取消", apply: "应用", save: "保存并关闭" },
      general: {
        title: "通用",
        desc: "环境名、默认主题和一些常驻备注放这儿。",
        workspaceLabel: "工作区名称",
        language: "界面语言",
        theme: "主题偏好",
        runNotes: "默认运行备注",
      },
      targetApps: {
        title: "目标应用",
        desc: "左边选 app，右边改 app 文件名、热键和触发模式。",
        add: "+ Add App",
        remove: "Remove App",
        enabled: "启用",
        name: "名称",
        appFileName: "App 文件名",
        hotkey: "热键录入",
        triggerMode: "触发模式",
        timeout: "结果超时",
        readyState: "模拟 readiness",
        blockedReason: "阻塞原因",
      },
      audioSamples: {
        title: "音频样本",
        desc: "选择一个根目录后，递归吃进去所有子文件夹。",
        root: "样本根目录",
        choose: "选择",
        rescan: "重新扫描",
        duration: "时长",
        locale: "语言",
        expected: "预期文本",
      },
      timing: {
        title: "时间参数",
        desc: "给所有 app 一个一致的默认 timing 基线。",
        preHotkey: "preHotkeyDelay",
        hotkeyToAudio: "hotkeyToAudioDelay",
        audioToStop: "audioToTriggerStop",
        settleWindow: "settleWindow",
        resultTimeout: "默认超时",
      },
      devices: {
        title: "设备",
        desc: "虚拟输出设备和当前可用设备列表。",
        selected: "当前虚拟输出",
        recheck: "重新检测",
        available: "available",
        unavailable: "unavailable",
      },
      permissions: {
        title: "权限",
        desc: "核心 benchmark 只硬依赖 Accessibility。",
        required: "Required",
        optional: "Optional",
        toggle: "切换状态",
        granted: "Granted",
        missing: "Missing",
      },
      database: {
        title: "数据库",
        desc: "结果写入本地 SQLite，导出只是读取层的附加动作。",
        dbPath: "SQLite DB path",
        logFolder: "Log folder",
        choose: "选择",
        export: "导出 CSV",
      },
      advanced: {
        title: "高级",
        desc: "把容易误触的高权限和重日志选项放到最后。",
        storePayloads: "保存原始事件 payload",
        verbose: "启用 verbose log",
        retryCount: "失败重试次数",
        helperPath: "Helper path override",
      },
    },
    run: {
      liveIdle: "空闲",
      preparing: "准备中",
      triggering: "触发开始",
      playing: "播放音频",
      observing: "观察输入",
      settling: "等待稳定",
      success: "成功",
      timeout: "超时",
      retry: "需复查",
      partial: "部分成功",
      openDetail: "打开详情",
      noFailure: "--",
      livePlaceholder: "点击 Run 后，这里会跟着自动运行状态一起变化。",
      capturing: "请现在按组合键...",
      hotkeyButton: "点击后按任意组合键",
      planProgress: (current, total) => `${current} / ${total}`,
      stoppedAt: (label) => `停止于 ${label}`,
      complete: "全部完成",
    },
    mode: {
      hold_release: "按住开始 -> 松开结束",
      press_start_press_stop: "按一次开始 -> 再按一次结束",
    },
    appState: {
      ready: "Ready",
      blocked: "Blocked",
      disabled: "Disabled",
    },
    sampleState: {
      expectedReady: "expected text ready",
      expectedMissing: "no expected text",
    },
    status: {
      success: "OK",
      timeout: "Timeout",
      retry: "Retry",
      partial: "Partial",
      blocked: "Blocked",
      running: "Running",
      idle: "Idle",
    },
    step: {
      prepare: ["准备输入", "聚焦输入检测区并清空上一次文本"],
      hotkey: ["触发开始", "发送已录入组合键，作为开始触发"],
      play: ["播放音频", "把 wav 路由到指定虚拟设备"],
      observe: ["观察输入", "观察 first text 和原始输出"],
      settle: ["触发停止并等待稳定", "松开或再按一次，然后等待文本稳定"],
    },
    timeline: {
      prepare: ["prepare input", "focus benchmark textarea"],
      hotkey: ["hotkey down", "Quartz event injected"],
      play: ["audio start", "virtual device playback"],
      observe: ["first text", "input delta observed"],
      settle: ["result settled", "settle window closed"],
    },
    notes: {
      defaultLines: [
        "SQLite path 固定，结果可回放，导出只是附加功能。",
        "Accessibility required，Automation 和 Input Monitoring 是补充能力。",
        "target app 先按安装后的 `.app` 文件名识别，不依赖 Bundle ID。",
        "Vue renderer 需要走 i18n，避免把界面文案写死在组件里。",
      ],
      liveRunning: "当前批次正在推进，结果表会边跑边追加。",
      liveBlocked: "这轮跑不起来时，先看权限、设备和 app readiness。",
      liveReady: "设置改完直接生效；真正接 Electron 主进程时，把这份状态换成 IPC 数据源就行。",
    },
    preflight: {
      blockedTitle: "运行被阻塞",
      accessibility: "Accessibility 没授权。先授权，不然没法发系统级热键。",
      device: "选中的虚拟设备当前不可用。先确认 BlackHole 之类的虚拟设备还在。",
      apps: "没有可运行的目标 app。至少保留一个启用且 Ready 的 app。",
      samples: "样本列表是空的。先准备 WAV 测试集。",
      database: "SQLite 路径为空。先把结果落盘路径补上。",
    },
  },
  en: {
    nav: { main: "Main", intro: "Intro", about: "About", settings: "Settings" },
    pageTitle: { main: "Main", intro: "Intro", about: "About" },
    topEyebrow: "Local Benchmark Tool",
    topActionLanguage: "中文",
    main: {
      title: "Main",
      desc: "Run one recursive audio test set against multiple apps and land results in a SQLite benchmark view.",
      run: "Run",
      stop: "Stop",
    },
    summary: {
      apps: "Apps",
      samples: "Audio Set",
      permission: "Permission",
      device: "Device",
      database: "SQLite",
      ready: "Ready",
      blocked: "Blocked",
      healthy: "Healthy",
      folders: "folders",
    },
    sections: {
      targetApps: ["Target Apps", "Highlight the active app during autorun and keep blocked entries explicit."],
      audioSet: ["Audio Test Set", "Scan folders recursively and preserve subfolder paths in the list."],
      progress: ["Batch Progress", "Show the current app, sample, and step while autorun is active."],
      liveInput: ["Input Probe", "This shared input probe confirms text lands on the test target and lets you observe the first char and final stable text."],
      snapshot: ["Result Snapshot", "On failure, call out the app, sample, and step; on success, keep the key timings visible."],
      runSteps: ["Run Steps", "Highlight the current step and keep completed steps visible."],
      timeline: ["Timeline", "Align with the run steps so it is obvious where the flow gets stuck."],
      notes: ["Run Notes", "Pin critical environment notes instead of burying them in settings."],
      results: ["Result Table", "SQLite eventually stores these rows in a structured format for comparison."],
    },
    currentLabels: {
      app: "Current App",
      sample: "Current Sample",
      step: "Current Step",
      idle: "Idle",
      waiting: "Waiting",
      completed: "Batch complete",
      stopped: "Stopped",
    },
    metricLabels: {
      state: "State",
      firstChar: "First Char",
      finalLatency: "Final Latency",
      textLength: "Text Length",
    },
    snapshotLabels: {
      failure: "Failure Reason",
      finalText: "Final Text",
      storage: "Storage",
      audioPath: "Audio Path",
      triggerMode: "Trigger Mode",
      notStarted: "No run yet.",
    },
    table: {
      app: "App",
      sample: "Sample",
      status: "Status",
      firstChar: "First Char",
      final: "Final",
      rawText: "Raw Text",
      export: "Export CSV",
      empty: "No result yet. Run a batch first.",
    },
    intro: {
      title: "Intro",
      desc: "This page only explains the setup path so you do not get lost in fine-grained settings on first launch.",
      eyebrow: "Voice Typing Contest",
      heroTitle: "A local benchmark tool with a test-lab feel.",
      heroDesc: "It walks recursive audio folders, drives multiple apps, captures text in one controlled input, and writes timings plus results into SQLite.",
      steps: [
        ["Prepare", "Install BlackHole and make sure each target app already has a global shortcut configured."],
        ["Configure", "Open Settings from the lower sidebar and fill in app file names, sample root, and SQLite path."],
        ["Run", "Go back to Main, start autorun, and watch the highlighted steps plus failure feedback."],
      ],
      checklistTitle: "Checklist",
      checklistDesc: "Clear these four items before running if you want fewer false failures.",
      checklist: ["Accessibility granted", "Virtual device installed", "Target apps configured", "Recursive sample folder ready"],
      goMain: "Go Main",
    },
    about: {
      title: "About",
      desc: "This page explains the product shape, version, theme support, and local paths in one place.",
      eyebrow: "Voice Typing Contest",
      version: "Version 0.4.0 prototype",
      hero: "This pass moves the renderer from a static mock into an interactive prototype: settings are editable, autorun walks the full step sequence, and the result drawer follows live state.",
      blocks: ["Info", "Paths"],
      meta: ["Platform", "Runtime", "Storage", "UI Mode", "SQLite DB", "Logs", "Sample Root"],
      openLogs: "Open Logs",
      openDb: "Open DB Folder",
    },
    settings: {
      eyebrow: "Configuration",
      title: "Settings",
      tabs: {
        general: "General",
        targetApps: "Target Apps",
        audioSamples: "Audio Samples",
        timing: "Timing",
        devices: "Devices",
        permissions: "Permissions",
        database: "Database",
        advanced: "Advanced",
      },
      footer: { cancel: "Cancel", apply: "Apply", save: "Save and Close" },
      general: {
        title: "General",
        desc: "Workspace name, preferred theme, and sticky notes live here.",
        workspaceLabel: "Workspace label",
        language: "Interface language",
        theme: "Preferred theme",
        runNotes: "Default run notes",
      },
      targetApps: {
        title: "Target Apps",
        desc: "Pick an app on the left, then edit app file name, hotkey, and trigger mode.",
        add: "+ Add App",
        remove: "Remove App",
        enabled: "Enabled",
        name: "Name",
        appFileName: "App file name",
        hotkey: "Hotkey capture",
        triggerMode: "Trigger mode",
        timeout: "Result timeout",
        readyState: "Simulated readiness",
        blockedReason: "Blocked reason",
      },
      audioSamples: {
        title: "Audio Samples",
        desc: "Choose one root folder and scan every nested subfolder.",
        root: "Sample root folder",
        choose: "Choose",
        rescan: "Rescan",
        duration: "Duration",
        locale: "Locale",
        expected: "Expected text",
      },
      timing: {
        title: "Timing",
        desc: "Set one shared timing baseline for every app.",
        preHotkey: "preHotkeyDelay",
        hotkeyToAudio: "hotkeyToAudioDelay",
        audioToStop: "audioToTriggerStop",
        settleWindow: "settleWindow",
        resultTimeout: "default result timeout",
      },
      devices: {
        title: "Devices",
        desc: "Show the selected virtual output and the currently available devices.",
        selected: "Selected virtual output",
        recheck: "Recheck",
        available: "available",
        unavailable: "unavailable",
      },
      permissions: {
        title: "Permissions",
        desc: "Accessibility is the only hard requirement for the core benchmark path.",
        required: "Required",
        optional: "Optional",
        toggle: "Toggle state",
        granted: "Granted",
        missing: "Missing",
      },
      database: {
        title: "Database",
        desc: "Results go into local SQLite; export is just a read-side convenience.",
        dbPath: "SQLite DB path",
        logFolder: "Log folder",
        choose: "Choose",
        export: "Export CSV",
      },
      advanced: {
        title: "Advanced",
        desc: "Hide noisy logging and dangerous override options at the end.",
        storePayloads: "Store raw event payloads",
        verbose: "Enable verbose log",
        retryCount: "Retry failed sample count",
        helperPath: "Helper path override",
      },
    },
    run: {
      liveIdle: "Idle",
      preparing: "Preparing",
      triggering: "Triggering",
      playing: "Playing Audio",
      observing: "Observing",
      settling: "Settling",
      success: "Success",
      timeout: "Timeout",
      retry: "Retry",
      partial: "Partial",
      openDetail: "Open Detail",
      noFailure: "--",
      livePlaceholder: "Click Run and this panel updates with the current state.",
      capturing: "Press the combo now...",
      hotkeyButton: "Click and press any key combo",
      planProgress: (current, total) => `${current} / ${total}`,
      stoppedAt: (label) => `Stopped @ ${label}`,
      complete: "Completed",
    },
    mode: {
      hold_release: "hold -> release",
      press_start_press_stop: "press start -> press stop",
    },
    appState: {
      ready: "Ready",
      blocked: "Blocked",
      disabled: "Disabled",
    },
    sampleState: {
      expectedReady: "expected text ready",
      expectedMissing: "no expected text",
    },
    status: {
      success: "OK",
      timeout: "Timeout",
      retry: "Retry",
      partial: "Partial",
      blocked: "Blocked",
      running: "Running",
      idle: "Idle",
    },
    step: {
      prepare: ["Prepare", "focus the input box and clear previous text"],
      hotkey: ["Trigger Start", "send the captured shortcut as the start trigger"],
      play: ["Play Audio", "route the wav sample to the configured virtual device"],
      observe: ["Observe Input", "watch first text and collect raw output"],
      settle: ["Trigger Stop + Settle", "release or press again, then wait for stable text"],
    },
    timeline: {
      prepare: ["prepare input", "focus benchmark textarea"],
      hotkey: ["hotkey down", "Quartz event injected"],
      play: ["audio start", "virtual device playback"],
      observe: ["first text", "input delta observed"],
      settle: ["result settled", "settle window closed"],
    },
    notes: {
      defaultLines: [
        "SQLite path is fixed so results stay replayable; CSV export is only a read-side helper.",
        "Accessibility is required. Automation and Input Monitoring stay optional in v1.",
        "Target apps are identified by installed `.app` file name instead of bundle id.",
        "The Vue renderer should route strings through i18n instead of hard-coding copy in components.",
      ],
      liveRunning: "A batch is in flight, so the result table updates sample by sample.",
      liveBlocked: "If a run is blocked, check permissions, devices, and app readiness first.",
      liveReady: "Once Electron main process exists, this state can move behind IPC without changing the renderer layout.",
    },
    preflight: {
      blockedTitle: "Run blocked",
      accessibility: "Accessibility is missing, so the tool cannot send system-level hotkeys.",
      device: "The selected virtual device is unavailable. Reconnect or re-create the virtual audio path first.",
      apps: "No runnable target app remains. Keep at least one enabled app in Ready state.",
      samples: "The sample set is empty. Add WAV files before running.",
      database: "SQLite path is empty. Set a persistent result path first.",
    },
  },
};

const refs = {
  body: document.body,
  pageButtons: Array.from(document.querySelectorAll("[data-page-target]")),
  pageRoots: Array.from(document.querySelectorAll("[data-page]")),
  pageTitle: document.querySelector("[data-page-title]"),
  sidebarMainItems: Array.from(document.querySelectorAll(".sidebar__nav .nav-item")),
  sidebarFooterItems: Array.from(document.querySelectorAll(".sidebar__footer .nav-item")),
  topEyebrow: document.querySelector(".top-bar__eyebrow"),
  languageToggle: document.querySelector("[data-language-toggle]"),
  themeToggle: document.querySelector("[data-theme-toggle]"),
  sidebarToggle: document.querySelector("[data-sidebar-toggle]"),
  runStartButton: document.querySelector("[data-run-control='start']"),
  runStopButton: document.querySelector("[data-run-control='stop']"),
  mainHeaderTitle: document.querySelector('[data-page="main"] .page-header__copy h2'),
  mainHeaderDesc: document.querySelector('[data-page="main"] .page-header__copy p'),
  summaryStrip: document.querySelector("[data-summary-strip], .summary-strip"),
  failureBanner: document.querySelector("[data-failure-banner]"),
  failureTitle: document.querySelector("[data-failure-title]"),
  failureMessage: document.querySelector("[data-failure-message]"),
  appList: document.querySelector("[data-app-list]"),
  sampleTree: document.querySelector("[data-sample-tree]"),
  progressLabel: document.querySelector("[data-progress-text]"),
  progressValue: document.querySelector("[data-progress-value]"),
  currentApp: document.querySelector("[data-current-app]"),
  currentSample: document.querySelector("[data-current-sample]"),
  currentStep: document.querySelector("[data-current-step]"),
  liveState: document.querySelector("[data-live-state]"),
  liveText: document.querySelector("[data-live-text]"),
  metricState: document.querySelector("[data-metric-state]"),
  metricFirstChar: document.querySelector("[data-metric-first-char]"),
  metricFinal: document.querySelector("[data-metric-final]"),
  metricLength: document.querySelector("[data-metric-length]"),
  snapshotFailure: document.querySelector("[data-snapshot-failure]"),
  snapshotText: document.querySelector("[data-snapshot-text]"),
  snapshotSample: document.querySelector("[data-snapshot-sample]"),
  snapshotMode: document.querySelector("[data-snapshot-mode]"),
  mainOpenDrawerButtons: Array.from(document.querySelectorAll('[data-page="main"] [data-open-drawer]')),
  stepList: document.querySelector("[data-step-list]"),
  mainTimeline: document.querySelector("[data-main-timeline]"),
  runNotes: document.querySelector("[data-run-notes]"),
  resultTableBody: document.querySelector("[data-result-table-body]"),
  resultTableExportButton: document.querySelector(".result-table-section .btn"),
  introHeaderTitle: document.querySelector('[data-page="intro"] .page-header__copy h2'),
  introHeaderDesc: document.querySelector('[data-page="intro"] .page-header__copy p'),
  introEyebrow: document.querySelector(".hero-card__copy .eyebrow"),
  introHeroTitle: document.querySelector(".hero-card__copy h3"),
  introHeroDesc: document.querySelector(".hero-card__copy p"),
  introStepCards: Array.from(document.querySelectorAll(".intro-step-grid .step-card")),
  introChecklistTitle: document.querySelector(".intro-checklist .section-header h3"),
  introChecklistDesc: document.querySelector(".intro-checklist .section-header p"),
  introChecklist: document.querySelector(".checklist"),
  introGoMain: document.querySelector('[data-page="intro"] .page-actions .btn'),
  aboutHeaderTitle: document.querySelector('[data-page="about"] .page-header__copy h2'),
  aboutHeaderDesc: document.querySelector('[data-page="about"] .page-header__copy p'),
  aboutEyebrow: document.querySelector(".about-card__hero .eyebrow"),
  aboutVersion: document.querySelector(".about-card__hero h3"),
  aboutHero: document.querySelector(".about-card__hero > p"),
  aboutBlockTitles: Array.from(document.querySelectorAll(".about-block h4")),
  aboutMetaLists: Array.from(document.querySelectorAll(".about-block .meta-list")),
  aboutButtons: Array.from(document.querySelectorAll('[data-page="about"] .page-actions .btn')),
  settingsOverlay: document.querySelector("[data-overlay]"),
  settingsTitle: document.querySelector("#settings-title"),
  settingsEyebrow: document.querySelector(".settings-modal__header .eyebrow"),
  settingsTabs: Array.from(document.querySelectorAll(".settings-tab")),
  settingsPanels: Array.from(document.querySelectorAll(".settings-panel")),
  settingsFooterButtons: {
    cancel: document.querySelector('[data-settings-action="cancel"]'),
    apply: document.querySelector('[data-settings-action="apply"]'),
    save: document.querySelector('.settings-modal__footer [data-close-settings="true"]'),
  },
  settingsOpeners: Array.from(document.querySelectorAll("[data-open-settings]")),
  settingsClosers: Array.from(document.querySelectorAll("[data-dismiss-settings], [data-close-settings]")),
  drawer: document.querySelector("[data-drawer]"),
  drawerOpeners: Array.from(document.querySelectorAll("[data-open-drawer]")),
  drawerClosers: Array.from(document.querySelectorAll("[data-close-drawer]")),
  drawerTitle: document.querySelector("[data-drawer-title]"),
  drawerApp: document.querySelector("[data-drawer-app]"),
  drawerSample: document.querySelector("[data-drawer-sample]"),
  drawerStatus: document.querySelector("[data-drawer-status]"),
  drawerText: document.querySelector("[data-drawer-text]"),
  drawerFirstChar: document.querySelector("[data-drawer-first-char]"),
  drawerFinal: document.querySelector("[data-drawer-final]"),
  drawerLength: document.querySelector("[data-drawer-length]"),
  drawerFailure: document.querySelector("[data-drawer-failure]"),
  drawerTimeline: document.querySelector("[data-drawer-timeline]"),
};

const STORAGE_KEYS = {
  theme: "vtc-theme",
  locale: "vtc-language",
  sidebar: "vtc-sidebar-collapsed",
  config: "vtc-config-v1",
};

const MODIFIER_KEYS = ["Meta", "Control", "Alt", "Shift"];

function createDefaultConfig() {
  return {
    general: {
      workspaceLabel: "Contest Lab MacBook",
      locale: "zh",
      theme: "light",
      runNotes: "Keep VTC frontmost during sample runs.\nVue renderer strings should go through i18n.\nOnly Accessibility is required for the core benchmark path.",
    },
    apps: [
      {
        id: "xiguashuo",
        name: "Xiguashuo",
        appFileName: "Xiguashuo.app",
        hotkey: "Cmd + Shift + 1",
        mode: "hold_release",
        timeoutMs: 5000,
        enabled: true,
        ready: true,
        blockedReason: "",
      },
      {
        id: "wispr-flow",
        name: "Wispr Flow",
        appFileName: "Wispr Flow.app",
        hotkey: "Option + Space",
        mode: "press_start_press_stop",
        timeoutMs: 5000,
        enabled: true,
        ready: true,
        blockedReason: "",
      },
      {
        id: "app-c",
        name: "App C",
        appFileName: "App C.app",
        hotkey: "Ctrl + Shift + 9",
        mode: "hold_release",
        timeoutMs: 5000,
        enabled: false,
        ready: false,
        blockedReason: "App file not found",
      },
    ],
    samples: [
      {
        id: "zh-basic-01",
        path: "mandarin/basic/zh-basic-01.wav",
        durationSec: 2.4,
        locale: "zh",
        expectedText: "你好，今天我们开始测试 voice typing contest。",
      },
      {
        id: "zh-basic-02",
        path: "mandarin/basic/zh-basic-02.wav",
        durationSec: 3.1,
        locale: "zh",
        expectedText: "这是一条更长一点的中文样本，用来比较稳定性。",
      },
      {
        id: "zh-noisy-04",
        path: "mandarin/noisy/zh-noisy-04.wav",
        durationSec: 4.9,
        locale: "zh",
        expectedText: "你好，今天我们开始测试。",
      },
      {
        id: "en-short-03",
        path: "english/short/en-short-03.wav",
        durationSec: 1.8,
        locale: "en",
        expectedText: "Testing voice typing with one short English sentence.",
      },
    ],
    sampleRoot: "/Users/hc/benchmarks/vtc-audio-set",
    timing: {
      preHotkeyDelayMs: 180,
      hotkeyToAudioDelayMs: 120,
      audioToTriggerStopDelayMs: 160,
      settleWindowMs: 600,
      defaultResultTimeoutMs: 5000,
    },
    devices: {
      selectedId: "blackhole-2ch",
      items: [
        { id: "blackhole-2ch", name: "BlackHole 2ch", available: true },
        { id: "speakers", name: "MacBook Pro Speakers", available: true },
        { id: "usb-audio", name: "External USB Audio", available: false },
      ],
    },
    permissions: [
      { id: "accessibility", name: "Accessibility", required: true, granted: true },
      { id: "automation", name: "Automation", required: false, granted: false },
      { id: "input-monitoring", name: "Input Monitoring", required: false, granted: false },
    ],
    database: {
      dbPath: "~/Library/Application Support/vtc/voice-typing-contest.sqlite",
      logFolder: "~/Library/Logs/vtc",
    },
    advanced: {
      storeRawPayloads: false,
      verboseLog: true,
      retryFailedSampleCount: 0,
      helperPath: "~/Applications/VTC Helper.app",
    },
  };
}

function buildSeedResults(config) {
  return [
    createResultRecord(config.apps[0], config.samples[0], 0),
    createResultRecord(config.apps[1], config.samples[3], 1),
    createResultRecord(config.apps[0], config.samples[2], 2),
  ];
}

const state = {
  page: "main",
  locale: "zh",
  sidebarCollapsed: false,
  config: createDefaultConfig(),
  draft: null,
  settingsTab: "general",
  selectedAppId: "xiguashuo",
  selectedResultId: null,
  capturingAppId: null,
  capturingHotkeyValue: "",
  runtime: null,
  runTimer: null,
  results: [],
};

function t() {
  return TRANSLATIONS[state.locale];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function persistConfig() {
  try {
    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(state.config));
  } catch (_error) {
    // Ignore storage errors in static preview mode.
  }
}

function restoreState() {
  try {
    const savedConfig = localStorage.getItem(STORAGE_KEYS.config);
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      state.config = { ...createDefaultConfig(), ...parsed };
      state.config.general = { ...createDefaultConfig().general, ...parsed.general };
      state.config.timing = { ...createDefaultConfig().timing, ...parsed.timing };
      state.config.devices = {
        ...createDefaultConfig().devices,
        ...parsed.devices,
        items: Array.isArray(parsed.devices?.items) ? parsed.devices.items : createDefaultConfig().devices.items,
      };
      state.config.database = { ...createDefaultConfig().database, ...parsed.database };
      state.config.advanced = { ...createDefaultConfig().advanced, ...parsed.advanced };
      state.config.apps = Array.isArray(parsed.apps) && parsed.apps.length ? parsed.apps : createDefaultConfig().apps;
      state.config.samples = Array.isArray(parsed.samples) && parsed.samples.length ? parsed.samples : createDefaultConfig().samples;
      state.config.permissions = Array.isArray(parsed.permissions) && parsed.permissions.length ? parsed.permissions : createDefaultConfig().permissions;
    }

    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    if (savedTheme === "dark" || savedTheme === "light") {
      state.config.general.theme = savedTheme;
    }

    const savedLocale = localStorage.getItem(STORAGE_KEYS.locale);
    if (savedLocale === "zh" || savedLocale === "en") {
      state.config.general.locale = savedLocale;
    }

    const savedSidebar = localStorage.getItem(STORAGE_KEYS.sidebar);
    state.sidebarCollapsed = savedSidebar === "true";
  } catch (_error) {
    state.config = createDefaultConfig();
  }

  state.locale = state.config.general.locale;
  state.selectedAppId = state.config.apps[0]?.id || null;
  state.results = buildSeedResults(state.config);
  state.selectedResultId = state.results[0]?.id || null;
}

function setTheme(theme) {
  refs.body.dataset.theme = theme;
  state.config.general.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch (_error) {
    // Ignore storage errors in static preview mode.
  }
}

function setLocale(locale) {
  state.locale = locale;
  state.config.general.locale = locale;
  try {
    localStorage.setItem(STORAGE_KEYS.locale, locale);
  } catch (_error) {
    // Ignore storage errors in static preview mode.
  }
  render();
}

function setSidebarCollapsed(collapsed) {
  state.sidebarCollapsed = collapsed;
  refs.body.classList.toggle("sidebar-collapsed", collapsed);
  try {
    localStorage.setItem(STORAGE_KEYS.sidebar, String(collapsed));
  } catch (_error) {
    // Ignore storage errors in static preview mode.
  }
}

function syncScrollLock() {
  const locked = !refs.settingsOverlay.hidden || !refs.drawer.hidden;
  refs.body.classList.toggle("is-locked", locked);
}

function selectedDevice(config = state.config) {
  return config.devices.items.find((item) => item.id === config.devices.selectedId) || config.devices.items[0] || null;
}

function accessibilityGranted(config = state.config) {
  return Boolean(config.permissions.find((item) => item.id === "accessibility")?.granted);
}

function enabledApps(config = state.config) {
  return config.apps.filter((app) => app.enabled);
}

function runnableApps(config = state.config) {
  return config.apps.filter((app) => app.enabled && app.ready);
}

function folderGroups(samples) {
  const groups = new Map();
  samples.forEach((sample) => {
    const parts = sample.path.split("/");
    const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "/";
    if (!groups.has(folder)) {
      groups.set(folder, []);
    }
    groups.get(folder).push(sample);
  });
  return Array.from(groups.entries());
}

function modeLabel(mode) {
  return t().mode[mode] || mode;
}

function appStateLabel(app) {
  if (!app.enabled) {
    return t().appState.disabled;
  }
  return app.ready ? t().appState.ready : t().appState.blocked;
}

function appStateTone(app) {
  if (!app.enabled) {
    return "info";
  }
  return app.ready ? "success" : "warning";
}

function resultTone(status) {
  if (status === "success") {
    return "success";
  }
  if (status === "timeout" || status === "blocked") {
    return "danger";
  }
  if (status === "retry") {
    return "warning";
  }
  return "info";
}

function resultStatusLabel(status) {
  return t().status[status] || status;
}

function formatMs(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  return `${Math.round(Number(value))} ms`;
}

function formatDuration(value) {
  return `${value.toFixed(1)}s`;
}

function normalizeHotkey(event) {
  const parts = [];
  if (event.metaKey) parts.push("Cmd");
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  const map = {
    " ": "Space",
    Escape: "Esc",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
  };
  const rawKey = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const key = map[rawKey] || rawKey;

  if (!MODIFIER_KEYS.includes(event.key)) {
    parts.push(key);
  }
  return parts.join(" + ");
}

function isModifierOnlyKey(event) {
  return MODIFIER_KEYS.includes(event.key);
}

function formatClock(date) {
  const pad = (value, size = 2) => String(value).padStart(size, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function getSelectedResult() {
  if (state.runtime?.current) {
    return state.runtime.current.preview;
  }
  return state.results.find((result) => result.id === state.selectedResultId) || state.results[0] || null;
}

function getPreflightFailure() {
  const copy = t().preflight;
  if (!accessibilityGranted()) {
    return { title: copy.blockedTitle, message: copy.accessibility };
  }

  if (!selectedDevice()?.available) {
    return { title: copy.blockedTitle, message: copy.device };
  }

  if (!runnableApps().length) {
    return { title: copy.blockedTitle, message: copy.apps };
  }

  if (!state.config.samples.length) {
    return { title: copy.blockedTitle, message: copy.samples };
  }

  if (!state.config.database.dbPath.trim()) {
    return { title: copy.blockedTitle, message: copy.database };
  }

  return null;
}

function buildRunPlan() {
  const plan = [];
  runnableApps().forEach((app) => {
    state.config.samples.forEach((sample) => {
      plan.push({ appId: app.id, sampleId: sample.id });
    });
  });
  return plan;
}

function findApp(config, appId) {
  return config.apps.find((app) => app.id === appId) || null;
}

function findSample(config, sampleId) {
  return config.samples.find((sample) => sample.id === sampleId) || null;
}

function synthesizeText(sample) {
  if (sample.expectedText) {
    return sample.expectedText;
  }
  return sample.locale === "zh"
    ? "这是一条没有预期文本的中文样本。"
    : "This sample has no expected transcript configured.";
}

function outcomeFor(app, sample, order) {
  const firstCharMs = 580 + Math.round(sample.durationSec * 120) + order * 36 + (app.id === "wispr-flow" ? 110 : 0);
  const finalLatencyMs = firstCharMs + 460 + Math.round(sample.durationSec * 90);
  const text = synthesizeText(sample);

  if (app.id === "wispr-flow" && sample.path.includes("zh-basic-02")) {
    return {
      status: "timeout",
      firstCharMs: null,
      finalLatencyMs: app.timeoutMs,
      rawText: "",
      previewText: "",
      failureReason: `Timeout after ${app.timeoutMs} ms`,
    };
  }

  if (app.id === "xiguashuo" && sample.path.includes("noisy")) {
    return {
      status: "retry",
      firstCharMs: firstCharMs + 210,
      finalLatencyMs: finalLatencyMs + 380,
      rawText: text.replaceAll("，", " "),
      previewText: text.slice(0, Math.max(8, Math.floor(text.length * 0.7))),
      failureReason: state.locale === "zh" ? "噪声音频里标点有漂移，建议人工复查。" : "Punctuation drift on the noisy sample. Review manually.",
    };
  }

  if (app.id === "wispr-flow" && sample.locale === "zh") {
    return {
      status: "partial",
      firstCharMs: firstCharMs + 80,
      finalLatencyMs: finalLatencyMs + 220,
      rawText: text.replace("voice typing contest", "voice typing") || text,
      previewText: text.slice(0, Math.max(8, Math.floor(text.length * 0.75))),
      failureReason: state.locale === "zh" ? "结果可用，但尾部有轻微截断。" : "Usable output, but the tail is slightly truncated.",
    };
  }

  return {
    status: "success",
    firstCharMs,
    finalLatencyMs,
    rawText: text,
    previewText: text.slice(0, Math.max(8, Math.floor(text.length * 0.72))),
    failureReason: "",
  };
}

function createTimelineEntries(app, sample, outcome, startedAt) {
  const timing = state.config.timing;
  const offsets = {
    prepare: 0,
    hotkey: timing.preHotkeyDelayMs,
    play: timing.preHotkeyDelayMs + timing.hotkeyToAudioDelayMs,
    observe: outcome.firstCharMs ?? sample.durationSec * 1000 + timing.hotkeyToAudioDelayMs + 180,
    settle: outcome.finalLatencyMs ?? sample.durationSec * 1000 + timing.defaultResultTimeoutMs,
  };

  return STEP_SEQUENCE.map((stepKey) => {
    const [title, detail] = t().timeline[stepKey];
    return {
      step: stepKey,
      time: formatClock(new Date(startedAt + offsets[stepKey])),
      title,
      detail,
      appName: app.name,
      samplePath: sample.path,
    };
  });
}

function createResultRecord(app, sample, order) {
  const startedAt = Date.now() + order * 1500;
  const outcome = outcomeFor(app, sample, order);
  return {
    id: `${app.id}-${sample.id}-${startedAt}`,
    appId: app.id,
    appName: app.name,
    sampleId: sample.id,
    samplePath: sample.path,
    mode: app.mode,
    status: outcome.status,
    firstCharMs: outcome.firstCharMs,
    finalLatencyMs: outcome.finalLatencyMs,
    rawText: outcome.rawText,
    previewText: outcome.previewText,
    failureReason: outcome.failureReason,
    timeline: createTimelineEntries(app, sample, outcome, startedAt),
    textLength: outcome.rawText.length,
  };
}

function createRuntimePreview(result, stepIndex) {
  const stepKey = STEP_SEQUENCE[stepIndex];
  const previewText = stepIndex >= 3 ? (result.previewText || result.rawText || "") : stepIndex === 2 ? (state.locale === "zh" ? "音频已发往虚拟设备。" : "Audio routed to the configured device.") : stepIndex === 1 ? (state.locale === "zh" ? "已发出全局热键，等待音频播放。" : "Global hotkey sent. Waiting for playback.") : (state.locale === "zh" ? "正在清空输入框并准备样本。" : "Clearing the input box and preparing the sample.");
  const runCopy = t().run;
  const liveStatusMap = {
    prepare: runCopy.preparing,
    hotkey: runCopy.triggering,
    play: runCopy.playing,
    observe: runCopy.observing,
    settle: resultStatusLabel(result.status),
  };
  const tone = stepKey === "settle" ? resultTone(result.status) : stepKey === "observe" ? (result.status === "timeout" ? "warning" : "success") : "info";

  return {
    ...result,
    stepKey,
    liveStatus: liveStatusMap[stepKey],
    tone,
    metricState: stepKey === "settle" ? resultStatusLabel(result.status) : liveStatusMap[stepKey],
    shownText: previewText,
    shownFirstChar: stepIndex >= 3 ? formatMs(result.firstCharMs) : "--",
    shownFinalLatency: stepIndex >= 4 ? formatMs(result.finalLatencyMs) : "--",
    shownFailure: stepIndex >= 4 ? (result.failureReason || t().run.noFailure) : t().run.noFailure,
    visibleTimeline: result.timeline.slice(0, stepIndex + 1),
  };
}

function startRun() {
  if (state.runTimer) {
    return;
  }

  const failure = getPreflightFailure();
  if (failure) {
    state.runtime = {
      queue: [],
      current: null,
      finished: false,
      stopped: false,
      banner: failure,
      completed: 0,
      total: 0,
    };
    render();
    return;
  }

  const queue = buildRunPlan();
  state.results = [];
  state.selectedResultId = null;
  const firstPlan = queue[0];
  const firstPreview = createResultRecord(findApp(state.config, firstPlan.appId), findSample(state.config, firstPlan.sampleId), 0);

  state.runtime = {
    queue,
    planIndex: 0,
    stepIndex: 0,
    completed: 0,
    total: queue.length,
    current: { result: firstPreview, preview: createRuntimePreview(firstPreview, 0) },
    finished: false,
    stopped: false,
    banner: null,
  };

  render();
  state.runTimer = window.setInterval(advanceRun, 1000);
}

function stopRun() {
  if (state.runTimer) {
    window.clearInterval(state.runTimer);
    state.runTimer = null;
  }
  if (state.runtime) {
    state.runtime.stopped = true;
  }
  render();
}

function advanceRun() {
  if (!state.runtime?.current) {
    stopRun();
    return;
  }

  if (state.runtime.stepIndex < STEP_SEQUENCE.length - 1) {
    state.runtime.stepIndex += 1;
    state.runtime.current.preview = createRuntimePreview(state.runtime.current.result, state.runtime.stepIndex);
    render();
    return;
  }

  state.results.push(state.runtime.current.result);
  state.selectedResultId = state.runtime.current.result.id;
  state.runtime.completed += 1;

  if (state.runtime.planIndex >= state.runtime.queue.length - 1) {
    state.runtime.finished = true;
    state.runtime.current = null;
    if (state.runTimer) {
      window.clearInterval(state.runTimer);
      state.runTimer = null;
    }
    render();
    return;
  }

  state.runtime.planIndex += 1;
  state.runtime.stepIndex = 0;
  const nextPlan = state.runtime.queue[state.runtime.planIndex];
  const nextResult = createResultRecord(
    findApp(state.config, nextPlan.appId),
    findSample(state.config, nextPlan.sampleId),
    state.runtime.planIndex,
  );
  state.runtime.current = { result: nextResult, preview: createRuntimePreview(nextResult, 0) };
  render();
}

function setPage(page) {
  state.page = page;
  refs.pageRoots.forEach((root) => {
    root.classList.toggle("is-active", root.dataset.page === page);
  });
  refs.sidebarMainItems.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.pageTarget === page);
  });
  refs.sidebarFooterItems.forEach((button) => {
    if (button.dataset.pageTarget) {
      button.classList.toggle("is-active", button.dataset.pageTarget === page);
    }
  });
  refs.pageTitle.textContent = t().pageTitle[page] || page;
}

function openSettings() {
  state.draft = clone(state.config);
  refs.settingsOverlay.hidden = false;
  renderSettingsPanels();
  syncScrollLock();
}

function discardDraft() {
  state.draft = null;
  state.capturingAppId = null;
  state.capturingHotkeyValue = "";
}

function closeSettings(commit) {
  if (commit && state.draft) {
    state.config = clone(state.draft);
    state.locale = state.config.general.locale;
    setTheme(state.config.general.theme);
    try {
      localStorage.setItem(STORAGE_KEYS.locale, state.locale);
    } catch (_error) {
      // Ignore storage errors in static preview mode.
    }
    persistConfig();
  }
  discardDraft();
  refs.settingsOverlay.hidden = true;
  render();
  syncScrollLock();
}

function openDrawer(resultId) {
  if (resultId) {
    state.selectedResultId = resultId;
  }
  refs.drawer.hidden = false;
  renderDrawer();
  syncScrollLock();
}

function closeDrawer() {
  refs.drawer.hidden = true;
  syncScrollLock();
}

function setSettingsTab(tab) {
  state.settingsTab = tab;
  refs.settingsTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.settingsTab === tab);
  });
  refs.settingsPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.settingsPanel === tab);
  });
}

function updateFailureBanner() {
  const banner = state.runtime?.banner || null;
  refs.failureBanner.hidden = !banner;
  refs.failureTitle.textContent = banner?.title || t().preflight.blockedTitle;
  refs.failureMessage.textContent = banner?.message || "";
}

function renderSummaryStrip() {
  const copy = t();
  const folders = folderGroups(state.config.samples).length;
  const readyCount = runnableApps().length;
  const device = selectedDevice();
  const permissionOk = accessibilityGranted();
  const chips = [
    {
      icon: "window",
      label: copy.summary.apps,
      value: state.locale === "zh" ? `${readyCount} 已就绪 / ${enabledApps().length} 启用` : `${readyCount} ready / ${enabledApps().length} enabled`,
      tone: readyCount ? "success" : "warning",
    },
    {
      icon: "folder",
      label: copy.summary.samples,
      value: state.locale === "zh"
        ? `${state.config.samples.length} / ${folders} ${copy.summary.folders}`
        : `${state.config.samples.length} / ${folders} ${copy.summary.folders}`,
      tone: "info",
    },
    {
      icon: "shield",
      label: copy.summary.permission,
      value: permissionOk ? copy.summary.ready : copy.summary.blocked,
      tone: permissionOk ? "success" : "danger",
    },
    {
      icon: "audio",
      label: copy.summary.device,
      value: device?.name || "--",
      tone: device?.available ? "info" : "warning",
    },
    {
      icon: "database",
      label: copy.summary.database,
      value: state.config.database.dbPath.trim() ? copy.summary.healthy : copy.summary.blocked,
      tone: state.config.database.dbPath.trim() ? "success" : "danger",
    },
  ];

  refs.summaryStrip.innerHTML = chips.map((chip) => `
    <article class="status-chip">
      <span class="status-chip__icon"><svg class="icon"><use href="#icon-${chip.icon}"></use></svg></span>
      <span>
        <span class="status-chip__label">${escapeHtml(chip.label)}</span>
        <strong class="status-chip__value ${chip.tone === "success" ? "status-chip__value--success" : ""}">${escapeHtml(chip.value)}</strong>
      </span>
    </article>
  `).join("");
}

function renderAppList() {
  const activeAppId = state.runtime?.current?.result.appId;
  refs.appList.innerHTML = state.config.apps.map((app) => `
    <li class="app-list__item ${activeAppId === app.id ? "is-running" : ""}" data-app-id="${escapeHtml(app.id)}">
      <div class="app-list__main">
        <strong>${escapeHtml(app.name)}</strong>
        <span class="meta-text">${escapeHtml(app.ready ? app.appFileName : (app.blockedReason || app.appFileName))}</span>
      </div>
      <div class="app-list__meta">
        <span class="tag">${escapeHtml(modeLabel(app.mode))}</span>
        <span class="state-pill state-pill--${appStateTone(app)}">${escapeHtml(appStateLabel(app))}</span>
      </div>
    </li>
  `).join("");
}

function renderSampleTree() {
  const activeSampleId = state.runtime?.current?.result.sampleId;
  refs.sampleTree.innerHTML = folderGroups(state.config.samples).map(([folder, items]) => `
    <section class="sample-folder">
      <div class="sample-folder__header">
        <svg class="icon"><use href="#icon-folder"></use></svg>
        <strong>${escapeHtml(folder)}</strong>
        <span>${items.length} sample${items.length > 1 ? "s" : ""}</span>
      </div>
      <ul class="sample-folder__list">
        ${items.map((sample) => `
          <li class="sample-leaf ${activeSampleId === sample.id ? "is-running" : ""}" data-sample-id="${escapeHtml(sample.id)}">
            <div>
              <strong>${escapeHtml(sample.path.split("/").pop())}</strong>
              <span class="meta-text">${escapeHtml(sample.expectedText ? t().sampleState.expectedReady : t().sampleState.expectedMissing)}</span>
            </div>
            <span class="mono-text">${formatDuration(sample.durationSec)}</span>
          </li>
        `).join("")}
      </ul>
    </section>
  `).join("");
}

function renderProgress() {
  const copy = t();
  const runtime = state.runtime;
  if (!runtime?.current) {
    refs.progressLabel.textContent = runtime?.finished ? copy.run.complete : runtime?.stopped ? copy.currentLabels.stopped : copy.currentLabels.idle;
    refs.progressValue.style.width = runtime?.finished ? "100%" : runtime?.stopped && runtime.total ? `${Math.round((runtime.completed / runtime.total) * 100)}%` : "0%";
    refs.currentApp.textContent = runtime?.finished && state.results.at(-1) ? state.results.at(-1).appName : "--";
    refs.currentSample.textContent = runtime?.finished && state.results.at(-1) ? state.results.at(-1).samplePath : "--";
    refs.currentStep.textContent = runtime?.finished ? copy.currentLabels.completed : copy.currentLabels.waiting;
    return;
  }

  const currentItemNumber = runtime.planIndex + 1;
  const overallSteps = runtime.total * STEP_SEQUENCE.length;
  const doneSteps = runtime.planIndex * STEP_SEQUENCE.length + runtime.stepIndex + 1;
  refs.progressLabel.textContent = copy.run.planProgress(currentItemNumber, runtime.total);
  refs.progressValue.style.width = `${Math.round((doneSteps / overallSteps) * 100)}%`;
  refs.currentApp.textContent = runtime.current.result.appName;
  refs.currentSample.textContent = runtime.current.result.samplePath;
  refs.currentStep.textContent = t().step[runtime.current.preview.stepKey][0];
}

function setStatePill(element, tone, text) {
  element.className = `state-pill state-pill--${tone}`;
  element.textContent = text;
}

function renderLivePanel() {
  const copy = t();
  const runtimePreview = state.runtime?.current?.preview;
  const selected = runtimePreview || getSelectedResult();

  if (runtimePreview) {
    setStatePill(refs.liveState, runtimePreview.tone, runtimePreview.liveStatus);
    refs.metricState.textContent = runtimePreview.metricState;
    refs.metricFirstChar.textContent = runtimePreview.shownFirstChar;
    refs.metricFinal.textContent = runtimePreview.shownFinalLatency;
    refs.metricLength.textContent = runtimePreview.shownText.length ? String(runtimePreview.shownText.length) : "--";
    refs.liveText.value = runtimePreview.shownText;
    refs.snapshotFailure.textContent = runtimePreview.shownFailure;
    refs.snapshotText.textContent = runtimePreview.shownText || copy.snapshotLabels.notStarted;
    refs.snapshotSample.textContent = runtimePreview.samplePath;
    refs.snapshotMode.textContent = modeLabel(runtimePreview.mode);
    return;
  }

  const stopped = state.runtime?.stopped;
  setStatePill(refs.liveState, stopped ? "warning" : "info", stopped ? copy.currentLabels.stopped : copy.run.liveIdle);
  refs.metricState.textContent = selected ? resultStatusLabel(selected.status) : copy.status.idle;
  refs.metricFirstChar.textContent = selected ? formatMs(selected.firstCharMs) : "--";
  refs.metricFinal.textContent = selected ? formatMs(selected.finalLatencyMs) : "--";
  refs.metricLength.textContent = selected ? String(selected.rawText.length) : "--";
  refs.liveText.value = selected?.rawText || copy.run.livePlaceholder;
  refs.snapshotFailure.textContent = selected?.failureReason || copy.run.noFailure;
  refs.snapshotText.textContent = selected?.rawText || copy.snapshotLabels.notStarted;
  refs.snapshotSample.textContent = selected?.samplePath || "--";
  refs.snapshotMode.textContent = selected ? modeLabel(selected.mode) : "--";
}

function renderStepList() {
  const currentStep = state.runtime?.current?.preview?.stepKey || null;
  const doneIndex = currentStep ? STEP_SEQUENCE.indexOf(currentStep) : -1;
  refs.stepList.innerHTML = STEP_SEQUENCE.map((stepKey, index) => {
    const [title, desc] = t().step[stepKey];
    const isRunning = currentStep === stepKey;
    const isDone = doneIndex > index;
    return `
      <li class="step-row ${isRunning ? "is-running" : ""} ${isDone ? "is-done" : ""}" data-run-step="${stepKey}">
        <span class="step-row__index">${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(title)}</strong>
          <span class="meta-text">${escapeHtml(desc)}</span>
        </div>
      </li>
    `;
  }).join("");
}

function renderTimelineList(target, items, currentStep) {
  target.innerHTML = items.map((item) => {
    const stepIndex = STEP_SEQUENCE.indexOf(item.step);
    const currentIndex = currentStep ? STEP_SEQUENCE.indexOf(currentStep) : -1;
    const isRunning = item.step === currentStep;
    const isDone = currentIndex > stepIndex;
    return `
      <li class="timeline-row ${isRunning ? "is-running" : ""} ${isDone ? "is-done" : ""}">
        <span class="timeline-row__time mono-text">${escapeHtml(item.time)}</span>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <span class="meta-text">${escapeHtml(item.detail)}</span>
        </div>
      </li>
    `;
  }).join("");
}

function renderRunNotes() {
  const copy = t().notes;
  const configuredNotes = state.config.general.runNotes
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const extra = state.runtime?.banner ? copy.liveBlocked : state.runTimer ? copy.liveRunning : copy.liveReady;
  const lines = [...configuredNotes, ...copy.defaultLines, extra].slice(0, 6);
  refs.runNotes.innerHTML = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

function renderResultTable() {
  const rows = state.results.length ? state.results : [];
  refs.resultTableBody.innerHTML = rows.length ? rows.map((result) => `
    <tr class="${state.selectedResultId === result.id ? "is-selected" : ""}" data-result-id="${escapeHtml(result.id)}">
      <td>${escapeHtml(result.appName)}</td>
      <td class="mono-text">${escapeHtml(result.samplePath)}</td>
      <td><span class="state-pill state-pill--${resultTone(result.status)}">${escapeHtml(resultStatusLabel(result.status))}</span></td>
      <td class="mono-text">${formatMs(result.firstCharMs)}</td>
      <td class="mono-text">${formatMs(result.finalLatencyMs)}</td>
      <td>${escapeHtml(result.rawText || "--")}</td>
    </tr>
  `).join("") : `<tr><td colspan="6" class="meta-text">${escapeHtml(t().table.empty)}</td></tr>`;
}

function renderIntroPage() {
  const copy = t().intro;
  refs.introHeaderTitle.textContent = copy.title;
  refs.introHeaderDesc.textContent = copy.desc;
  refs.introEyebrow.textContent = copy.eyebrow;
  refs.introHeroTitle.textContent = copy.heroTitle;
  refs.introHeroDesc.textContent = copy.heroDesc;
  refs.introStepCards.forEach((card, index) => {
    const [title, desc] = copy.steps[index];
    card.querySelector("h4").textContent = title;
    card.querySelector("p").textContent = desc;
  });
  refs.introChecklistTitle.textContent = copy.checklistTitle;
  refs.introChecklistDesc.textContent = copy.checklistDesc;
  refs.introChecklist.innerHTML = copy.checklist.map((item, index) => {
    const granted = index < 3 || Boolean(state.config.samples.length);
    return `
      <li class="checklist__row">
        <span class="checkmark ${granted ? "is-on" : ""}"><svg class="icon"><use href="#icon-check"></use></svg></span>
        ${escapeHtml(item)}
      </li>
    `;
  }).join("");
  refs.introGoMain.textContent = copy.goMain;
}

function renderAboutPage() {
  const copy = t().about;
  refs.aboutHeaderTitle.textContent = copy.title;
  refs.aboutHeaderDesc.textContent = copy.desc;
  refs.aboutEyebrow.textContent = copy.eyebrow;
  refs.aboutVersion.textContent = copy.version;
  refs.aboutHero.textContent = copy.hero;
  refs.aboutBlockTitles.forEach((title, index) => {
    title.textContent = copy.blocks[index];
  });

  const infoValues = [
    state.locale === "zh" ? "macOS 桌面" : "macOS desktop",
    "Electron + Vue renderer + native helper",
    "Local SQLite",
    state.locale === "zh" ? "亮 / 暗 + zh / en" : "Light / Dark + zh / en",
  ];
  const pathValues = [
    state.config.database.dbPath,
    state.config.database.logFolder,
    state.config.sampleRoot,
  ];

  refs.aboutMetaLists[0].innerHTML = copy.meta.slice(0, 4).map((label, index) => `
    <li><span>${escapeHtml(label)}</span><strong>${escapeHtml(infoValues[index])}</strong></li>
  `).join("");
  refs.aboutMetaLists[1].innerHTML = copy.meta.slice(4).map((label, index) => `
    <li><span>${escapeHtml(label)}</span><strong class="mono-text">${escapeHtml(pathValues[index])}</strong></li>
  `).join("");
  refs.aboutButtons[0].textContent = copy.openLogs;
  refs.aboutButtons[1].textContent = copy.openDb;
}

function renderMainTexts() {
  const copy = t();
  refs.topEyebrow.textContent = copy.topEyebrow;
  refs.languageToggle.textContent = copy.topActionLanguage;
  refs.mainHeaderTitle.textContent = copy.main.title;
  refs.mainHeaderDesc.textContent = copy.main.desc;
  refs.runStartButton.querySelector("span").textContent = copy.main.run;
  refs.runStopButton.querySelector("span").textContent = copy.main.stop;
  refs.mainOpenDrawerButtons.forEach((button) => {
    const span = button.querySelector("span");
    if (span) {
      span.textContent = copy.run.openDetail;
    }
  });
  refs.resultTableExportButton.textContent = copy.table.export;

  refs.sidebarMainItems[0].querySelector(".nav-item__label").textContent = copy.nav.main;
  refs.sidebarMainItems[1].querySelector(".nav-item__label").textContent = copy.nav.intro;
  refs.sidebarFooterItems[0].querySelector(".nav-item__label").textContent = copy.nav.about;
  refs.sidebarFooterItems[1].querySelector(".nav-item__label").textContent = copy.nav.settings;

  const headers = {
    targetApps: refs.appList.closest(".panel-card").querySelector(".section-header h3"),
    audioSet: refs.sampleTree.closest(".panel-card").querySelector(".section-header h3"),
    progress: refs.progressLabel.closest(".panel-card").querySelector(".section-header h3"),
    liveInput: refs.liveText.closest(".panel-card").querySelector(".section-header h3"),
    snapshot: refs.snapshotFailure.closest(".panel-card").querySelector(".section-header h3"),
    runSteps: refs.stepList.closest(".panel-card").querySelector(".section-header h3"),
    timeline: refs.mainTimeline.closest(".panel-card").querySelector(".section-header h3"),
    notes: refs.runNotes.closest(".panel-card").querySelector(".section-header h3"),
    results: refs.resultTableBody.closest(".result-table-section").querySelector(".section-header h3"),
  };

  const descs = {
    targetApps: refs.appList.closest(".panel-card").querySelector(".section-header p"),
    audioSet: refs.sampleTree.closest(".panel-card").querySelector(".section-header p"),
    progress: refs.progressLabel.closest(".panel-card").querySelector(".section-header p"),
    liveInput: refs.liveText.closest(".panel-card").querySelector(".section-header p"),
    snapshot: refs.snapshotFailure.closest(".panel-card").querySelector(".section-header p"),
    runSteps: refs.stepList.closest(".panel-card").querySelector(".section-header p"),
    timeline: refs.mainTimeline.closest(".panel-card").querySelector(".section-header p"),
    notes: refs.runNotes.closest(".panel-card").querySelector(".section-header p"),
    results: refs.resultTableBody.closest(".result-table-section").querySelector(".section-header p"),
  };

  Object.keys(headers).forEach((key) => {
    headers[key].textContent = copy.sections[key][0];
    descs[key].textContent = copy.sections[key][1];
  });

  const progressMetrics = refs.progressLabel.closest(".panel-card").querySelectorAll(".metric-inline span");
  progressMetrics[0].textContent = copy.currentLabels.app;
  progressMetrics[1].textContent = copy.currentLabels.sample;
  progressMetrics[2].textContent = copy.currentLabels.step;

  const metricLabels = refs.liveText.closest(".panel-card").querySelectorAll(".metric-tile span");
  metricLabels[0].textContent = copy.metricLabels.state;
  metricLabels[1].textContent = copy.metricLabels.firstChar;
  metricLabels[2].textContent = copy.metricLabels.finalLatency;
  metricLabels[3].textContent = copy.metricLabels.textLength;

  const snapshotHeadings = refs.snapshotFailure.closest(".panel-card").querySelectorAll(".eyebrow, .metric-block span");
  snapshotHeadings[0].textContent = copy.snapshotLabels.failure;
  snapshotHeadings[1].textContent = copy.snapshotLabels.finalText;
  snapshotHeadings[2].textContent = copy.snapshotLabels.storage;
  snapshotHeadings[3].textContent = copy.snapshotLabels.audioPath;
  snapshotHeadings[4].textContent = copy.snapshotLabels.triggerMode;

  const tableHeaders = refs.resultTableBody.closest("table").querySelectorAll("th");
  tableHeaders[0].textContent = copy.table.app;
  tableHeaders[1].textContent = copy.table.sample;
  tableHeaders[2].textContent = copy.table.status;
  tableHeaders[3].textContent = copy.table.firstChar;
  tableHeaders[4].textContent = copy.table.final;
  tableHeaders[5].textContent = copy.table.rawText;
}

function renderSettingsPanels() {
  const draft = state.draft;
  if (!draft) {
    return;
  }

  const copy = t().settings;
  refs.settingsEyebrow.textContent = copy.eyebrow;
  refs.settingsTitle.textContent = copy.title;
  refs.settingsFooterButtons.cancel.textContent = copy.footer.cancel;
  refs.settingsFooterButtons.apply.textContent = copy.footer.apply;
  refs.settingsFooterButtons.save.textContent = copy.footer.save;

  refs.settingsTabs.forEach((button) => {
    const key = camelKey(button.dataset.settingsTab);
    button.textContent = copy.tabs[key];
  });

  const panelMap = Object.fromEntries(refs.settingsPanels.map((panel) => [panel.dataset.settingsPanel, panel]));
  const activeApp = findApp(draft, state.selectedAppId) || draft.apps[0] || null;

  panelMap.general.innerHTML = `
    <div class="settings-panel__header">
      <h3>${escapeHtml(copy.general.title)}</h3>
      <p>${escapeHtml(copy.general.desc)}</p>
    </div>
    <div class="form-grid">
      <label class="form-row">
        <span>${escapeHtml(copy.general.workspaceLabel)}</span>
        <input type="text" data-draft-path="general.workspaceLabel" value="${escapeHtml(draft.general.workspaceLabel)}" />
      </label>
      <label class="form-row">
        <span>${escapeHtml(copy.general.language)}</span>
        <select data-draft-path="general.locale">
          <option value="zh" ${draft.general.locale === "zh" ? "selected" : ""}>zh-CN</option>
          <option value="en" ${draft.general.locale === "en" ? "selected" : ""}>English</option>
        </select>
      </label>
      <label class="form-row">
        <span>${escapeHtml(copy.general.theme)}</span>
        <select data-draft-path="general.theme">
          <option value="light" ${draft.general.theme === "light" ? "selected" : ""}>light</option>
          <option value="dark" ${draft.general.theme === "dark" ? "selected" : ""}>dark</option>
        </select>
      </label>
      <label class="form-row">
        <span>${escapeHtml(copy.general.runNotes)}</span>
        <textarea rows="5" data-draft-path="general.runNotes">${escapeHtml(draft.general.runNotes)}</textarea>
      </label>
    </div>
  `;

  panelMap["target-apps"].innerHTML = `
    <div class="settings-panel__header">
      <h3>${escapeHtml(copy.targetApps.title)}</h3>
      <p>${escapeHtml(copy.targetApps.desc)}</p>
    </div>
    <div class="master-detail">
      <aside class="master-detail__list">
        ${draft.apps.map((app) => `
          <button class="list-row ${app.id === activeApp?.id ? "is-active" : ""}" type="button" data-settings-app-select="${escapeHtml(app.id)}">${escapeHtml(app.name)}</button>
        `).join("")}
        <button class="btn btn--secondary btn--small" type="button" data-settings-add-app="true">${escapeHtml(copy.targetApps.add)}</button>
      </aside>
      <div class="master-detail__editor">
        ${activeApp ? `
          <div class="form-grid">
            <label class="checkbox-row"><input type="checkbox" ${activeApp.enabled ? "checked" : ""} data-app-field="enabled" data-app-id="${escapeHtml(activeApp.id)}" />${escapeHtml(copy.targetApps.enabled)}</label>
            <label class="form-row"><span>${escapeHtml(copy.targetApps.name)}</span><input type="text" data-app-field="name" data-app-id="${escapeHtml(activeApp.id)}" value="${escapeHtml(activeApp.name)}" /></label>
            <label class="form-row"><span>${escapeHtml(copy.targetApps.appFileName)}</span><input type="text" data-app-field="appFileName" data-app-id="${escapeHtml(activeApp.id)}" value="${escapeHtml(activeApp.appFileName)}" /></label>
            <label class="form-row">
              <span>${escapeHtml(copy.targetApps.hotkey)}</span>
              <button class="hotkey-capture" type="button" data-capture-hotkey="${escapeHtml(activeApp.id)}">${escapeHtml(state.capturingAppId === activeApp.id ? (state.capturingHotkeyValue || t().run.capturing) : (activeApp.hotkey || t().run.hotkeyButton))}</button>
            </label>
            <div class="form-row">
              <span>${escapeHtml(copy.targetApps.triggerMode)}</span>
              <div class="choice-group">
                ${["hold_release", "press_start_press_stop"].map((mode) => `
                  <button class="choice-pill ${activeApp.mode === mode ? "is-active" : ""}" type="button" data-app-mode="${mode}" data-app-id="${escapeHtml(activeApp.id)}">${escapeHtml(modeLabel(mode))}</button>
                `).join("")}
              </div>
            </div>
            <label class="form-row"><span>${escapeHtml(copy.targetApps.timeout)}</span><input type="number" min="1000" step="100" data-app-field="timeoutMs" data-app-id="${escapeHtml(activeApp.id)}" value="${escapeHtml(activeApp.timeoutMs)}" /></label>
            <label class="form-row">
              <span>${escapeHtml(copy.targetApps.readyState)}</span>
              <select data-app-field="ready" data-app-id="${escapeHtml(activeApp.id)}">
                <option value="true" ${activeApp.ready ? "selected" : ""}>${escapeHtml(t().appState.ready)}</option>
                <option value="false" ${!activeApp.ready ? "selected" : ""}>${escapeHtml(t().appState.blocked)}</option>
              </select>
            </label>
            <label class="form-row"><span>${escapeHtml(copy.targetApps.blockedReason)}</span><input type="text" data-app-field="blockedReason" data-app-id="${escapeHtml(activeApp.id)}" value="${escapeHtml(activeApp.blockedReason || "")}" /></label>
            <div class="field-inline field-inline--right">
              <button class="btn btn--ghost btn--small" type="button" data-settings-remove-app="${escapeHtml(activeApp.id)}">${escapeHtml(copy.targetApps.remove)}</button>
            </div>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  panelMap["audio-samples"].innerHTML = `
    <div class="settings-panel__header">
      <h3>${escapeHtml(copy.audioSamples.title)}</h3>
      <p>${escapeHtml(copy.audioSamples.desc)}</p>
    </div>
    <div class="form-grid">
      <label class="form-row">
        <span>${escapeHtml(copy.audioSamples.root)}</span>
        <div class="field-inline">
          <input type="text" data-draft-path="sampleRoot" value="${escapeHtml(draft.sampleRoot)}" />
          <button class="btn btn--secondary btn--small" type="button">${escapeHtml(copy.audioSamples.choose)}</button>
          <button class="btn btn--ghost btn--small" type="button">${escapeHtml(copy.audioSamples.rescan)}</button>
        </div>
      </label>
    </div>
    <div class="mini-table">
      ${draft.samples.map((sample) => `
        <div class="mini-table__row">
          <strong class="mono-text">${escapeHtml(sample.path)}</strong>
          <span>${formatDuration(sample.durationSec)}</span>
          <span>${escapeHtml(sample.locale)}</span>
          <span>${escapeHtml(sample.expectedText ? t().sampleState.expectedReady : t().sampleState.expectedMissing)}</span>
        </div>
      `).join("")}
    </div>
  `;

  panelMap.timing.innerHTML = `
    <div class="settings-panel__header">
      <h3>${escapeHtml(copy.timing.title)}</h3>
      <p>${escapeHtml(copy.timing.desc)}</p>
    </div>
    <div class="form-grid">
      <label class="form-row"><span>${escapeHtml(copy.timing.preHotkey)}</span><input type="number" data-draft-path="timing.preHotkeyDelayMs" value="${draft.timing.preHotkeyDelayMs}" /></label>
      <label class="form-row"><span>${escapeHtml(copy.timing.hotkeyToAudio)}</span><input type="number" data-draft-path="timing.hotkeyToAudioDelayMs" value="${draft.timing.hotkeyToAudioDelayMs}" /></label>
      <label class="form-row"><span>${escapeHtml(copy.timing.audioToStop)}</span><input type="number" data-draft-path="timing.audioToTriggerStopDelayMs" value="${draft.timing.audioToTriggerStopDelayMs}" /></label>
      <label class="form-row"><span>${escapeHtml(copy.timing.settleWindow)}</span><input type="number" data-draft-path="timing.settleWindowMs" value="${draft.timing.settleWindowMs}" /></label>
      <label class="form-row"><span>${escapeHtml(copy.timing.resultTimeout)}</span><input type="number" data-draft-path="timing.defaultResultTimeoutMs" value="${draft.timing.defaultResultTimeoutMs}" /></label>
    </div>
  `;

  panelMap.devices.innerHTML = `
    <div class="settings-panel__header">
      <h3>${escapeHtml(copy.devices.title)}</h3>
      <p>${escapeHtml(copy.devices.desc)}</p>
    </div>
    <div class="form-grid">
      <label class="form-row">
        <span>${escapeHtml(copy.devices.selected)}</span>
        <div class="field-inline">
          <select data-draft-path="devices.selectedId">
            ${draft.devices.items.map((device) => `
              <option value="${escapeHtml(device.id)}" ${draft.devices.selectedId === device.id ? "selected" : ""}>${escapeHtml(device.name)}</option>
            `).join("")}
          </select>
          <button class="btn btn--ghost btn--small" type="button">${escapeHtml(copy.devices.recheck)}</button>
        </div>
      </label>
    </div>
    <ul class="device-list">
      ${draft.devices.items.map((device) => `
        <li>
          <strong>${escapeHtml(device.name)}</strong>
          <span class="state-pill state-pill--${device.available ? "success" : "warning"}">${escapeHtml(device.available ? copy.devices.available : copy.devices.unavailable)}</span>
        </li>
      `).join("")}
    </ul>
  `;

  panelMap.permissions.innerHTML = `
    <div class="settings-panel__header">
      <h3>${escapeHtml(copy.permissions.title)}</h3>
      <p>${escapeHtml(copy.permissions.desc)}</p>
    </div>
    <div class="permission-list">
      ${draft.permissions.map((permission) => `
        <div class="permission-row">
          <strong>${escapeHtml(permission.name)}</strong>
          <span>${escapeHtml(permission.required ? copy.permissions.required : copy.permissions.optional)}</span>
          <span class="state-pill state-pill--${permission.granted ? "success" : "warning"}">${escapeHtml(permission.granted ? copy.permissions.granted : copy.permissions.missing)}</span>
          <button class="btn btn--ghost btn--small" type="button" data-toggle-permission="${escapeHtml(permission.id)}">${escapeHtml(copy.permissions.toggle)}</button>
        </div>
      `).join("")}
    </div>
  `;

  panelMap.database.innerHTML = `
    <div class="settings-panel__header">
      <h3>${escapeHtml(copy.database.title)}</h3>
      <p>${escapeHtml(copy.database.desc)}</p>
    </div>
    <div class="form-grid">
      <label class="form-row"><span>${escapeHtml(copy.database.dbPath)}</span><input type="text" data-draft-path="database.dbPath" value="${escapeHtml(draft.database.dbPath)}" /></label>
      <label class="form-row"><span>${escapeHtml(copy.database.logFolder)}</span><input type="text" data-draft-path="database.logFolder" value="${escapeHtml(draft.database.logFolder)}" /></label>
      <div class="field-inline field-inline--right">
        <button class="btn btn--secondary btn--small" type="button">${escapeHtml(copy.database.choose)}</button>
        <button class="btn btn--ghost btn--small" type="button">${escapeHtml(copy.database.export)}</button>
      </div>
    </div>
  `;

  panelMap.advanced.innerHTML = `
    <div class="settings-panel__header">
      <h3>${escapeHtml(copy.advanced.title)}</h3>
      <p>${escapeHtml(copy.advanced.desc)}</p>
    </div>
    <div class="form-grid">
      <label class="checkbox-row"><input type="checkbox" data-draft-path="advanced.storeRawPayloads" ${draft.advanced.storeRawPayloads ? "checked" : ""} />${escapeHtml(copy.advanced.storePayloads)}</label>
      <label class="checkbox-row"><input type="checkbox" data-draft-path="advanced.verboseLog" ${draft.advanced.verboseLog ? "checked" : ""} />${escapeHtml(copy.advanced.verbose)}</label>
      <label class="form-row"><span>${escapeHtml(copy.advanced.retryCount)}</span><input type="number" min="0" data-draft-path="advanced.retryFailedSampleCount" value="${draft.advanced.retryFailedSampleCount}" /></label>
      <label class="form-row"><span>${escapeHtml(copy.advanced.helperPath)}</span><input type="text" data-draft-path="advanced.helperPath" value="${escapeHtml(draft.advanced.helperPath)}" /></label>
    </div>
  `;

  setSettingsTab(state.settingsTab);
}

function camelKey(value) {
  return value.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function setDraftValue(path, rawValue, kind = "text") {
  if (!state.draft) {
    return;
  }
  const segments = path.split(".");
  const last = segments.pop();
  const target = segments.reduce((acc, key) => acc[key], state.draft);
  let value = rawValue;
  if (kind === "number") {
    value = Number(rawValue);
  } else if (kind === "boolean") {
    value = Boolean(rawValue);
  }
  target[last] = value;
}

function updateDraftApp(appId, field, rawValue) {
  const app = findApp(state.draft, appId);
  if (!app) {
    return;
  }
  if (field === "enabled") {
    app.enabled = Boolean(rawValue);
  } else if (field === "ready") {
    app.ready = rawValue === true || rawValue === "true";
  } else if (field === "timeoutMs") {
    app.timeoutMs = Number(rawValue);
  } else {
    app[field] = rawValue;
  }
}

function addDraftApp() {
  if (!state.draft) {
    return;
  }
  const index = state.draft.apps.length + 1;
  const id = `custom-app-${Date.now()}`;
  state.draft.apps.push({
    id,
    name: `App ${index}`,
    appFileName: `App ${index}.app`,
    hotkey: "Cmd + Shift + K",
    mode: "hold_release",
    timeoutMs: state.draft.timing.defaultResultTimeoutMs,
    enabled: true,
    ready: false,
    blockedReason: "Set app file name and verify readiness",
  });
  state.selectedAppId = id;
}

function removeDraftApp(appId) {
  if (!state.draft || state.draft.apps.length <= 1) {
    return;
  }
  state.draft.apps = state.draft.apps.filter((app) => app.id !== appId);
  if (state.selectedAppId === appId) {
    state.selectedAppId = state.draft.apps[0]?.id || null;
  }
}

function handleSettingsInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.dataset.draftPath) {
    const kind = target.type === "checkbox" ? "boolean" : target.type === "number" ? "number" : "text";
    const value = target.type === "checkbox" ? target.checked : target.value;
    setDraftValue(target.dataset.draftPath, value, kind);
    if (event.type === "change" || target.type === "checkbox" || target instanceof HTMLSelectElement) {
      renderSettingsPanels();
    }
    return;
  }

  if (target.dataset.appField && target.dataset.appId) {
    const value = target.type === "checkbox" ? target.checked : target.value;
    updateDraftApp(target.dataset.appId, target.dataset.appField, value);
    if (event.type === "change" || target.type === "checkbox" || target instanceof HTMLSelectElement) {
      renderSettingsPanels();
    }
  }
}

function handleSettingsClick(event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  if (button.dataset.settingsAppSelect) {
    state.selectedAppId = button.dataset.settingsAppSelect;
    renderSettingsPanels();
    return;
  }

  if (button.dataset.settingsAddApp) {
    addDraftApp();
    renderSettingsPanels();
    return;
  }

  if (button.dataset.settingsRemoveApp) {
    removeDraftApp(button.dataset.settingsRemoveApp);
    renderSettingsPanels();
    return;
  }

  if (button.dataset.captureHotkey) {
    state.capturingAppId = button.dataset.captureHotkey;
    state.capturingHotkeyValue = "";
    renderSettingsPanels();
    return;
  }

  if (button.dataset.appMode && button.dataset.appId) {
    updateDraftApp(button.dataset.appId, "mode", button.dataset.appMode);
    renderSettingsPanels();
    return;
  }

  if (button.dataset.togglePermission) {
    const permission = state.draft.permissions.find((item) => item.id === button.dataset.togglePermission);
    if (permission) {
      permission.granted = !permission.granted;
      renderSettingsPanels();
    }
  }
}

function renderDrawer() {
  const selected = getSelectedResult();
  refs.drawerTitle.textContent = selected ? `${selected.appName} / ${selected.samplePath}` : "--";
  refs.drawerApp.textContent = selected?.appName || "--";
  refs.drawerSample.textContent = selected?.samplePath || "--";
  refs.drawerStatus.textContent = selected ? resultStatusLabel(selected.status) : t().status.idle;
  refs.drawerText.textContent = selected?.rawText || t().run.livePlaceholder;
  refs.drawerFirstChar.textContent = selected ? formatMs(selected.firstCharMs) : "--";
  refs.drawerFinal.textContent = selected ? formatMs(selected.finalLatencyMs) : "--";
  refs.drawerLength.textContent = selected ? String(selected.textLength) : "--";
  refs.drawerFailure.textContent = selected?.failureReason || t().run.noFailure;
  renderTimelineList(refs.drawerTimeline, selected?.timeline || [], null);
}

function renderPageState() {
  setPage(state.page);
  renderMainTexts();
  renderSummaryStrip();
  renderAppList();
  renderSampleTree();
  renderProgress();
  renderLivePanel();
  renderStepList();
  renderTimelineList(
    refs.mainTimeline,
    state.runtime?.current?.preview?.visibleTimeline || getSelectedResult()?.timeline || [],
    state.runtime?.current?.preview?.stepKey || null,
  );
  renderRunNotes();
  renderResultTable();
  updateFailureBanner();
  renderIntroPage();
  renderAboutPage();
  renderDrawer();
}

function render() {
  refs.body.dataset.language = state.locale;
  setTheme(state.config.general.theme);
  setSidebarCollapsed(state.sidebarCollapsed);
  renderPageState();
  if (state.draft && !refs.settingsOverlay.hidden) {
    renderSettingsPanels();
  }
}

refs.pageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.pageTarget) {
      setPage(button.dataset.pageTarget);
    }
  });
});

refs.settingsOpeners.forEach((button) => {
  button.addEventListener("click", openSettings);
});

refs.settingsClosers.forEach((button) => {
  button.addEventListener("click", () => closeSettings(button.hasAttribute("data-close-settings")));
});

refs.settingsOverlay.addEventListener("click", (event) => {
  if (event.target === refs.settingsOverlay) {
    closeSettings(false);
  }
});

refs.settingsTabs.forEach((button) => {
  button.addEventListener("click", () => setSettingsTab(button.dataset.settingsTab));
});

refs.themeToggle?.addEventListener("click", () => {
  setTheme(refs.body.dataset.theme === "dark" ? "light" : "dark");
});

refs.languageToggle?.addEventListener("click", () => {
  setLocale(state.locale === "zh" ? "en" : "zh");
});

refs.sidebarToggle?.addEventListener("click", () => {
  setSidebarCollapsed(!state.sidebarCollapsed);
});

refs.runStartButton?.addEventListener("click", startRun);
refs.runStopButton?.addEventListener("click", stopRun);
refs.resultTableBody?.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-result-id]");
  if (!row) {
    return;
  }
  openDrawer(row.dataset.resultId);
});

refs.drawerOpeners.forEach((button) => {
  button.addEventListener("click", () => openDrawer());
});
refs.drawerClosers.forEach((button) => {
  button.addEventListener("click", closeDrawer);
});

refs.settingsPanels.forEach((panel) => {
  panel.addEventListener("input", handleSettingsInput);
  panel.addEventListener("change", handleSettingsInput);
  panel.addEventListener("click", handleSettingsClick);
});

refs.settingsFooterButtons.cancel?.addEventListener("click", () => closeSettings(false));
refs.settingsFooterButtons.apply?.addEventListener("click", () => {
  if (!state.draft) {
    return;
  }
  state.config = clone(state.draft);
  state.locale = state.config.general.locale;
  setTheme(state.config.general.theme);
  try {
    localStorage.setItem(STORAGE_KEYS.locale, state.locale);
  } catch (_error) {
    // Ignore storage errors in static preview mode.
  }
  persistConfig();
  render();
  renderSettingsPanels();
});

document.addEventListener("keydown", (event) => {
  if (state.capturingAppId && state.draft) {
    event.preventDefault();
    if (event.key === "Escape") {
      state.capturingAppId = null;
      state.capturingHotkeyValue = "";
      renderSettingsPanels();
      return;
    }

    const hotkey = normalizeHotkey(event);
    if (!hotkey) {
      return;
    }

    state.capturingHotkeyValue = hotkey;
    if (isModifierOnlyKey(event)) {
      renderSettingsPanels();
      return;
    }

    updateDraftApp(state.capturingAppId, "hotkey", hotkey);
    state.capturingAppId = null;
    state.capturingHotkeyValue = "";
    renderSettingsPanels();
    return;
  }

  if (event.key === "Escape") {
    if (!refs.settingsOverlay.hidden) {
      closeSettings(false);
    }
    if (!refs.drawer.hidden) {
      closeDrawer();
    }
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "t") {
    event.preventDefault();
    setTheme(refs.body.dataset.theme === "dark" ? "light" : "dark");
  }
});

restoreState();
render();
syncScrollLock();
