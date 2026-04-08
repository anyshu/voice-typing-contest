# Voice Typing Contest UI Design

## 1. UI Direction

This app should look like a focused local benchmark tool, not a flashy consumer product.

The visual language is:

- gray / white base
- light, thin, compact surfaces
- sharp information hierarchy
- sparse but deliberate icon use
- low-noise data-first layout
- clear parent / child grouping in result summaries

Keywords:

- calm
- precise
- desktop
- test-lab
- compact

## 2. Visual Rules

### 2.1 Color

Base palette:

- `bg.app = #F3F4F6`
- `bg.panel = #FCFCFD`
- `bg.elevated = #FFFFFF`
- `border.soft = #E5E7EB`
- `border.strong = #D1D5DB`
- `text.primary = #111827`
- `text.secondary = #4B5563`
- `text.tertiary = #6B7280`
- `text.inverse = #FFFFFF`
- `accent.active = #1F2937`
- `accent.muted = #9CA3AF`
- `success = #166534`
- `success.bg = #DCFCE7`
- `warning = #92400E`
- `warning.bg = #FEF3C7`
- `danger = #991B1B`
- `danger.bg = #FEE2E2`

The app stays mostly gray and white. Status colors appear only in small areas:

- badges
- state dots
- progress hints
- failure rows

### 2.2 Typography

Suggested fonts:

- Chinese UI: `Noto Sans SC`
- English / number emphasis: `IBM Plex Sans`
- timing / code / file path: `IBM Plex Mono`

Type scale:

- page title: `18 / semibold`
- section title: `16 / semibold`
- card title: `14 / semibold`
- body: `13 / regular`
- meta: `11 / regular`
- metric number: `15 / semibold`
- tiny status: `10 / medium`

### 2.3 Shape

- border radius: `12`
- small chip radius: `999`
- card padding: `16`
- modal padding: `20`
- row height: `40`
- primary button height: `36`

Flat look:

- no obvious glassmorphism
- no strong gradients
- no deep shadows

Use only a very light shadow for floating surfaces:

- `0 8 24 rgba(17, 24, 39, 0.06)`

### 2.4 Hugeicons

Use Hugeicons outline style for most actions.

Icon rules:

- size `18` in toolbar and list rows
- size `20` in section headers
- size `16` inside chips and buttons
- stroke color follows nearby text color

Suggested icon mapping:

- app dashboard: `Dashboard Square 01`
- target app: `Square Lock 02` or `Window 01`
- sample set: `Audio Wave 02`
- run: `Play Circle`
- stop: `Stop Circle`
- settings: `Settings 02`
- permissions: `Shield 01`
- database: `Database`
- result detail: `Chart Line Data 01`
- intro/about: `Info Circle`
- folder choose: `Folder Open`
- add item: `Plus Sign`
- remove item: `Delete 02`
- retry/check: `Refresh`

## 3. App Structure

The current app shell has these first-level pages:

- 主控台
- 样本管理
- App管理
- 测试历史
- 设置
- 运行前检查
- 怎么开始
- Q&A
- 关于

Global configuration lives in the dedicated `设置` page, while per-app editing lives in the dedicated `App管理` page rather than a modal.

The result experience is split into:

- `主控台` for the current timeline and latest-session summary
- `测试历史` for browsing persisted sessions and exporting one batch at a time, with hover/focus tooltips on sample paths so long ASR output can still be inspected without widening the table
- `Q&A` for the most common audio-routing troubleshooting case with an inline illustration; page-level content still uses `常见问题 01` inside the card copy

The current renderer is Chinese-first.

## 4. Window Layout

Desktop window recommendation:

- default: `1360 x 900`
- min: `1180 x 760`

Overall shell:

```text
+--------------------------------------------------------------------------------------+
| Sidebar              | Top Bar                                                       |
|----------------------|---------------------------------------------------------------|
| Logo / App name      | Current page title                            Quick actions   |
| 主控台               |---------------------------------------------------------------|
| 样本管理             |                                                               |
| App管理              |                                                               |
| 测试历史             |                                                               |
| 设置                 |                                                               |
| 运行前检查           |                                                               |
| 怎么开始             |                                                               |
| Q&A                  |                                                               |
| 关于                 |                                                               |
+--------------------------------------------------------------------------------------+
```

### 4.1 Sidebar

Style:

- width about `196`
- full-height pale gray panel
- logo area at top
- nav in middle
- settings entry pinned at bottom

Sidebar items:

- icon
- label
- active left bar
- soft background when selected

## 5. Main Page

### 5.1 Goal

This is the operational center.

It should answer these questions at a glance:

- what will run
- what is running now
- whether the environment is ready
- what just happened
- how the latest batch performed per app

### 5.2 Layout

