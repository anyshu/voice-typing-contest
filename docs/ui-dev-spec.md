# Voice Typing Contest UI Dev Spec

## 1. Current Shell

The renderer currently uses a desktop shell with:

- fixed left sidebar
- scrollable right content area
- top bar with page title or main-page summary/actions
- global notice toast anchored in the top-right visual area

Current first-level pages in the sidebar are:

- `主控台`
- `样本管理`
- `App管理`
- `测试历史`
- `设置`
- `运行前检查`
- `怎么开始`
- `Q&A`
- `关于`

Page-title copy still uses `常见问题`, but the current nav label is `Q&A`.

`开始` and `关闭` belong only to `主控台`.

The sidebar also shows:

- product logo + `Voice Typing`
- current workspace label
- current app version in the secondary group footer

## 1.1 Repository Showcase

The GitHub repository README should keep a `参考展示` block near the top of the page.

Current README showcase rule:

- use a GitHub attachment video URL so the repository README can render the demo with GitHub's native player
- prefer the uploaded compressed 1080p showcase asset rather than linking to X / Twitter or a repository-tracked video file
- treat README showcase media as separately hosted presentation assets, not versioned product binaries under `docs/assets/`

## 2. Design Tokens

### 2.1 Color tokens

```css
:root {
  --vtc-bg-app: #f6f7fb;
  --vtc-bg-panel: #ffffff;
  --vtc-bg-soft: #fafbfc;
  --vtc-border-soft: #d9dee7;
  --vtc-border-strong: #c8d0dc;
  --vtc-text-primary: #192132;
  --vtc-text-secondary: #6f7a8c;
  --vtc-accent: #1f2937;
  --vtc-accent-soft: #f1f4f8;
  --vtc-success-text: #166534;
  --vtc-success-bg: #e9f8ee;
  --vtc-warning-text: #92400e;
  --vtc-warning-bg: #fff7e8;
  --vtc-danger-text: #991b1b;
  --vtc-danger-bg: #fff0f0;
}
```

Additional shell tokens already in use:

```css
:root {
  --vtc-timeline-height: 430px;
  --vtc-main-panel-height: 560px;
}
```

### 2.2 Typography tokens

```css
:root {
  --vtc-font-ui: "IBM Plex Sans", "Noto Sans SC", sans-serif;

  --vtc-text-page-title: 18px;
  --vtc-text-section-title: 16px;
  --vtc-text-body: 14px;
  --vtc-text-meta: 12px;
  --vtc-text-nav: 13px;
  --vtc-text-chip: 11px;
}
```

### 2.3 Space tokens

```css
:root {
  --vtc-sidebar-width: 196px;
  --vtc-radius-panel: 16px;
  --vtc-radius-control: 11px;
  --vtc-gap-page: 14px;
  --vtc-gap-panel: 12px;
}
```

## 3. Hugeicons Mapping

| Scene | Hugeicon |
|---|---|
| 主控台 | `DashboardSquare01Icon` |
| 运行前检查 | `CheckListIcon` |
| 样本管理 | `FolderAudioIcon` |
| App管理 | `AppStoreIcon` |
| 测试历史 | `Analytics01Icon` |
| 设置 | `Settings01Icon` |
| 怎么开始 | `BookOpen01Icon` |
| Q&A | `HelpCircleIcon` |
| 关于 | `InformationCircleIcon` |
| 开始 | `PlayCircleIcon` |
| 关闭 | `StopCircleIcon` |
| 样本预览播放 | `PlayIcon` |
| 样本预览暂停 / 结束 | `StopIcon` |
| 删除 App | `Delete02Icon` |
| 导出结果包 | `FileExportIcon` |
| 权限 | `Shield01Icon` |
| 设备 | `Speaker01Icon` |
| 统计 / 结果 | `Analytics01Icon` |

## 4. Main Page Structure

Main page layout is:

- optional warning / failure banners above the workspace
- three-column workspace
- latest-session summary block

Main-page toast behavior:

