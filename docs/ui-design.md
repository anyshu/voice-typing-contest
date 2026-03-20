# Voice Typing Contest UI Design

## 1. UI Direction

This app should look like a focused local benchmark tool, not a flashy consumer product.

The visual language is:

- gray / white base
- flat surfaces
- sharp information hierarchy
- sparse but deliberate icon use
- low-noise data-first layout

Keywords:

- calm
- precise
- desktop
- test-lab

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

- page title: `28 / semibold`
- section title: `18 / semibold`
- card title: `15 / semibold`
- body: `13 / regular`
- meta: `12 / regular`
- metric number: `24 / semibold`
- tiny status: `11 / medium`

### 2.3 Shape

- border radius: `12`
- small chip radius: `999`
- card padding: `16`
- modal padding: `20`
- row height: `40`
- primary button height: `36`

Flat look:

- no glassmorphism
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

The app has three first-level pages:

- Main
- Intro
- About

All editable configuration lives inside the `Settings` secondary modal.

There is also one run detail drawer on the main page.

The renderer should support zh-CN and English modes, with language switching visible in the shell rather than hidden deep inside settings.

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
| Main                 |---------------------------------------------------------------|
| Intro                | Page content                                                  |
| About                |                                                               |
|----------------------|                                                               |
| Settings button      |                                                               |
+--------------------------------------------------------------------------------------+
```

### 4.1 Sidebar

Style:

- width `208`
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

It should answer four questions at a glance:

- what will run
- what is running now
- whether the environment is ready
- what just happened

### 5.2 Layout

```text
+--------------------------------------------------------------------------------------------------+
| Main                                                     [Run] [Stop] [Theme] [Language] |
|--------------------------------------------------------------------------------------------------|
| Summary strip                                                                                   |
| [Apps: 3] [Samples: 24] [Permission: Ready] [Device: BlackHole 2ch] [DB: OK]                   |
|--------------------------------------------------------------------------------------------------|
| Left: Run Plan                               | Center: Live Test Box      | Right: Live Timeline |
|-----------------------------------------------|-----------------------------|----------------------|
| Target Apps                                   | Input Box                   | 16:02:01 hotkey down|
| > Xiguashuo        Ready                      | +-------------------------+ | 16:02:01 audio start|
|   Wispr Flow       Ready                      | | voice typing appears... | | 16:02:03 audio end  |
|   App C            Missing hotkey             | |                         | | 16:02:04 first text |
|-----------------------------------------------| +-------------------------+ | 16:02:04 last text  |
| Audio Samples                                 | Result Snapshot            |                      |
| zh-basic-01.wav   2.4s                        | Status: success            |                      |
| zh-basic-02.wav   3.1s                        | First char: 850 ms         |                      |
| zh-basic-03.wav   1.8s                        | Final text: 1440 ms        |                      |
|-----------------------------------------------| Text length: 18            |                      |
| Batch Progress                                |                             |                      |
| [##########------] 12 / 24                    |                             |                      |
|--------------------------------------------------------------------------------------------------|
| Result Table                                                                                     |
| App          Sample            Status    First Char    Final Latency    Raw Text...              |
| Xiguashuo    zh-basic-01.wav   OK        850 ms        1440 ms          你好...                  |
| Wispr Flow   zh-basic-01.wav   Timeout   --            --               --                       |
+--------------------------------------------------------------------------------------------------+
```

### 5.3 Regions

#### Summary strip

Use five compact status chips:

- app count
- sample count
- permission state
- selected virtual device
- database state

Each chip has:

- Hugeicon
- short label
- short status value

#### Left column

Split into three cards:

- target apps
- audio samples
- batch progress

The target app list should show:

- enabled state
- readiness state
- trigger mode tag

The sample list should show:

- file name
- duration
- expected text available or not

#### Center column

This is the visual anchor.

The input box card should be the largest area because it is the thing being measured.

Under the input box, show a compact result block:

- current state
- first char latency
- final latency
- text length
- failure reason if any

#### Right column

Use a narrow event log card.

Each row shows:

- timestamp
- event label
- subtle state dot

### 5.4 Main actions

Top-right actions:

- `Run`
- `Stop`
- theme toggle
- language toggle

Rules:

- `Run` is dark gray filled
- `Stop` is white with gray border
- theme and language toggles are compact ghost controls
- `Settings` stays in the lower sidebar, not in the top action area

## 6. Settings Modal

### 6.1 Rule

All editable settings live here.

This is a second-level modal from any first-level page.

Open behavior:

- centered modal
- width `980`
- height `720`
- inner left tab rail

### 6.2 Structure

```text
+----------------------------------------------------------------------------------+
| Settings                                                          [Close]         |
|----------------------------------------------------------------------------------|
| Tabs                     | Content                                                |
|--------------------------|--------------------------------------------------------|
| General                  | Section title                                          |
| Target Apps              | form rows / list editor / save actions                 |
| Audio Samples            |                                                        |
| Timing                   |                                                        |
| Devices                  |                                                        |
| Permissions              |                                                        |
| Database                 |                                                        |
| Advanced                 |                                                        |
+----------------------------------------------------------------------------------+
```

### 6.3 Tabs

#### General

Fields:

- interface language (`zh-CN` / `en`)
- default result directory
- auto-save logs
- open last project on launch

#### Target Apps

This is the most important setting tab.

Use a master-detail flat editor.

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
|                                   | Audio input: [BlackHole 2ch______________] |
|                                   | Hotkey capture: [ press any combination ]  |
|                                   | Trigger mode: (o) hold->release            |
|                                   |               ( ) press start->press stop  |
|                                   | Pre delay:          [120 ] ms              |
|                                   | Key -> audio delay:  [180 ] ms             |
|                                   | Audio -> stop trigger: [60 ] ms            |
|                                   | Timeout:             [5000] ms             |
|                                   | Settle window:       [600 ] ms             |
|                                   | Notes:               [...................] |
|                                   |                    [Disable] [Save] [Delete] |
+----------------------------------------------------------------------------------+
```

#### Audio Samples

Use a folder-based list with import actions.

Fields and actions:

- sample root folder
- rescan button
- manual add file
- expected text editor
- sample language tag
- enable / disable

The target app editor should expose both app enable state and the expected audio input route so testers can skip apps without deleting profiles and verify routing before a run.

#### Timing

This tab exists for global defaults, not per-app overrides.

Fields:

- global launch timeout
- default result timeout
- default settle window
- cooldown between runs

Use compact number inputs with `ms` suffix chips.

#### Devices

Show three blocks:

- selected virtual output device
- available device list
- recheck devices button

This page should be diagnostic, not decorative.

#### Permissions

This tab is operational and explicit.

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

#### Database

Fields:

- database path
- rotate log policy
- export CSV button
- open folder button

#### Advanced

Only for power users.

Fields:

- store raw event payloads
- enable verbose log
- retry failed sample count
- debug helper path override

### 6.4 Modal Footer

Global footer buttons:

- `Cancel`
- `Apply`
- `Save and Close`

Behavior:

- `Apply` saves without closing
- `Save and Close` is primary

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
| | Install BlackHole       |  | Add apps and samples   |  | Start benchmark     | |
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

This page explains what the tool does and where local data goes.

It should feel factual and lightweight.

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
| - UI language: zh-CN / en                                                        |
| - Permissions: Accessibility required                                            |
|                                                                                  |
| Paths                                                                            |
| - Database: /.../voice-typing-contest.sqlite                                     |
| - Logs: /.../logs                                                                |
|                                                                                  |
|                                                   [Open Logs] [Open DB Folder]   |
+----------------------------------------------------------------------------------+
```

## 9. Run Detail Drawer

This is not a first-level page.

It slides from the right when the user clicks a row in the result table.

```text
+--------------------------------------------------------------+
| Run Detail                                             [x]   |
|--------------------------------------------------------------|
| App: Xiguashuo                                             |
| Sample: zh-basic-01.wav                                    |
| Status: success                                            |
|--------------------------------------------------------------|
| Timeline                                                    |
| trigger_start    16:02:01.120                              |
| audio_started    16:02:01.260                              |
| audio_ended      16:02:03.840                              |
| first_input      16:02:04.110                              |
| last_input       16:02:04.680                              |
|--------------------------------------------------------------|
| Raw text                                                    |
| 你好，今天我们开始测试                                       |
|--------------------------------------------------------------|
| Metrics                                                     |
| First char latency      850 ms                              |
| Final latency           1440 ms                             |
| Text length             18                                  |
|--------------------------------------------------------------|
| Failure reason                                                |
| --                                                           |
+--------------------------------------------------------------+
```

## 10. Interaction Notes

### 10.1 Main page behavior

- the current running sample row gets a soft dark outline
- the current target app row gets a filled pale highlight
- timeline list auto-scrolls
- result table appends rows in real time

### 10.2 Feedback style

Use restrained motion only:

- `120ms` hover fade
- `160ms` modal appear
- `160ms` drawer slide

No bouncing, no pulse loops, no animated charts during idle state.

### 10.3 Empty states

Keep empty states plain:

- one icon
- one sentence
- one action button

Example:

`No audio samples yet. Add a sample folder in Settings.`

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
- trigger mode
- sample language

### 11.3 Tables

Result table rules:

- sticky header
- row height `36`
- monospaced metric columns
- raw text column truncates with tooltip

### 11.4 Inputs

Use flat controls:

- white background
- gray border
- dark text
- stronger border on focus

## 12. Icon and Label Tone

Labels should be short and direct.

Good:

- Run
- Stop
- Settings
- Devices
- Permissions
- Save and Close

Avoid:

- Start Benchmark Execution
- Configure Current Environment
- Synchronize Device Status
