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
| Launch app once      |
+----------------------+
          |
          |
          v
+----------------------+
| Wait appLaunchDelay  |
+----------------------+
          |
          |
          v
+----------------------+
| Bring benchmark      |
| window to front      |
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
| Wait focusInputDelay |
+----------------------+
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
             | Wait betweenSamples  |
             +----------------------+
                       |
                       |
                  +----+----+
                  |         |
                  | more    | done for app
                  | sample  |
                  v         v
        +----------------------+   +----------------------+
        | Next sample          |   | Wait closeAppDelay   |
        +----------------------+   +----------------------+
                                             |
                                             |
                                             v
                                   +----------------------+
                                   | Close current app    |
                                   +----------------------+
                                             |
                                             |
                                             v
                                   +----------------------+
                                   | Select next app      |
                                   +----------------------+
```

## Notes

```text
Main benchmark path:

benchmark tool reclaims frontmost state
        |
        +----- input box keeps focus
        |
        +----- helper sends captured system hotkey
        |
        +----- target voice typing app may launch once per app batch
        |
        +----- target app types text into test tool input box
```

```text
Close path:

after last sample for one app
        |
        +----- wait closeAppDelay
        |
        +----- close target app
        |
        +----- continue with next app
```
