# Voice Typing Contest UI Dev Spec

## 1. Current Shell

The renderer currently uses a desktop shell with:

- fixed left sidebar
- scrollable right content area
- top bar with page title and main-page actions

Current first-level pages:

- `主控台`
- `运行前检查`
- `样本`
- `设置`
- `怎么开始`
- `当前实现`

`开始运行` and `关闭本轮` belong only to `主控台`.

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
  --vtc-success-text: #166534;
  --vtc-success-bg: #e9f8ee;
  --vtc-warning-text: #92400e;
  --vtc-warning-bg: #fff7e8;
  --vtc-danger-text: #991b1b;
  --vtc-danger-bg: #fff0f0;
}
```

### 2.2 Typography tokens

```css
:root {
  --vtc-font-ui: "IBM Plex Sans", "Noto Sans SC", sans-serif;

  --vtc-text-page-title: 18px;
  --vtc-text-section-title: 16px;
  --vtc-text-card-title: 14px;
  --vtc-text-body: 13px;
  --vtc-text-meta: 11px;
  --vtc-text-stat: 12px;
  --vtc-text-stat-strong: 15px;
  --vtc-text-chip: 10px;
}
```

### 2.3 Space tokens

```css
:root {
  --vtc-sidebar-width: 196px;
  --vtc-radius-panel: 16px;
  --vtc-radius-control: 11px;
  --vtc-panel-padding: 14px;
  --vtc-gap-page: 14px;
  --vtc-gap-panel: 12px;
}
```

## 3. Hugeicons Mapping

| Scene | Hugeicon |
|---|---|
| 主控台 | `DashboardSquare01Icon` |
| 运行前检查 | `CheckListIcon` |
| 样本 | `FolderAudioIcon` |
| 设置 | `Settings01Icon` |
| 怎么开始 | `BookOpen01Icon` |
| 当前实现 | `InformationCircleIcon` |
| 开始运行 | `PlayCircleIcon` |
| 关闭本轮 | `StopCircleIcon` |
| 权限 | `Shield01Icon` |
| 设备 | `Speaker01Icon` |
| 统计 / 结果 | `Analytics01Icon` |

## 4. Main Page Structure

Main page layout is:

- summary strip
- three-column workspace
- latest-session summary
- result sessions list

### 4.1 Summary strip

Show five compact items:

- enabled apps
- enabled samples
- accessibility state
- current output device
- current progress

Do not use oversized KPI cards. Keep icon left, text right, one-line value emphasis only.

### 4.2 Center workspace

The center area contains:

- live input box
- compact current status strip

The current status strip is a single horizontal line:

- current phase
- current message
- current app
- current sample

It should not be rendered as four identical cards.

### 4.3 Timeline

Timeline rules:

- only current run events are shown
- auto-scroll with the newest event
- two visual states only:
  - running: green pulse
  - completed: dark green

### 4.4 Latest-session summary

The section title is `测试结果`.

This area shows aggregate stats for the latest session only and does not react to row selection.

It is grouped by app:

- app name is the parent node
- a short one-line app summary sits below the app name
- stats are child nodes with smaller type and tighter spacing
- child stats use a subtle tree indentation
- eight stats should fit into two rows

Current stats per app:

- sample count
- success count
- failure count
- average first-char latency
- average text length
- max first-char latency
- median first-char latency
- total run time

### 4.5 Result list

The result list is grouped as:

- session
- app
- sample row

The session header owns the `导出本轮 CSV` action.

## 5. Settings Page Structure

The settings page has three functional blocks:

- base settings
- target apps
- permissions and devices

### 5.1 Base settings

Current editable global settings:

- output device
- database path
- external sample root
- `启动 app 延时`
- `聚焦检测框延时`
- `结果超时`
- `下一条样本播放延时`
- `关闭 app 延时`
- run notes

Default timing values:

- app launch delay: `5000`
- focus input delay: `2000`
- result timeout: `5000`
- next sample play delay: `3000`
- close app delay: `3000`

### 5.2 Target apps

Per-app settings currently keep only app-specific trigger behavior:

- name
- `.app` file name
- hotkey
- hotkey trigger mode
- launch command
- key-to-audio delay
- audio-to-stop delay
- settle window
- notes
- enabled flag

Standalone `Fn` is not captured reliably by Electron keyboard events, so the UI must provide an explicit `设为 Fn` action.

### 5.3 Permissions and devices

These are diagnostic lists, not decorative cards.

Permissions:

- accessibility
- automation
- input monitoring

Devices:

- current selected output device
- all discovered output devices

## 6. Runtime Interaction Rules

- The benchmark window must reclaim frontmost state before text observation.
- The live textarea is the only text sink.
- Real-app launch happens once per app batch, not once per sample.
- After the last sample for one app, the app is closed after `关闭 app 延时`.

## 7. Suggested Component Inventory

- `AppShell`
- `Sidebar`
- `TopBar`
- `SummaryStrip`
- `LiveInputPanel`
- `TimelineList`
- `LatestSessionSummary`
- `AppSummaryTree`
- `SessionGroup`
- `AppGroupTable`
- `ChecksPage`
- `SamplesPage`
- `SettingsPage`
- `PermissionList`
- `DeviceList`

## 8. Renderer Structure

The current implementation is still centered around:

- `src/renderer/App.vue`
- `src/renderer/styles.css`

Later decomposition can move page sections into:

- `src/renderer/pages/`
- `src/renderer/components/`
- `src/renderer/composables/`

But new work should follow the current product behavior first, not the older modal/drawer plan.
