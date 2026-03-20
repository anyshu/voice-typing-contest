# Voice Typing Contest Flow

## Main Flow

```text
+----------------------+
| Start                |
+----------------------+
          |
          |
          v
+----------------------+
| Load config          |
| - target apps        |
| - audio samples      |
| - timing params      |
| - ui locale          |
+----------------------+
          |
          |
          v
+----------------------+
| Preflight            |
| - Accessibility      |
| - audio device       |
| - sample files       |
| - DB writable        |
| - input box ready    |
+----------------------+
          |
          |
     +----+----+
     |         |
     | pass    | fail
     |         |
     v         v
+----------------------+      +----------------------+
| Select next app      |----->| Block run            |
| from enabled list    |      | Record reason        |
+----------------------+      +----------------------+
          |
          |
     +----+----+
     |         |
     | yes     | no more app
     |         |
     v         v
+----------------------+      +----------------------+
| Ensure app ready     |----->| Finish batch         |
| locate by .app name  |      | Generate summary     |
+----------------------+      +----------------------+
          |
          |
          v
+----------------------+
| Select next sample   |
+----------------------+
          |
          |
     +----+----+
     |         |
     | yes     | no more sample
     |         |
     v         v
+----------------------+      +----------------------+
| Bring test tool      |----->| Select next app      |
| window to front      |      +----------------------+
+----------------------+
          |
          |
          v
+----------------------+
| Focus input box      |
| Clear previous text  |
+----------------------+
          |
          |
          v
+----------------------+
| Wait preHotkeyDelay  |
+----------------------+
          |
          |
          v
+----------------------+
| Send trigger start   |
| by captured hotkey   |
+----------------------+
          |
          |
          v
+----------------------+
| Wait                 |
| hotkeyToAudioDelay   |
+----------------------+
          |
          |
          v
+----------------------+
| Play WAV to virtual  |
| audio device         |
+----------------------+
          |
          |
          v
+----------------------+
| Playback finished    |
+----------------------+
          |
          |
          v
+----------------------+
| Wait                 |
| audioToTriggerStop   |
+----------------------+
          |
          |
          v
+----------------------+
| Complete trigger     |
| release or second press |
+----------------------+
          |
          |
          v
+----------------------+
| Observe input box    |
| - first input time   |
| - last input time    |
| - final text         |
+----------------------+
          |
          |
     +----+----+
     |         |
     | done    | timeout / error
     |         |
     v         v
+----------------------+      +----------------------+
| Build metrics        |      | Mark failed         |
| Normalize text       |      | Save failure reason |
+----------------------+      +----------------------+
          |                            |
          |                            |
          +------------+---------------+
                       |
                       v
             +----------------------+
             | Save test run        |
             | Save run events       |
             +----------------------+
                       |
                       |
                       v
             +----------------------+
             | Next sample          |
             +----------------------+
```

## Notes

```text
Main benchmark path:

test tool frontmost
        |
        +----- input box keeps focus
        |
        +----- native helper sends captured system hotkey
        |
        +----- target voice typing app listens in background
        |
        +----- target app types text into test tool input box
```

```text
Optional side path:

start app / relaunch app / maintenance actions
        |
        +----- may use Automation
        |
        +----- not required for core benchmark run
```