```text
+--------------------------------------------------------------------------------------------------+
| Main                                                                    [Start] [Close] |
|--------------------------------------------------------------------------------------------------|
| Warning / preflight banners (optional)                                                        |
| Summary strip                                                                                   |
| [Apps: 3] [Samples: 24] [Permission: Ready] [Device: BlackHole 2ch] [Progress: 12 / 24]        |
|--------------------------------------------------------------------------------------------------|
| Left: Targets                                | Center: Live Test Box      | Right: Timeline      |
|-----------------------------------------------|-----------------------------|----------------------|
| Target Apps                                   | +-------------------------+ | Start                |
| > Xiguashuo        Enabled                    | | voice typing appears... | | App start            |
|   Wispr Flow       Enabled                    | |                         | | Sample start         |
|   App C            Disabled                   | +-------------------------+ | Trigger start        |
|-----------------------------------------------| explanatory copy + phase   | Audio start          |
| .app name / builtin note / trigger mode       | pill only, no 4-card stack | Trigger stop         |
|                                               |                            | End                  |
|--------------------------------------------------------------------------------------------------|
| Latest Session Summary                                                                           |
| headline includes session time + status pill                                                     |
| Xiguashuo -> compact stat grid                                                                   |
| Wispr Flow -> compact stat grid                                                                  |
+--------------------------------------------------------------------------------------------------+
```

The main timeline should read from the same per-run timeline data that is stored with each run record. Live events may be merged with persisted per-run timelines while a session is active, but the renderer should not maintain a separate display-only event model after the run finishes.

### 5.3 Regions

#### Warning / preflight banners

Use short full-width banners above the workspace when needed:

- accessibility is still missing for one or more enabled real apps
- preflight has one or more blocking failures

The accessibility banner keeps these two actions:

- `请求辅助功能权限`
- `打开系统设置`

#### Summary strip

Use five compact summary items:

- app count
- sample count
- permission state
- selected virtual device
- current batch progress

Each chip has:

- Hugeicon
- short label
- short status value

#### Left column

Use a compact target-app overview card.

The target app list should show:

- enabled state
- readiness state
- trigger mode tag

#### Center column

This is the visual anchor.

The input box card should be the largest area because it is the thing being measured.

The current implementation no longer shows a separate four-item status stack under the input box.
Current state is instead surfaced by:

- the phase pill on the live card
- the right-side timeline
- the progress item in the top summary strip

Below the main region, show one summary area for the latest session:

- grouped by app
- parent app title is more prominent
- child stats are smaller and tighter in a compact plain grid
- no raw recognized paragraph in this area

#### Right column

Use a narrow event log card.

Each row shows:

- elapsed timestamp
- event label
- explanatory detail

Timeline color semantics:

- bookend rows for start and end
- blue rows for app-level milestones
- green rows for sample-level milestones
- neutral rows for ordinary actions
- red rows for failures
- only the currently live row gets the pulse treatment

### 5.4 Main actions

Top-right actions on the main page:

- `开始`
- `关闭`
- no global run buttons on other pages

Rules:

- `开始` is dark gray filled
- `关闭` is white with gray border
## 6. Settings Page

### 6.1 Rule

Only global editable settings live on the dedicated `设置` page.

### 6.2 Structure

The current page has three visible functional blocks:

- top actions
- base settings
- advanced parameters
- permissions and devices

### 6.3 Base settings

Fields:

- workspace label
- output device
- database path
- external sample root

These two path rows keep inline chooser buttons:

- database path -> `选择`
- external sample root -> `选择`

Regular timing fields remain in the main settings card:

- app launch delay
- focus input delay
- next sample play delay

Top actions are plain and direct:

- refresh
- save settings

### 6.4 Advanced parameters

Advanced parameters are hidden behind an explicit expand action by default.

Fields:

- result timeout
- resource sample interval
- close app delay

#### Permissions and Devices

The lower settings region is operational and explicit.

```text
+----------------------------------------------------------------------------------+
| 系统权限                                                                         |
|----------------------------------------------------------------------------------|
| Accessibility      Required     Granted / Missing       [Check again]            |
| Automation         Optional     Granted / Missing       [Open settings]          |
| Input Monitoring   Optional     Granted / Missing       [Open settings]          |
|----------------------------------------------------------------------------------|
| 音频设备                                                                         |
| - current selected output device                                                 |
| - all discovered output devices                                                  |
+----------------------------------------------------------------------------------+
```

## 7. App Page

### 7.1 Goal

This page is the per-app editor.

It should make it easy to answer:

- which apps are enabled
- which real apps are installed right now
- what hotkey and trigger mode each app uses
- whether the builtin self-test is still available as a fallback

### 7.2 Layout

```text
+----------------------------------------------------------------------------------+
| App管理                                                           [刷新] [新增] |
|----------------------------------------------------------------------------------|
| [总数] [已启用] [真实 App] [已安装真实 App] [内建自测]                            |
|----------------------------------------------------------------------------------|
| +------------------------------------------------------------------------------+ |
| | Typeless                                                [启用] [删除]        | |
| | [真实 App] [已启用]  热键 Fn · 按住并保持，松开结束 · 启动目标 Typeless.app   | |
| | 名称           [Typeless_____________________________]                       | |
| | .app 文件名    [Typeless.app_________________________]                       | |
| | 启动命令       [_____________________________________]                       | |
| | 热键           [Fn__________________] [点击录制] [设为 Fn]                  | |
| | 触发方式       [按住并保持，松开结束 v]                                      | |
| | 备注           [例如先关闭语音输入时静音______________________________]      | |
| +------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------+
```

