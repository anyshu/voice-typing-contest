# Voice Typing Contest Design

## 1. Goal

Build a macOS Electron test tool for horizontal evaluation of voice typing apps.

The tool drives multiple target apps with the same audio samples and records:

- raw typed text
- key timestamps in the interaction timeline
- pass/fail status and failure reason
- comparable latency metrics across apps

The initial targets include apps like Xiguashuo and Wispr Flow.

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

### 3.2 Batch flow

For each target app:

1. ensure the app is running and ready
2. bring the test tool window to front
3. focus the built-in input box
4. clear previous text
5. wait `preHotkeyDelayMs`
6. send hotkey down or hotkey tap, depending on app profile
7. wait `hotkeyToAudioDelayMs`
8. play the WAV sample to the configured virtual audio device
9. when playback ends, wait `audioToHotkeyUpDelayMs`
10. send hotkey up when the app uses hold-to-talk mode
11. observe the input box until text stabilizes or timeout fires
12. record result, raw text, timestamps, metrics, and failure reason
13. continue with the next audio sample

When all samples finish for one app, switch to the next app and repeat.

Important:

The test tool remains frontmost during the actual sample run. The target app stays in the background and reacts to synthetic system hotkeys.

## 4. Product Shape

This is not just a media player with a form.

It is a macOS automation tool with three responsibilities:

- drive system-level interaction with target apps
- provide a controlled text sink for typed output
- persist reproducible benchmark results

## 5. High-permission Design

This project is a test tool. Logically it is allowed to hold high system permissions.

That is a design choice, not an accident.

The tool is expected to run in a controlled local test environment, not as a low-privilege consumer app.

### 5.1 Permission stance

- treat macOS automation permissions as part of the product design
- check them before every run
- block execution when required permissions are missing
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

The recommended architecture is:

- Electron renderer for UI
- Electron main process for orchestration
- native macOS helper in Swift for privileged system actions
- SQLite for local result storage

### 6.2 Why a native helper

Pure Electron is weak in two critical areas for this project:

- stable global hotkey simulation on macOS
- precise audio playback to a selected CoreAudio device

A Swift helper provides:

- better control over Quartz event injection
- better control over CoreAudio timing
- a single place to manage permission checks

## 7. Components

### 7.1 Renderer

Responsibilities:

- configuration UI
- permission status UI
- built-in input box for typed output
- live run log
- result list and comparison views

### 7.2 Main process

Responsibilities:

- own the run state machine
- schedule apps and samples
- call the native helper
- collect renderer input events
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
- `hotkey_down`
- `wait_before_audio`
- `audio_playing`
- `wait_before_hotkey_up`
- `hotkey_up`
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

Suggested fields:

- `id`
- `name`
- `bundleId`
- `launchCommand` (optional fallback)
- `hotkeyKey`
- `hotkeyModifiers`
- `hotkeyMode` (`hold` or `tap`)
- `audioInputDeviceName`
- `launchTimeoutMs`
- `preHotkeyDelayMs`
- `hotkeyToAudioDelayMs`
- `audioToHotkeyUpDelayMs`
- `resultTimeoutMs`
- `settleWindowMs`
- `postRunCooldownMs`
- `enabled`
- `notes`

## 10. Audio Sample Model

Suggested fields:

- `id`
- `filePath`
- `displayName`
- `expectedText`
- `language`
- `durationMs`
- `tags`
- `enabled`

`expectedText` is optional, but once present it enables basic accuracy scoring.

## 11. Input Capture Design

The built-in test page should use a stable `textarea` or equivalent input control.

For each sample run:

- clear text before start
- confirm focus before hotkey dispatch
- observe all text changes, not just final content

Renderer should listen to:

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

## 12. Timing and Metrics

### 12.1 Raw events

Record at least:

- `run_started_at`
- `input_focused_at`
- `hotkey_down_at`
- `audio_started_at`
- `audio_ended_at`
- `hotkey_up_at`
- `first_input_at`
- `last_input_at`
- `run_finished_at`

### 12.2 Derived metrics

Calculate:

- `hotkey_to_audio_ms`
- `audio_to_first_char_ms`
- `audio_end_to_first_char_ms`
- `audio_end_to_final_text_ms`
- `total_run_ms`
- `input_event_count`
- `final_text_length`

### 12.3 Time source

Use monotonic time across main process and native helper whenever possible.

Renderer timestamps should be collected with high-resolution time and converted into the shared run timeline using a measured offset.

## 13. Failure Classification

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

## 14. Data Storage

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
- created time

`run_session_id` links each test run back to the batch context so one benchmark pass can be queried, compared, and exported as a group.

### 14.3 `run_events`

Stores detailed timeline events as append-only records:

- `run_id`
- `event_type`
- `ts_ms`
- `payload_json`

This keeps future metrics extensible without repeated schema churn.

## 15. Preflight Checklist

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

## 16. UI Notes

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
| hotkey_down   16:02:01.120                                                       |
| audio_start   16:02:01.260                                                       |
| audio_end     16:02:03.840                                                       |
| first_input   16:02:04.110                                                       |
| last_input    16:02:04.680                                                       |
|----------------------------------------------------------------------------------|
| status: success   first_char: 850 ms   final: 1440 ms   text_len: 18             |
+----------------------------------------------------------------------------------+
```

## 17. Delivery Phases

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

## 18. Open Questions

- whether each target app reacts correctly to synthetic hotkeys under Accessibility-only injection
- whether some target apps require relaunch after virtual device changes
- whether tap-mode apps need a different end-of-recording strategy
- whether the helper should be embedded as a bundled executable or linked more tightly into the app runtime
