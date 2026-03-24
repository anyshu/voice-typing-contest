# Voice Typing Contest Design

Current spec baseline: `v0.1.2`

## 1. Goal

Build a macOS Electron benchmark tool for horizontal evaluation of voice typing apps, with the renderer implemented in Vue.

The tool drives multiple target apps with the same audio samples and records:

- raw typed text
- key timestamps in the interaction timeline
- pass/fail status and failure reason
- comparable latency metrics across apps

The initial targets include apps like Xiguashuo, Wispr Flow, and Typeless.

Assumption for v1:

Target voice typing apps listen to system-level hotkeys globally. They do not need to own keyboard focus during the test run.

## 2. Non-goals

The first version does not try to:

- auto-configure target app settings
- bypass macOS security mechanisms
- perform screen recording or UI image analysis
- distribute jobs across multiple machines
- replace the target app's own ASR pipeline

Target apps are expected to be pre-installed and pre-configured by the tester.

## 3. Test Workflow

### 3.1 Pre-setup

Before running tests, the tester prepares:

1. a set of WAV audio samples
2. a virtual audio device such as BlackHole
3. each target voice typing app
4. each target app's hotkey
5. each target app's input device set to the virtual microphone path

Hotkey constraint for automated runs in the current implementation:

- the UI supports recording normal modifier chords and also supports `Fn`
- standalone `Fn` is exposed by a dedicated UI action because Electron cannot capture it reliably from raw key events
- `Fn + other key` is supported in the current helper path
- system-reserved shortcuts may still be intercepted by macOS first, so the tester should still prefer non-reserved chords when possible
- the built-in Wispr Flow and Typeless presets default to standalone `Fn` with `hold_release`

### 3.2 Batch flow

For each target app:

1. launch the app once
2. wait global `appLaunchDelayMs`
3. bring the benchmark window back to front
4. focus the built-in input box
5. wait global `focusInputDelayMs`
6. trigger according to the app profile:
   - `hold_release`: press and keep holding the configured hotkey
   - `press_start_press_stop`: send one full press-release cycle as start
7. wait app-level `hotkeyToAudioDelayMs`
8. play the WAV sample to the configured output device
9. when playback ends, wait app-level `audioToTriggerStopDelayMs`
10. complete the trigger according to mode:
   - `hold_release`: release the same held hotkey
   - `press_start_press_stop`: send the same hotkey again as a second full press-release cycle
11. observe the input box until text stabilizes or global timeout fires
12. record result, raw text, timestamps, metrics, and failure reason
13. wait global `betweenSamplesDelayMs`
14. continue with the next audio sample
15. after the last sample for the app, wait global `closeAppDelayMs`
16. close the app

When all samples finish for one app, switch to the next app and repeat the same app-batch cycle.

Important:

The test tool remains frontmost during the actual sample run. The target app stays in the background and reacts to synthetic system hotkeys.

## 4. Product Shape

This is not just a media player with a form.

It is a macOS automation tool with three responsibilities:

- drive system-level interaction with target apps
- provide a controlled text sink for typed output
- persist reproducible benchmark results

## 5. High-permission Design

This project is a local test tool. It expects high-permission behavior when needed, but the current implementation also keeps a degraded fallback path so the main workflow remains usable in local development.

### 5.1 Permission stance

- treat macOS automation permissions as part of the product design
- check them before every run
- block real-app automation when required permissions are missing
- keep self-test runnable even when a real app is skipped for permission reasons
- record the permission snapshot in run metadata

In the main benchmark flow, the tool only needs to emit system-level keyboard events and play audio. It does not rely on the target app owning focus.

### 5.2 Required permissions

#### Accessibility

Used for:

- sending hotkey down/up events
- assisting with focus recovery
- recovering test input focus when needed

Behavior when missing:

- test run is blocked before start

#### Automation

Used when the tool needs to:

- activate or relaunch a target app through Apple Events
- run optional maintenance flows outside the core benchmark path

Behavior when missing:

- core benchmark flow still works if the app is already running
- optional management actions are unavailable

