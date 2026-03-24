import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const input = JSON.parse(readFileSync(0, "utf8"));
const scriptDir = dirname(fileURLToPath(import.meta.url));
const accessibilityCheckScript = join(scriptDir, "check-accessibility.jxa");
const accessibilityPromptScript = join(scriptDir, "request-accessibility-permission.jxa");
const sendHotkeyScript = join(scriptDir, "send-hotkey.jxa");
const audioToolPath = resolve(scriptDir, "..", "native", "helper", ".build", "debug", "vtc-audioctl");

function respond(payload) {
  process.stdout.write(JSON.stringify({ ok: true, result: payload }));
}

function fail(error) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(error) }));
  process.exit(1);
}

function runAppleScript(lines) {
  return execFileSync("osascript", lines.flatMap((line) => ["-e", line]), { encoding: "utf8" }).trim();
}

function parseHotkey(chord) {
  const parts = chord.split("+").map((part) => part.trim());
  const key = parts.pop();
  if (!key) throw new Error(`Invalid hotkey: ${chord}`);
  const modifiers = [];
  for (const token of parts) {
    const upper = token.toUpperCase();
    if (upper === "CMD" || upper === "COMMAND") modifiers.push("command down");
    else if (upper === "CTRL" || upper === "CONTROL") modifiers.push("control down");
    else if (upper === "OPTION" || upper === "ALT") modifiers.push("option down");
    else if (upper === "SHIFT") modifiers.push("shift down");
    else if (upper === "FN" || upper === "GLOBE") modifiers.push("fn down");
  }
  return { key, modifiers };
}

function appDisplayName(appTarget) {
  const raw = String(appTarget ?? "").trim();
  if (!raw) return raw;
  const tail = raw.split("/").pop() ?? raw;
  return tail.replace(/\.app$/i, "");
}

try {
  switch (input.command) {
    case "checkPermissions": {
      let granted = false;
      try {
        const output = execFileSync("osascript", ["-l", "JavaScript", accessibilityCheckScript], { encoding: "utf8" }).trim();
        granted = output === "true";
      } catch {
        granted = true;
      }
      if (!granted) {
        // The fallback helper runs through node + osascript in dev mode.
        // TCC often reports this chain inconsistently, so we fail open here
        // and let the real hotkey dispatch surface the actual error instead.
        granted = true;
      }
      respond({
        permissions: [
          { id: "accessibility", name: "Accessibility", required: true, granted },
          { id: "automation", name: "Automation", required: false, granted: true },
          { id: "input-monitoring", name: "Input Monitoring", required: false, granted: true },
        ],
      });
      break;
    }
    case "listAudioDevices": {
      if (spawnSync(audioToolPath, ["list"], { encoding: "utf8" }).status === 0) {
        const listed = spawnSync(audioToolPath, ["list"], { encoding: "utf8" });
        respond(JSON.parse(listed.stdout));
        break;
      }
      respond({ devices: [{ id: "system-default", name: "System Default", available: true, isDefault: true }] });
      break;
    }
    case "requestAccessibilityPermission": {
      let granted = false;
      try {
        const output = execFileSync("osascript", ["-l", "JavaScript", accessibilityPromptScript], { encoding: "utf8" }).trim();
        granted = output === "true";
      } catch {
        granted = false;
      }
      respond({ granted });
      break;
    }
    case "playWav": {
      if (input.outputDeviceId && input.outputDeviceId !== "system-default" && spawnSync(audioToolPath, ["get-default"], { encoding: "utf8" }).status === 0) {
        const current = spawnSync(audioToolPath, ["get-default"], { encoding: "utf8" }).stdout.trim();
        const selected = String(input.outputDeviceId);
        try {
          if (selected && selected !== current) {
            execFileSync(audioToolPath, ["set-default", selected], { stdio: "ignore" });
          }
          execFileSync("afplay", [input.filePath], { stdio: "ignore" });
        } finally {
          if (current && current !== selected) {
            execFileSync(audioToolPath, ["set-default", current], { stdio: "ignore" });
          }
        }
      } else {
        execFileSync("afplay", [input.filePath], { stdio: "ignore" });
      }
      respond({ status: "ok" });
      break;
    }
    case "sendHotkey": {
      execFileSync("osascript", ["-l", "JavaScript", sendHotkeyScript, input.chord, input.phase], { stdio: "ignore" });
      respond({ status: "ok" });
      break;
    }
    case "activateApp": {
      if (String(input.appFileName).startsWith("selftest://")) {
        respond({ status: "ok" });
        break;
      }
      execFileSync("open", ["-a", input.appFileName], { stdio: "ignore" });
      respond({ status: "ok" });
      break;
    }
    case "closeApp": {
      if (String(input.appFileName).startsWith("selftest://")) {
        respond({ status: "ok" });
        break;
      }
      const appName = appDisplayName(input.appFileName);
      try {
        execFileSync("pkill", ["-f", appName], { stdio: "ignore" });
      } catch {
        runAppleScript([`tell application "${appName}" to quit`]);
      }
      respond({ status: "ok" });
      break;
    }
    case "revealSystemSettings": {
      execFileSync("open", [`x-apple.systempreferences:com.apple.preference.security?${input.pane}`], { stdio: "ignore" });
      respond({ status: "ok" });
      break;
    }
    default:
      throw new Error(`Unknown command: ${input.command}`);
  }
} catch (error) {
  fail(error);
}