### 7.3 Style

- use compact cards instead of split list-and-editor panes
- keep the app header on one row whenever width allows
- use restrained hover lift only
- keep summary chips dense and operational

## 8. Intro Page

### 8.1 Goal

This page is not marketing.

It is a concise onboarding page for a tester who just opened the tool.

### 8.2 Layout

```text
+----------------------------------------------------------------------------------+
| Intro                                                                            |
|----------------------------------------------------------------------------------|
| 先按这个顺序走。                                                                 |
|                                                                                  |
| [1) 添加 app] [2) 热键] [3) 样本添加] [4) 开始]                                   |
|                                                                                  |
| 每个按钮都是一个导航入口：                                                        |
| - 添加 app -> 跳到 App管理                                                      |
| - 热键 -> 跳到当前启用 app 的热键编辑区                                          |
| - 样本添加 -> 跳到样本管理                                                       |
| - 开始 -> 回到主控台                                                             |
+----------------------------------------------------------------------------------+
```

### 8.3 Style

Use plain shortcut blocks:

- short imperative copy
- obvious click target
- no decorative checklist pretending to be live state

## 9. About Page

### 9.1 Goal

This page explains how the benchmark works, what results are currently produced, and where local data goes.

It should feel factual, lightweight, and closer to an about / methodology page than a release-notes page.

### 9.2 Layout

```text
+----------------------------------------------------------------------------------+
| About                                                                            |
|----------------------------------------------------------------------------------|
| 方法说明 / 当前结果 / 接下来                                                     |
| Version v0.2.0                                                                    |
|                                                                                  |
| 这不是 release notes 墙，而是一页 methodology 说明。                             |
|                                                                                  |
| [同样本] [同流程] [结果落库] [历史回看]                                           |
|                                                                                  |
| 左侧：评测方式卡片                                                                |
| 右侧：当前结果列表                                                                |
| 底部：接下来                                                                     |
+----------------------------------------------------------------------------------+
```

## 10. Interaction Notes

### 10.1 Main page behavior

- the current running sample row gets a soft dark outline
- the current target app row gets a filled pale highlight
- timeline list auto-scrolls
- latest-session summary switches to the active session once progress has a `sessionId`
- canceling the pre-start confirmation restores the previously visible latest session summary

### 10.2 History page behavior

- `测试历史` owns the persisted session list
- each session card expands to app groups and sample rows
- each session header shows `时间 + App 名称 + 汇总` on the same row, with the app name visually heavier than the summary text
- `导出本轮 CSV` belongs to the session header
- exported CSV rows should stay anchored to the original history row, so `run_id` remains the root run id while `latest_run_id` points at the newest retry attempt
- history reads run timelines from persisted per-run timeline snapshots

### 10.3 Sample page behavior

- the sample list should keep file paths at regular weight instead of bold, so the row reads as a lightweight checklist
- each sample row should expose a minimal inline preview player with `开始/暂停`, a progress slider, and elapsed / total time
- sample rows should render as a virtualized list, and the heavier preview controls should mount only for the hovered or actively playing row

### 10.4 App page behavior

- `App管理` lives in the upper navigation group directly below `样本管理`
- each app card keeps `App 名称 + 类型/状态 pills + 启用/删除操作` on one row when there is enough width
- compact fields should use one-row label/control alignment instead of stacked labels
- hover on an app card should only add a restrained lift, border emphasis, and soft shadow

### 10.5 FAQ page behavior

- show one focused troubleshooting story first instead of a generic accordion dump
- keep the screenshot / illustration visible next to the explanation
- use warning styling sparingly so the page still feels like product documentation, not an error screen

### 10.6 Feedback style

Use restrained motion only:

- `120ms` hover fade
- dark pulse is allowed only for the currently running timeline item

No bouncing and no animated charts during idle state.

### 10.7 Empty states

Keep empty states plain:

- one icon
- one sentence
- one action button

Example:

`No audio samples yet. Add a sample folder in 设置.`

## 11. Component Rules

### 11.1 Buttons

- Primary: dark gray fill, white text
- Secondary: white fill, gray border
- Ghost: transparent, text only, hover background
- Danger: white fill, red text, pale red hover

### 11.2 Chips

Use chips for:

- permission state
- app state
- sample language

### 11.3 Tables

Result table rules:

- sticky header
- row height `36`
- monospaced metric columns
- keep rows compact and readable

### 11.4 Inputs

Use flat controls:

- white background
- gray border
- dark text
- stronger border on focus

## 11. Icon and Label Tone

Labels should be short and direct.

Good:

- 开始运行
- 关闭本轮
- 设置
- 设备
- 权限
- 导出本轮 CSV

Avoid:

- Start Benchmark Execution
- Configure Current Environment
- Synchronize Device Status