### 5.3 Optional permissions

#### Input Monitoring

Used only for diagnostics in v1, such as:

- verifying hotkey path issues
- collecting low-level keyboard troubleshooting signals

Behavior when missing:

- benchmark flow still works
- advanced diagnostics are unavailable

### 5.4 Not required in v1

- Microphone
- Screen Recording

These are intentionally excluded from the initial permission model unless later features need them.

### 5.5 Packaging stance

The tool should be designed as:

- non-App-Sandbox
- Developer ID signed
- notarized for distribution when needed

Reason:

This class of automation tool depends on permissions and system integrations that do not fit well inside a sandboxed Mac App Store app model.

## 6. Architecture

### 6.1 Overview

The implemented architecture is:

- Electron renderer implemented with Vue for UI
- Electron main process for orchestration
- native macOS helper in Swift for privileged system actions
- fallback helper with the same command contract for local development environments where Swift helper build or runtime is not available
- SQLite for local result storage, implemented through `better-sqlite3` in the Electron main process to avoid Node's experimental `node:sqlite` runtime warning; plain Node test runs may still use `node:sqlite` for ABI compatibility

### 6.2 Why a native helper

Pure Electron is weak in two critical areas for this project:

- stable global hotkey simulation on macOS
- precise audio playback to a selected CoreAudio device

A Swift helper provides the intended long-term path, while the current product also ships a fallback helper path so the app remains runnable during development:

- better control over Quartz event injection
- better control over CoreAudio timing
- a single place to manage permission checks

## 7. Components

### 7.1 Vue renderer

Responsibilities:

- page navigation for `主控台`, `运行前检查`, `样本管理`, `App管理`, `测试历史`, `设置`, `怎么开始`, `版本说明`, with `App管理` moved into the upper run-focused group directly below `样本管理`
- configuration UI
- target app CRUD now lives in dedicated `App管理`, using compact per-app cards with a single-row header for app name, app kind, enable state, toggle, and delete action
- permission status UI
- built-in input box for typed output
- live run timeline
- latest-session summary on `主控台`
- dedicated `测试历史` page for browsing persisted sessions, exporting one batch at a time, importing compatible result CSV files as synthetic history sessions, retrying one failed app/sample pair directly from history, and merging retry outcomes back onto the original row with a retry counter; CSV export should keep the original `run_id` while exposing the latest attempt as `latest_run_id`, and sample-path hover/focus should reveal the captured ASR text without widening the table

Current Vue structure is still centered in `App.vue`, with page sections inside the shell. It can be decomposed later, but the current behavior is already organized around those page roles.

### 7.2 Main process

Responsibilities:

- own the run state machine
- schedule apps and samples
- call the native helper
- collect Vue renderer input events
- persist all run data

Main modules:

- `PermissionManager`
- `RunController`
- `TargetAppManager`
- `SampleManager`
- `ResultStore`
- `EventBus`

### 7.3 Native helper

Responsibilities:

- check macOS permission state
- send hotkey events
- help recover app and window state when needed
- enumerate and verify audio devices
- play WAV audio to a specific device

Packaging note:

- release builds must bundle both `vtc-helper` and `vtc-audioctl` from the release helper output path so `dist:mac` works from a clean checkout without depending on debug helper artifacts

Native modules:

- `PermissionProbe`
- `KeySender`
- `AppRuntimeHelper`
- `DeviceProbe`
- `AudioPlayer`

## 8. Run State Machine

The run flow should be implemented as an explicit state machine, not as ad-hoc chained timers.

Suggested states:

- `idle`
- `preflight`
- `focus_input`
- `wait_before_hotkey`
- `trigger_start`
- `wait_before_audio`
- `audio_playing`
- `wait_before_trigger_stop`
- `trigger_stop`
- `observing_text`
- `completed`
- `failed`
- `cancelled`

Benefits:

- easier error reporting
- safer cancellation
- clearer logging
- easier future support for retry and warmup policies

## 9. App Profile Model