- keep the global toast in the top-right visual area
- when `page === 'main'`, offset the toast left so it does not cover the top-right `开始` / `关闭` action
- smaller responsive layouts can fall back to the default top-right anchor once the main-page actions stack vertically

The left `目标App` panel on `主控台` is not read-only:

- every app row keeps the enabled-state pill
- every app row also exposes a direct toggle control without extra text label
- the row also shows `.app` file名 or builtin-selftest copy, plus current trigger-mode summary
- toggling here immediately updates the next batch without forcing the operator to jump to `App管理`

The persisted session list belongs to the dedicated `测试历史` page.

### 4.1 Summary strip

Show five compact items:

- enabled apps
- enabled samples
- accessibility state
- current output device
- current progress

Do not use oversized KPI cards. Keep icon left, text label in the middle, and one-line value emphasis on the right.

### 4.2 Center workspace

The center area currently contains:

- `输入检测区` header
- current phase pill
- one explanatory paragraph
- a single shared textarea used as the unified text sink

The renderer no longer shows a separate four-item "current status stack" on the main page. Current state is surfaced through:

- the phase pill in the live-input card
- the timeline on the right
- the top summary strip progress item

### 4.3 Timeline

Timeline rules:

- render from per-run timeline data persisted with each `test_runs` row
- merge live `run:event` updates with persisted runs only while the session is active
- show the whole active session in chronological order across multiple apps; do not collapse the main console down to only the current app
- auto-scroll with the newest event
- support distinct visual classes for:
  - start / end bookends
  - app-level milestones
  - sample-level milestones
  - ordinary actions
  - failures
- only the currently live item pulses
- include an `audio_route` timeline item before `audio_start` whenever helper playback reports routing details, so operators can verify requested vs effective output device ids during debugging
- `audio_start` should display the original sample filename that the operator picked, not the helper-safe temporary playback copy path

### 4.4 Latest-session summary

The section title is `测试统计 {session time}`.

This area shows aggregate stats for the latest visible session on `主控台` and does not react to row selection in `测试历史`.

It is grouped by app:

- app name is the parent node
- a short one-line app summary sits below the app name
- stats render in a plain compact grid instead of large cards
- stat tone can switch between accent / success / warning / danger

Current summary content is derived from the latest session's per-app run group and includes the current session status pill beside the headline.

### 4.5 Main-page banners and dialogs

When one or more real apps are enabled but Accessibility is still missing, `主控台` shows a dedicated warning banner before the generic preflight failure area. The banner keeps both actions:

- `请求辅助功能权限`
- `打开系统设置`

If preflight has one or more blocking failures, the page also shows a second banner with the failure message plus hint for each failed item.

Starting a run first opens a blocking pre-start confirmation dialog with copy telling the operator not to touch mouse or keyboard.

After a batch ends, the renderer opens a completion dialog that shows:

- batch end status
- app count
- sample count
- total elapsed time
- `回主控台` and `知道了` actions

Canceling the pre-start confirmation restores the previously visible latest session on `主控台`.

### 4.6 History page

The `测试历史` page is grouped as:

- session-app card
- sample row

The page header owns a text-style `导入CSV` action that opens a drag-and-drop dialog for compatible result CSV files, while each history app card owns an icon-only `导出该 App ZIP` action.

Each sample row keeps the sample path truncated in the table cell, but hovering or keyboard focusing that path reveals a tooltip with the sample path and the captured ASR result. If no ASR text was captured, the tooltip falls back to the failure reason or `未捕获到结果`.

When a sample row has retry history, the exported result bundle overwrites that row in-place from the reader's perspective: keep the original `run_id`, expose the newest attempt as `latest_run_id`, and export the latest status / text / metrics together with the merged `retry_count`.

Each exported ZIP contains:

- `results.csv`
- `system-info.csv`
- `system-summary.csv`

When exporting from a history app card, all three files are filtered down to that card's app within the original batch session. `system-info.csv` stores fixed-interval CPU and memory samples captured during the run window for that app, while `system-summary.csv` provides one plotting-friendly summary row per run.

