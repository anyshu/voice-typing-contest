# Voice Typing Contest UI Dev Spec

## 1. Design Tokens

### 1.1 Color tokens

```css
:root {
  --vtc-bg-app: #f3f4f6;
  --vtc-bg-panel: #fcfcfd;
  --vtc-bg-elevated: #ffffff;
  --vtc-bg-hover: #f5f5f5;
  --vtc-bg-active: #e5e7eb;

  --vtc-border-soft: #e5e7eb;
  --vtc-border-strong: #d1d5db;
  --vtc-border-focus: #6b7280;

  --vtc-text-primary: #111827;
  --vtc-text-secondary: #4b5563;
  --vtc-text-tertiary: #6b7280;
  --vtc-text-disabled: #9ca3af;
  --vtc-text-inverse: #ffffff;

  --vtc-accent-primary: #1f2937;
  --vtc-accent-secondary: #374151;
  --vtc-accent-muted: #9ca3af;

  --vtc-success-text: #166534;
  --vtc-success-bg: #dcfce7;
  --vtc-warning-text: #92400e;
  --vtc-warning-bg: #fef3c7;
  --vtc-danger-text: #991b1b;
  --vtc-danger-bg: #fee2e2;
  --vtc-info-text: #1e3a8a;
  --vtc-info-bg: #dbeafe;

  --vtc-overlay: rgba(17, 24, 39, 0.24);
  --vtc-shadow-float: 0 8px 24px rgba(17, 24, 39, 0.06);
}
```

### 1.2 Typography tokens

```css
:root {
  --vtc-font-ui: "Noto Sans SC", "PingFang SC", sans-serif;
  --vtc-font-sans: "IBM Plex Sans", "Noto Sans SC", sans-serif;
  --vtc-font-mono: "IBM Plex Mono", "SFMono-Regular", monospace;

  --vtc-text-hero-size: 28px;
  --vtc-text-hero-weight: 600;

  --vtc-text-title-size: 18px;
  --vtc-text-title-weight: 600;

  --vtc-text-card-size: 15px;
  --vtc-text-card-weight: 600;

  --vtc-text-body-size: 13px;
  --vtc-text-body-weight: 400;

  --vtc-text-meta-size: 12px;
  --vtc-text-meta-weight: 400;

  --vtc-text-metric-size: 24px;
  --vtc-text-metric-weight: 600;

  --vtc-text-chip-size: 11px;
  --vtc-text-chip-weight: 500;

  --vtc-line-height-tight: 1.2;
  --vtc-line-height-body: 1.5;
}
```

### 1.3 Space and size tokens

```css
:root {
  --vtc-radius-sm: 8px;
  --vtc-radius-md: 12px;
  --vtc-radius-lg: 16px;
  --vtc-radius-pill: 999px;

  --vtc-space-1: 4px;
  --vtc-space-2: 8px;
  --vtc-space-3: 12px;
  --vtc-space-4: 16px;
  --vtc-space-5: 20px;
  --vtc-space-6: 24px;
  --vtc-space-8: 32px;

  --vtc-sidebar-width: 208px;
  --vtc-topbar-height: 64px;
  --vtc-button-height: 36px;
  --vtc-input-height: 36px;
  --vtc-row-height: 40px;
  --vtc-chip-height: 24px;
  --vtc-card-padding: 16px;
  --vtc-modal-width: 980px;
  --vtc-modal-height: 720px;
  --vtc-drawer-width: 420px;
}
```

### 1.4 Motion tokens

```css
:root {
  --vtc-motion-fast: 120ms ease;
  --vtc-motion-base: 160ms ease;
  --vtc-motion-slow: 220ms ease;
}
```

## 2. Hugeicons mapping

Use outline icons by default.

| Scene | Hugeicon |
|---|---|
| Main nav | `Dashboard Square 01` |
| Intro nav | `Info Circle` |
| About nav | `Information Square` |
| Settings | `Settings 02` |
| Run | `Play Circle` |
| Stop | `Stop Circle` |
| Target app | `Window 01` |
| Audio sample | `Audio Wave 02` |
| Permission | `Shield 01` |
| Database | `Database` |
| Folder picker | `Folder Open` |
| Refresh | `Refresh` |
| Add | `Plus Sign` |
| Delete | `Delete 02` |
| Result detail | `Chart Line Data 01` |
| Close modal | `Cancel 01` |