Each target app should be represented by a profile instead of hardcoded logic.

App profile fields currently stored:

- `id`
- `name`
- `appFileName`
- `launchCommand` (optional fallback)
- `hotkeyChord`
- `hotkeyTriggerMode` (`hold_release` or `press_start_press_stop`)
- `audioInputDeviceName`
- `hotkeyToAudioDelayMs`
- `audioToTriggerStopDelayMs`
- `settleWindowMs`
- `enabled`
- `notes`

`appFileName` is the primary way to identify an installed target app in the current version. The tool locates apps by installed `.app` file name, not by bundle id.

`hotkeyChord` stores the exact shortcut the tester enters from a dedicated hotkey capture control. The UI should not split it into a main key field plus modifier chips.

Hotkey automation rule in the current implementation:

- supported automation chords include combinations composed from `Cmd`, `Ctrl`, `Option`, `Shift`, and a regular key
- `Fn` is also supported, including standalone `Fn`, but standalone `Fn` is set through a dedicated UI action instead of raw keyboard capture
- `hold_release` means "press and keep held until the audio finishes, then release", not "send a start trigger and later send a stop trigger"
- for `hold_release`, helper dispatch should keep the entire hold / audio / release sequence inside one helper session so modifier-only keys such as `Fn` are simulated as a continuous hold instead of split fire-and-forget events
- `Ctrl + Space` and similar reserved shortcuts are still risky in practice when macOS intercepts them first
- therefore the tester should still prefer a non-reserved chord when possible

## 10. Audio Sample Model

Suggested fields:

- `id`
- `filePath`
- `relativePath`
- `displayName`
- `expectedText`
- `language`
- `durationMs`
- `tags`
- `enabled`

`relativePath` should preserve subfolder structure under the sample root so the UI can display nested test sets clearly.

`expectedText` is optional, but once present it enables basic accuracy scoring.

`enabled` decides whether the sample joins later benchmark batches. The sample-management page should let the tester toggle each sample individually and show enabled / disabled / total counts at a glance.

## 11. UI Localization

The current codebase is Chinese-first. English support is not yet consistently implemented across all renderer copy, so localization should be treated as partial rather than complete.

Current direction:

- keep run data language-neutral where possible
- keep page and setting labels Chinese-first
- leave a later pass to unify renderer strings behind a dedicated i18n layer

## 12. Input Capture Design

The built-in test page should use a stable `textarea` or equivalent input control.

For each sample run:

- clear text before start
- confirm focus before hotkey dispatch
- observe all text changes, not just final content

Renderer listens to:

- `focus`
- `blur`
- `beforeinput`
- `input`
- `compositionstart`
- `compositionend`

Reason:

Different voice typing apps may:

- stream text incrementally
- insert text in chunks
- revise intermediate text before finalizing

## 13. Timing and Metrics

### 12.1 Raw events

Record at least:

- `run_started_at`
- `input_focused_at`
- `trigger_start_at`
- `audio_started_at`
- `audio_ended_at`
- `trigger_stop_at`
- `first_input_at`
- `last_input_at`
- `run_finished_at`

### 13.2 Derived metrics

Calculate in the current implementation:

- `hotkey_to_audio_ms`
- `trigger_stop_to_first_char_ms`
- `trigger_stop_to_final_text_ms`
- `total_run_ms`
- `input_event_count`
- `final_text_length`

Important interpretation rule:

- `trigger_stop_to_first_char_ms` may be negative for apps that stream text before the stop trigger
- the UI should present this as "提前 xxx ms" instead of hiding it

### 12.3 Time source

Use monotonic time across the main process and helper whenever possible.

In the current implementation, renderer observation events are normalized to the main-process clock before latency math is derived, to avoid cross-process timer drift.

## 14. Failure Classification

Do not collapse all failures into ASR failure.

Suggested failure categories:

- `permission_denied_accessibility`
- `permission_denied_automation`
- `target_app_not_installed`
- `target_app_not_ready`
- `target_app_launch_timeout`
- `input_focus_failed`
- `device_not_found`
- `audio_play_failed`
- `hotkey_dispatch_failed`
- `no_text_observed`
- `timeout_waiting_result`
- `empty_result`

