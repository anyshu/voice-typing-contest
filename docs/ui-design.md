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
- 样本
- 测试历史
- 设置
- 运行前检查
- 怎么开始
- 关于

Configuration already lives in the dedicated `设置` page rather than a modal.

The result experience is split into:

- `主控台` for the current timeline and latest-session summary
- `测试历史` for browsing persisted sessions and exporting one batch at a time, with hover/focus tooltips on sample paths so long ASR output can still be inspected without widening the table

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
| 样本                 |                                                               |
| 测试历史             |                                                               |
| 设置                 |                                                               |
| 运行前检查           |                                                               |
| 怎么开始             |                                                               |
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
| Summary strip                                                                                   |
| [Apps: 3] [Samples: 24] [Permission: Ready] [Device: BlackHole 2ch] [Progress: 12 / 24]        |
|--------------------------------------------------------------------------------------------------|
| Left: Targets                                | Center: Live Test Box      | Right: Timeline      |
|-----------------------------------------------|-----------------------------|----------------------|
| Target Apps                                   | +-------------------------+ | Start                |
| > Xiguashuo        Enabled                    | | voice typing appears... | | App start            |
|   Wispr Flow       Enabled                    | |                         | | Sample start         |
|   App C            Disabled                   | +-------------------------+ | Trigger start        |
|-----------------------------------------------| Current status             | Audio start          |
| App / sample / phase / message                | Current app + sample       | Trigger stop         |
|                                               |                            | End                  |
|--------------------------------------------------------------------------------------------------|
| Latest Session Summary                                                                           |
| Xiguashuo -> total / success / avg first char / median / total time                              |
| Wispr Flow -> total / success / avg first char / median / total time                             |
+--------------------------------------------------------------------------------------------------+
```

The main timeline should read from the same per-run timeline data that is stored with each run record. Live events may be merged with persisted per-run timelines while a session is active, but the renderer should not maintain a separate display-only event model after the run finishes.

### 5.3 Regions

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

Under the input box, show a compact status stack:

- current state
- current message
- current app
- current sample

Below the main region, show one summary area for the latest session:

- grouped by app
- parent app title is more prominent
- child stats are smaller and tighter
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

All editable settings live on the dedicated `设置` page.

### 6.2 Structure

The current page has three main blocks:

- base settings
- target apps
- permissions and devices

### 6.3 Base settings

Fields:

- output device
- database path
- external sample root
- app launch delay
- focus input delay
- result timeout
- next sample play delay
- close app delay
- run notes

#### Target Apps

This is the most important editor block.

```text
+----------------------------------------------------------------------------------+
| Target Apps                                                                      |
|----------------------------------------------------------------------------------|
| App list                          | Editor                                       |
|-----------------------------------|----------------------------------------------|
| > Xiguashuo                       | Name: [Xiguashuo____________]                |
|   Wispr Flow                      | Enabled: [on ]                              |
|   + Add App                       | App file name: [Xiguashuo.app___________]   |
|                                   | Launch command: [optional________________]  |
|                                   | Hotkey capture: [ press any combination ]  |
|                                   | Trigger mode: (o) hold->release            |
|                                   |               ( ) press start->press stop  |
|                                   | Key -> audio delay:  [180 ] ms             |
|                                   | Audio -> stop trigger: [60 ] ms            |
|                                   | Settle window:       [600 ] ms             |
|                                   | Notes:               [...................] |
|                                   |                    [Disable] [Save] [Delete] |
+----------------------------------------------------------------------------------+
```

#### Permissions and Devices

The lower settings region is operational and explicit.

```text
+----------------------------------------------------------------------------------+
| Permissions                                                                      |
|----------------------------------------------------------------------------------|
| Accessibility      Required     Granted / Missing       [Check again]            |
| Automation         Optional     Granted / Missing       [Open settings]          |
| Input Monitoring   Optional     Granted / Missing       [Open settings]          |
|----------------------------------------------------------------------------------|
| Notes                                                                             |
| - Core benchmark requires Accessibility.                                         |
| - Automation is only needed for optional app management flows.                   |
+----------------------------------------------------------------------------------+
```

## 7. Intro Page

### 7.1 Goal

This page is not marketing.

It is a concise onboarding page for a tester who just opened the tool.

### 7.2 Layout

```text
+----------------------------------------------------------------------------------+
| Intro                                                                            |
|----------------------------------------------------------------------------------|
| Voice Typing Contest                                                             |
| A local benchmark tool for comparing voice typing apps on macOS.                |
|                                                                                  |
| +-------------------------+  +-------------------------+  +---------------------+ |
| | 1. Prepare              |  | 2. Configure           |  | 3. Run              | |
| | Optional virtual audio |  | Add apps and samples   |  | Start benchmark     | |
| | Capture app hotkey      |  | Check permissions      |  | Review result table  | |
| +-------------------------+  +-------------------------+  +---------------------+ |
|                                                                                  |
| Environment checklist                                                            |
| [ ] Accessibility granted                                                        |
| [ ] Virtual device installed                                                     |
| [ ] Target apps configured                                                       |
| [ ] Sample folder ready                                                          |
|                                                                                  |
|                                                                    [Go Main]    |
+----------------------------------------------------------------------------------+
```

### 7.3 Style

Use large plain cards with:

- one Hugeicon
- one short heading
- two lines of explanation

No illustration, no hero gradient, no dashboard clutter.

## 8. About Page

### 8.1 Goal

This page explains how the benchmark works, what results are currently produced, and where local data goes.

It should feel factual, lightweight, and closer to an about / methodology page than a release-notes page.

### 8.2 Layout

```text
+----------------------------------------------------------------------------------+
| About                                                                            |
|----------------------------------------------------------------------------------|
| Voice Typing Contest                                                             |
| Version 0.1.0                                                                    |
|                                                                                  |
| This app benchmarks multiple macOS voice typing apps with the same audio set.   |
| It records typed output, key timestamps, and failure reasons into local storage. |
|                                                                                  |
| Info                                                                             |
| - Platform: macOS desktop                                                        |
| - Runtime: Electron + Vue renderer + native helper                              |
| - Storage: local SQLite                                                          |
| - UI language: Chinese-first                                                     |
| - Permissions: Accessibility required                                            |
|                                                                                  |
| Paths                                                                            |
| - Database: /.../voice-typing-contest.sqlite                                     |
| - Logs: /.../logs                                                                |
|                                                                                  |
|                                                   [Open Logs] [Open DB Folder]   |
+----------------------------------------------------------------------------------+
```

## 9. Interaction Notes

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

### 10.5 Feedback style

Use restrained motion only:

- `120ms` hover fade
- dark pulse is allowed only for the currently running timeline item

No bouncing and no animated charts during idle state.

### 10.5 Empty states

Keep empty states plain:

- one icon
- one sentence
- one action button

Example:

`No audio samples yet. Add a sample folder in 设置.`

## 10. Component Rules

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
