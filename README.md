# Voice Typing Contest

Voice Typing Contest is a macOS desktop benchmark tool for comparing multiple voice typing apps with the same audio sample set.

It drives each target app with the same workflow, captures the text written into the benchmark input probe, and stores comparable results in local SQLite.

## What it does

- run the same audio samples against multiple voice typing apps
- trigger each app with configured global hotkeys
- route audio to a selected virtual device
- observe first-char and final-text timing
- save status, latency, raw output, and failure reasons to SQLite
- provide a built-in self-test path before connecting real target apps

## Current scope

- platform: macOS
- desktop stack: Electron + Vue
- storage: SQLite
- helper path: Swift helper with fallback wrapper for local development

## Requirements

Before you run real app benchmarks, make sure you have:

- macOS
- Node.js 20+ recommended
- `pnpm`
- Xcode Command Line Tools (`clang` is used in helper build)
- Swift toolchain (`swift build` is used for the native helper)
- a virtual audio device such as BlackHole
- one or more voice typing target apps already installed and configured

Notes:

- The app can still use the built-in self-test when you have not finished real-app setup.
- Accessibility permission is required for controlling real target apps.

## Install

### Option 1: Install from packaged app

If you already have a packaged build:

1. download the `.dmg` or `.zip`
2. drag `Voice Typing Contest.app` into `Applications`
3. open the app once
4. grant Accessibility permission when macOS asks, or enable it later in System Settings
5. configure your output device, target apps, and sample folder inside the app

### Option 2: Run from source

```bash
pnpm install
pnpm helper:build
pnpm dev
```

This starts the Electron app in development mode.

If the Swift helper fails to build, the project installs a fallback helper wrapper so local development can still continue, but real-world behavior is best verified with the native helper available.

## First-time setup

For real benchmark runs, follow this order:

1. install BlackHole or another virtual audio device
2. configure each target app to listen on its global hotkey
3. point each target app's input path to the virtual microphone route you use for testing
4. open Voice Typing Contest and select the output device
5. choose an external sample directory, or start with the built-in self-test
6. grant Accessibility permission
7. run one self-test batch before running real apps

## Development commands

```bash
pnpm dev           # start Electron app in dev mode
pnpm build         # build app bundles into out/
pnpm test          # run tests
pnpm helper:build  # build debug native helper
pnpm helper:release
pnpm dist:mac      # build macOS dmg + zip into release/
```

## Packaging

To create a local macOS distributable:

```bash
pnpm dist:mac
```

Artifacts are written to `release/`.

## Project layout

- `src/renderer` - Vue UI
- `src/main` - Electron main-process orchestration
- `src/shared` - shared types and helpers
- `native/helper` - Swift native helper
- `native/coreaudio-tool` - CoreAudio command-line helper
- `docs/design.md` - product and architecture notes
- `docs/ui-design.md` - UI structure and copy references

## Permissions

The real automation path depends mainly on:

- Accessibility: required for synthetic hotkeys and focus recovery
- Automation: used for some app activation/relaunch flows
- Input Monitoring: optional for diagnostics

## Version

Current version: `0.1.0`