This separation is necessary for trustworthy benchmark analysis.

## 15. Data Storage

Use SQLite as the local database.

Suggested tables:

- `target_apps`
- `audio_samples`
- `run_sessions`
- `test_runs`
- `run_events`

### 14.1 `run_sessions`

Stores one batch run context, including:

- start time
- selected target apps
- selected sample set
- permission snapshot
- device snapshot
- app config snapshot

### 14.2 `test_runs`

Stores one app + one sample execution result, including:

- `run_session_id`
- app id
- sample id
- status
- raw text
- normalized text
- expected text
- latency metrics
- failure reason
- timeline snapshot
- created time

`run_session_id` links each test run back to the batch context so one benchmark pass can be queried, compared, and exported as a group.

Each test run record should persist the full timeline for that run so later queries, history views, and the main console can all reuse the same source data instead of rebuilding a separate display-only timeline model.

### 14.3 `run_events`

Stores detailed timeline events as append-only records:

- `run_id`
- `event_type`
- `ts_ms`
- `payload_json`

This keeps future metrics extensible without repeated schema churn.

`run_events` is still useful as the append-only event log, but the query path should treat the per-run timeline snapshot on `test_runs` as the canonical UI-facing data bundle for one test record.

## 16. Preflight Checklist

Before a run starts, the tool must verify:

- Accessibility permission
- target app availability
- virtual audio device availability
- sample file existence
- database writability
- input box focus readiness

Optional checks:

- Automation permission for app launch or relaunch helpers

If any required check fails, the run does not start.

## 17. UI Notes

Initial UI can stay simple and operational.

Suggested main screen:

```text
+----------------------------------------------------------------------------------+
| App: Wispr Flow          Sample Set: zh-basic-20          Status: Running  12/60 |
|----------------------------------------------------------------------------------|
| Permissions: Accessibility=OK  Automation=OK  InputMonitoring=Optional-Missing   |
|----------------------------------------------------------------------------------|
| Current sample: s012_hello.wav                                                   |
| Input box:                                                                       |
| [ hello this is the live typed text from the target app                         ] |
|                                                                                  |
| trigger_start 16:02:01.120                                                       |
| audio_start   16:02:01.260                                                       |
| audio_end     16:02:03.840                                                       |
| first_input   16:02:04.110                                                       |
| last_input    16:02:04.680                                                       |
|----------------------------------------------------------------------------------|
| status: success   first_char: 850 ms   final: 1440 ms   text_len: 18             |
+----------------------------------------------------------------------------------+
```

The main console timeline should render from the same per-run timeline data saved with each test record, with the UI responsible only for selecting which events to show and formatting them for readability.

The current renderer uses three timeline sources with clear roles:

- pre-run prompt events exist only for the current in-memory start flow
- live `run:event` records drive the active session while it is running
- persisted `test_runs.timeline_json` is the source of truth for history views and for restoring the main console after a session finishes

`主控台` should focus on "what is happening now / what just finished", while `测试历史` owns session browsing, expansion, and batch export actions.

## 18. Delivery Phases

### Phase 1

Prove the chain works end-to-end:

- send hotkey
- play sample into virtual device
- receive typed text in the test input box

### Phase 2

Support one app + one sample with:

- full timeline capture
- database persistence
- basic failure reporting

### Phase 3

Add batch execution:

- multiple samples
- multiple target apps
- result list and comparison UI

### Phase 4

Add higher-level analysis:

- normalization
- accuracy scoring
- percentile latency summaries
- richer failure diagnostics

## 19. Open Questions

- whether each target app reacts correctly to synthetic hotkeys under Accessibility-only injection
- whether some target apps require relaunch after virtual device changes
- whether `press_start_press_stop` apps need per-app timing adjustments for the stop trigger
- whether the helper should be embedded as a bundled executable or linked more tightly into the app runtime