When one batch tests multiple apps, the history list splits it into separate cards per app instead of collapsing them into one combined header.

Each history card header renders:

- session start time first
- app label in heavier weight
- optional aggregated app-version text when multiple rows carry versions
- summary line `已结束 / 共 N 条 / 成功 X / 失败 Y / 取消 Z`

The displayed timestamp stays anchored to the batch start time rather than the latest row completion time.

If a session contains one or more failed rows, only the session summary line text switches to the danger color; the card itself does not gain a red background or border.

Each history row also exposes a single-sample retry action.

### 4.7 Sample page

The `样本管理` page currently shows:

- the current sample source (`文件夹` or `JSONL`) and the selected path
- actions for `目录 导入`, `JSONL 导入`, and `重新扫描`
- a compact summary strip with enabled / disabled / invalid / total counts, plus a global `全选` toggle when samples exist
- one virtualized row per sample with path, lightweight preview area, duration, current status, and enable toggle
- a hover tooltip card for the sample path area

Sample metadata stays off the main row and appears in the tooltip card. The tooltip currently includes:

- display name
- language + duration meta
- tag badges
- relative path
- expected text
- optional `sourceMd`
- current status copy

The list is virtualized. Heavier preview controls mount only for the hovered or currently playing row.

Disabling a sample removes it from later benchmark batches without deleting it from the scanned list.

When the app boots, the top notice area first shows `正在检查样本文件...` for a perceptible short duration and then switches to `样本检查完成` so the operator can actually see both states.

An invalid sample means the previously scanned file no longer exists on disk. Invalid samples:

- render in danger styling on the sample list
- show an `无效` status pill
- are forced to `disabled`
- cannot be re-enabled from the UI
- are excluded from benchmark runs and single-sample retries

When loading JSONL:

- the renderer treats `audio_filepath` as a path relative to the JSONL file location
- missing audio files follow the same invalid-sample behavior as directory-based samples
- `text` populates the sample expected-text field so later comparisons and hover details can reuse it
- `duration` is used as a preferred duration hint; if absent or invalid, duration falls back to probing the audio file
- extra metadata fields such as `group_id`, `category`, `subcategory`, and `source_md` are preserved for tooltip display and tagging without widening the sample rows
- stable sample identity is derived from `jsonlPath + (record.id or relative audio path)` so repeated imports can preserve toggles when possible

If rescanning the configured sample root fails because the directory is gone or unreadable, the renderer shows a visible failure notice instead of only logging the raw exception in devtools. The error copy explains that the sample directory is missing and that the operator needs to re-pick it.

### 4.8 App page

The `App管理` page shows:

- a compact summary strip with total apps, enabled apps, real-app enablement, installed real-app count, and builtin self-test state
- one compact card per app
- the nav entry in the upper group, directly below `样本管理`

The page header actions are:

- `刷新安装信息`
- `新增应用`
- `保存设置`

Each app card keeps the header on one row whenever width allows:

- app name first
- optional `官网` link button beside the name
- installed / discovered app version text below the title row when available
- app kind and enabled-state pills
- enable toggle and delete action on the right

The card also shows a one-line summary strip for:

- hotkey
- trigger mode
- launch target summary

Current editable fields are:

- `名称`
- `.app 文件名`
- `官网链接`
- `启动命令`
- `热键`
- `触发方式`
- `备注`

`备注` follows the same aligned form-row structure as the rest of the fields, even though it uses a textarea.

Standalone `Fn` is not captured reliably by Electron keyboard events, so the UI provides an explicit `设为 Fn` action.

Trigger mode copy reflects two distinct behaviors instead of generic variants:

- `hold_release`: `按住并保持，松开结束`
- `press_start_press_stop`: `按下抬起开始，再按下抬起结束`

## 5. Settings Page Structure

The settings page currently has three visible functional blocks:

- simple top actions
- primary-column settings cards
- side-column diagnostic lists