## 3. Component inventory

### 3.1 Shell components

- `AppShell`
- `Sidebar`
- `SidebarNavItem`
- `TopBar`
- `LocaleToggle`
- `PageHeader`
- `PageContent`

### 3.2 Layout components

- `PanelCard`
- `SectionHeader`
- `SplitPane`
- `EmptyState`
- `StatStrip`
- `StatusChip`
- `MetricBlock`

### 3.3 Input components

- `Button`
- `IconButton`
- `TextInput`
- `NumberInput`
- `Textarea`
- `HotkeyCaptureInput`
- `Checkbox`
- `RadioGroup`
- `Select`
- `Switch`
- `FormRow`
- `FormSection`

### 3.4 Data components

- `AppList`
- `AppListItem`
- `SampleList`
- `SampleListItem`
- `TimelineList`
- `TimelineEventRow`
- `ResultTable`
- `ResultTableRow`
- `PermissionStatusRow`
- `DeviceList`

### 3.5 Overlay components

- `SettingsModal`
- `SettingsTabRail`
- `SettingsFooter`
- `RunDetailDrawer`
- `ConfirmDialog`

### 3.6 State helpers

- `LoadingBlock`
- `InlineHint`
- `ErrorBanner`
- `Toast`

### 3.7 Vue renderer structure

The Electron renderer should follow a Vue-first structure.

Suggested folders:

- `src/renderer/App.vue`
- `src/renderer/pages/`
- `src/renderer/components/`
- `src/renderer/composables/`
- `src/renderer/i18n/`

## 4. Global shell DOM sketch

```text
body
----- div.app-shell
      |----- aside.sidebar
      |      |----- div.sidebar__brand
      |      |      |----- div.brand-mark
      |      |      +----- div.brand-text
      |      |
      |      |----- nav.sidebar__nav
      |      |      |----- button.nav-item[data-page="main"]
      |      |      +----- button.nav-item[data-page="intro"]
      |      |
      |      +----- div.sidebar__footer
      |             |----- button.nav-item[data-page="about"]
      |             +----- button.nav-item[data-action="settings"]
      |
      +----- div.app-shell__main
             |----- header.top-bar
             |      |----- div.top-bar__title
             |      +----- div.top-bar__actions
             |             |----- button.icon-button[data-action="toggle-theme"]
             |             +----- button.icon-button[data-action="toggle-locale"]
             |
             +----- main.page-host
                    +----- section.page-root[data-page]
```

## 5. Main page wireframe

### 5.1 Flat sketch

```text
+--------------------------------------------------------------------------------------------------+
| Main                                                     [Run] [Stop] [Theme] [Language] |
|--------------------------------------------------------------------------------------------------|
| [Apps: 3] [Samples: 24] [Permission: Ready] [Device: BlackHole 2ch] [DB: OK]                   |
|--------------------------------------------------------------------------------------------------|
| +-----------------------------------+ +----------------------------------+ +-------------------+ |
| | Target Apps                       | | Live Input                       | | Timeline          | |
| | > Xiguashuo        hold->release        Ready   | | +------------------------------+ | | 16:02:01 trigger start | |
| |   Wispr Flow       press-start-stop     Ready   | | |                              | | | 16:02:01 play          | |
| |   App C            hold->release        Blocked | | | typed text appears here      | | | 16:02:03 trigger stop  | |
| +-----------------------------------+ | |                              | | | 16:02:04 first   | |
| | Audio Samples                      | | +------------------------------+ | | 16:02:04 last    | |
| | zh-basic-01.wav        2.4s        | | Status: success                | +-------------------+ |
| | zh-basic-02.wav        3.1s        | | First char: 850 ms             |                       |
| | zh-basic-03.wav        1.8s        | | Final: 1440 ms                 |                       |
| +-----------------------------------+ | Text len: 18                    |                       |
| | Batch Progress                     | +----------------------------------+                       |
| | [##########------] 12 / 24         |                                                        |
| +-----------------------------------+                                                        |
|--------------------------------------------------------------------------------------------------|
| Result Table                                                                                     |
| App          Sample            Status    First Char    Final Latency    Raw Text...              |
+--------------------------------------------------------------------------------------------------+
```

### 5.2 DOM structure

```text
section.page-root.page-main
----- header.page-header
      |----- div.page-header__title
      +----- div.page-header__actions
             |----- button.btn.btn--primary[data-action="run"]
             |----- button.btn.btn--secondary[data-action="stop"]
             |----- button.icon-button[data-action="toggle-theme"]
             +----- button.icon-button[data-action="toggle-locale"]
|
----- section.summary-strip
      |----- div.status-chip
      |----- div.status-chip
      |----- div.status-chip
      |----- div.status-chip
      +----- div.status-chip
|
----- section.main-grid
      |----- div.main-grid__left
      |      |----- article.panel-card.panel-card--apps
      |      |      |----- div.section-header
      |      |      +----- ul.app-list
      |      |
      |      |----- article.panel-card.panel-card--samples
      |      |      |----- div.section-header
      |      |      +----- ul.sample-list
      |      |
      |      +----- article.panel-card.panel-card--progress
      |             |----- div.section-header
      |             +----- div.progress-block
      |
      |----- div.main-grid__center
      |      |----- article.panel-card.panel-card--live-input
      |      |      |----- div.section-header
      |      |      |----- div.live-input-box
      |      |      |      +----- textarea.live-input-box__textarea
      |      |      +----- div.live-result-summary
      |      |             |----- div.metric-inline
      |      |             |----- div.metric-inline
      |      |             |----- div.metric-inline
      |      |             +----- div.metric-inline
      |      |
      |      +----- article.panel-card.panel-card--result-highlight
      |             +----- div.result-highlight__content
      |
      +----- div.main-grid__right
             +----- article.panel-card.panel-card--timeline
                    |----- div.section-header
                    +----- ul.timeline-list
                           +----- li.timeline-row
|
+----- section.result-table-section
       |----- div.section-header
       +----- div.result-table-wrap
              +----- table.result-table
```

### 5.3 Main page layout notes

- `main-grid` uses three columns: `320 / minmax(420, 1fr) / 260`
- result table sits below the grid and stretches full width
- center column should visually dominate
- left and right columns use stacked cards with equal gaps

## 6. Settings modal wireframe

### 6.1 Flat sketch

```text
+----------------------------------------------------------------------------------+
| Settings                                                          [Close]         |
|----------------------------------------------------------------------------------|
| +----------------------+ +------------------------------------------------------+ |
| | General              | | Section title                                       | |
| | Target Apps          | | --------------------------------------------------- | |
| | Audio Samples        | | form rows / editor / list                           | |
| | Timing               | |                                                     | |
| | Devices              | |                                                     | |
| | Permissions          | |                                                     | |
| | Database             | |                                                     | |
| | Advanced             | |                                                     | |
| +----------------------+ +------------------------------------------------------+ |
|                                                                [Cancel] [Apply]  |
|                                                       [Save and Close]            |
+----------------------------------------------------------------------------------+
```

### 6.2 DOM structure

```text
div.overlay
----- div.settings-modal[role="dialog"]
      |----- header.settings-modal__header
      |      |----- h2
      |      +----- button.icon-button[data-action="close"]
      |
      |----- div.settings-modal__body
      |      |----- aside.settings-tab-rail
      |      |      |----- button.settings-tab[data-tab="general"]
      |      |      |----- button.settings-tab[data-tab="target-apps"]
      |      |      |----- button.settings-tab[data-tab="audio-samples"]
      |      |      |----- button.settings-tab[data-tab="timing"]
      |      |      |----- button.settings-tab[data-tab="devices"]
      |      |      |----- button.settings-tab[data-tab="permissions"]
      |      |      |----- button.settings-tab[data-tab="database"]
      |      |      +----- button.settings-tab[data-tab="advanced"]
      |      |
      |      +----- section.settings-modal__content
      |             +----- div.settings-panel[data-tab]
      |
      +----- footer.settings-modal__footer
             |----- button.btn.btn--ghost
             |----- button.btn.btn--secondary
             +----- button.btn.btn--primary
```

## 7. Settings tab sketches

### 7.1 Target apps tab