### 5.1 Top actions

The top of the page keeps plain actions only:

- `刷新`
- `保存设置`

### 5.2 Base settings

The first main card is `基本信息与资源路径`.

Current editable global settings:

- workspace label
- output device
- database path
- external sample root

The database path and sample-root rows both keep inline `选择` actions.

### 5.3 Timing and advanced parameters

The second main card is `运行节奏与高级参数` and is split into two parts.

Regular timing fields shown by default:

- `启动 app 延时`
- `聚焦检测框延时`
- `下一条样本播放延时`

Default timing values:

- app launch delay: `5000`
- focus input delay: `2000`
- result timeout: `5000`
- resource sample interval: `1000`
- next sample play delay: `3000`
- close app delay: `3000`

Advanced parameters are collapsed by default so the settings page stays clean for day-to-day use.

Expandable fields:

- `结果超时`
- `系统数据采样间隔`
- `关闭 app 延时`

When collapsed, the page shows a compact preview sentence instead of the form fields.

Target-app editing no longer lives here; it belongs to the dedicated `App管理` page.

### 5.4 Permissions and devices

These are diagnostic lists, not decorative cards.

Permissions:

- accessibility
- automation
- input monitoring

Devices:

- current selected output device
- all discovered output devices

Section titles in the UI:

- `系统权限`
- `音频设备`

The permission card shows a granted-count pill, and the device card shows the current available-device count.

## 6. Intro, FAQ, and About Pages

### 6.1 Intro

The `怎么开始` page is a four-step guide made of clickable cards:

- `1）添加 app`
- `2）热键`
- `3）样本添加`
- `4）开始`

Each card jumps to the corresponding target area in the current app.

### 6.2 FAQ

The FAQ page currently focuses on one speaker-audio troubleshooting scenario.

Current structure:

- hero panel explaining why some voice-typing apps may mute other active audio during dictation
- main FAQ card with eyebrow `常见问题 01`
- question copy `为什么开始测试后，扬声器没声音了？`
- screenshot illustration loaded from `src/renderer/assets/mute-during-dictation.svg`

### 6.3 About

The `关于` page is currently implemented by `VersionNotesPanel` rather than a static about sheet.

It contains:

- hero block with headline, summary, focus tags, and current version pill
- `评测方式` column
- `当前结果` column
- `接下来` ordered list

The content lives in `src/renderer/content/version-notes.ts` and is framed as methodology + current-results notes rather than only release notes.

## 7. Runtime Interaction Rules

- The benchmark window must reclaim frontmost state before text observation.
- The live textarea is the only text sink.
- Starting a run first opens a blocking pre-start confirmation dialog.
- Real-app launch happens once per app batch, not once per sample.
- After the last sample for one app, the app is closed after `关闭 app 延时`.
- While the pre-start dialog is open, the renderer blocks pointer and keyboard interaction outside the dialog.
- Single-sample retry reuses the same run pipeline, but scopes the next run to the selected app + sample pair and records retry lineage.

## 8. Suggested Component Inventory

- `AppShell`
- `Sidebar`
- `TopBar`
- `SummaryStrip`
- `LiveInputPanel`
- `TimelineList`
- `LatestSessionSummary`
- `SessionHistoryList`
- `SamplesPage`
- `AppsPage`
- `SettingsPage`
- `ChecksPage`
- `IntroPage`
- `FaqPage`
- `VersionNotesPanel`
- `PreRunDialog`
- `CompletionDialog`
- `CsvImportDialog`
- `PermissionList`
- `DeviceList`

## 9. Renderer Structure

The current implementation is still centered around:

- `src/renderer/App.vue`
- `src/renderer/styles.css`
- `src/renderer/components/VersionNotesPanel.vue`
- `src/renderer/content/version-notes.ts`

Later decomposition can move page sections into:

- `src/renderer/pages/`
- `src/renderer/components/`
- `src/renderer/composables/`

But new work should follow the current product behavior first, not older page-label or modal assumptions.