```text
+----------------------------------------------------------------------------------+
| Target Apps                                                                      |
|----------------------------------------------------------------------------------|
| +-------------------------------+ +--------------------------------------------+ |
| | > Xiguashuo                   | | Name                [___________________] | |
| |   Wispr Flow                  | | Enabled             [on ]                 | |
| |   App C                       | | App file name       [Xiguashuo.app____]  | |
| | [+ Add App]                   | | Launch command      [___________________] | |
| |                               | | Audio input device  [BlackHole 2ch_____] | |
| |                               | | Hotkey capture      [ press any combo ]  | |
| +-------------------------------+ | Trigger mode (o) hold->release           | |
|                                   |              ( ) press start->press stop | |
|                                   | Pre delay            [120 ] ms            | |
|                                   | Key -> audio delay   [180 ] ms            | |
|                                   | Audio -> stop trigger [60 ] ms           | |
|                                   | Result timeout       [5000] ms            | |
|                                   | Settle window        [600 ] ms            | |
|                                   | Notes                [_______________]    | |
|                                   |                 [Disable] [Save] [Delete] | |
+----------------------------------------------------------------------------------+
```

DOM:

```text
div.settings-panel[data-tab="target-apps"]
----- div.panel-header
----- div.master-detail
      |----- aside.master-detail__list
      |      |----- ul.app-editor-list
      |      +----- button.btn.btn--secondary[data-action="add-app"]
      |
      +----- section.master-detail__editor
             +----- form.target-app-form
                    |----- div.form-grid
                    |----- div.hotkey-capture-input
                    |----- div.radio-group
                    +----- div.form-actions
```

### 7.2 Audio samples tab

```text
+----------------------------------------------------------------------------------+
| Audio Samples                                                                    |
|----------------------------------------------------------------------------------|
| Folder      [/Users/.../samples_____________________________] [Choose] [Rescan]  |
|----------------------------------------------------------------------------------|
| Sample list                                                                      |
| zh-basic-01.wav   2.4s   zh   expected text ready                     [Disable]  |
| zh-basic-02.wav   3.1s   zh   no expected text                        [Edit]     |
| zh-basic-03.wav   1.8s   en   expected text ready                     [Edit]     |
+----------------------------------------------------------------------------------+
```

DOM:

```text
div.settings-panel[data-tab="audio-samples"]
----- div.form-row
----- div.inline-actions
----- article.panel-card
      +----- table.sample-config-table
```

### 7.3 Timing tab

```text
+----------------------------------------------------------------------------------+
| Timing                                                                           |
|----------------------------------------------------------------------------------|
| Launch timeout          [5000] ms                                                |
| Default result timeout  [5000] ms                                                |
| Settle window           [ 600] ms                                                |
| Cooldown between runs   [ 300] ms                                                |
+----------------------------------------------------------------------------------+
```

DOM:

```text
div.settings-panel[data-tab="timing"]
----- form.settings-form
      |----- div.form-row
      |----- div.form-row
      |----- div.form-row
      +----- div.form-row
```

### 7.4 Devices tab

```text
+----------------------------------------------------------------------------------+
| Devices                                                                          |
|----------------------------------------------------------------------------------|
| Selected virtual output   [BlackHole 2ch_________________________] [Recheck]     |
|----------------------------------------------------------------------------------|
| Available devices                                                                  |
| BlackHole 2ch                available                                            |
| MacBook Pro Speakers         available                                            |
| External USB Audio           unavailable                                          |
+----------------------------------------------------------------------------------+
```

DOM:

```text
div.settings-panel[data-tab="devices"]
----- div.form-row
----- article.panel-card
      +----- ul.device-list
```

### 7.5 Permissions tab

```text
+----------------------------------------------------------------------------------+
| Permissions                                                                      |
|----------------------------------------------------------------------------------|
| Accessibility      Required   Granted / Missing         [Check again]            |
| Automation         Optional   Granted / Missing         [Open settings]          |
| Input Monitoring   Optional   Granted / Missing         [Open settings]          |
|----------------------------------------------------------------------------------|
| Core benchmark path only requires Accessibility.                                 |
+----------------------------------------------------------------------------------+
```

DOM:

```text
div.settings-panel[data-tab="permissions"]
----- article.panel-card
      |----- div.permission-status-row
      |----- div.permission-status-row
      |----- div.permission-status-row
      +----- div.inline-hint
```

### 7.6 Database tab

```text
+----------------------------------------------------------------------------------+
| Database                                                                         |
|----------------------------------------------------------------------------------|
| DB path            [/Users/.../voice-typing-contest.sqlite_____] [Choose]        |
| Log folder         [/Users/.../logs____________________________] [Open]          |
| Export result CSV                                                  [Export]      |
+----------------------------------------------------------------------------------+
```

DOM:

```text
div.settings-panel[data-tab="database"]
----- div.form-row
----- div.form-row
----- div.form-row
```

### 7.7 Advanced tab

```text
+----------------------------------------------------------------------------------+
| Advanced                                                                         |
|----------------------------------------------------------------------------------|
| [ ] Store raw event payloads                                                     |
| [ ] Enable verbose log                                                           |
| Retry failed sample count   [0]                                                  |
| Helper path override        [____________________________________] [Choose]      |
+----------------------------------------------------------------------------------+
```

DOM:

```text
div.settings-panel[data-tab="advanced"]
----- form.settings-form
      |----- label.checkbox-row
      |----- label.checkbox-row
      |----- div.form-row
      +----- div.form-row
```

## 8. Intro page wireframe

### 8.1 Flat sketch

```text
+----------------------------------------------------------------------------------+
| Intro                                                                            |
|----------------------------------------------------------------------------------|
| Voice Typing Contest                                                             |
| A local benchmark tool for comparing voice typing apps on macOS.                |
|                                                                                  |
| +----------------------+ +----------------------+ +----------------------------+  |
| | Prepare              | | Configure            | | Run                        |  |
| | install BlackHole    | | add apps and samples | | start benchmark            |  |
| +----------------------+ +----------------------+ +----------------------------+  |
|                                                                                  |
| Checklist                                                                         |
| [ ] Accessibility granted                                                        |
| [ ] Virtual device installed                                                     |
| [ ] Target apps configured                                                       |
| [ ] Sample folder ready                                                          |
|                                                                                  |
|                                                                    [Go Main]     |
+----------------------------------------------------------------------------------+
```

### 8.2 DOM structure

```text
section.page-root.page-intro
----- header.page-header
----- article.hero-card
      |----- h1
      |----- p
      +----- div.intro-step-grid
             |----- article.step-card
             |----- article.step-card
             +----- article.step-card
|
----- article.panel-card.intro-checklist
      |----- div.section-header
      +----- ul.checklist
             |----- li.checklist-row
             |----- li.checklist-row
             |----- li.checklist-row
             +----- li.checklist-row
|
+----- div.page-actions
       |----- button.btn.btn--secondary
       +----- button.btn.btn--primary
```

## 9. About page wireframe

### 9.1 Flat sketch

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
| - Runtime: Electron + Vue renderer + native helper                               |
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

### 9.2 DOM structure

```text
section.page-root.page-about
----- header.page-header
----- article.about-card
      |----- h1
      |----- div.version-row
      |----- p
      |----- div.info-block
      |      +----- ul.meta-list
      |----- div.path-block
      |      +----- ul.path-list
      +----- div.page-actions
```

## 10. Run detail drawer wireframe

### 10.1 Flat sketch

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

### 10.2 DOM structure

```text
aside.run-detail-drawer
----- header.run-detail-drawer__header
      |----- h2
      +----- button.icon-button[data-action="close"]
|
----- div.run-detail-drawer__meta
|
----- article.panel-card
      +----- ul.timeline-list
|
----- article.panel-card
      +----- pre.raw-text-block
|
----- article.panel-card
      +----- div.metric-grid
|
+----- article.panel-card
       +----- div.failure-reason
```

## 11. CSS block naming suggestion

Use light BEM style.

Examples:

- `app-shell`
- `sidebar__nav`
- `page-header__actions`
- `panel-card--timeline`
- `result-table__cell--metric`
- `settings-modal__footer`
- `run-detail-drawer__meta`

## 12. Implementation order

Recommended build order:

1. shell
2. main page
3. settings modal
4. intro page
5. about page
6. run detail drawer
7. polish states and empty states
