import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

describe("send-hotkey.jxa", () => {
  it("exits cleanly for hold_release phases", () => {
    if (process.platform !== "darwin") {
      expect(true).toBe(true);
      return;
    }

    const scriptPath = resolve("scripts/send-hotkey.jxa");
    const down = spawnSync("osascript", ["-l", "JavaScript", scriptPath, "Ctrl + 1", "down"], { encoding: "utf8" });
    const up = spawnSync("osascript", ["-l", "JavaScript", scriptPath, "Ctrl + 1", "up"], { encoding: "utf8" });

    expect(down.status).toBe(0);
    expect(up.status).toBe(0);
  });

  it("supports Fn as a modifier", () => {
    if (process.platform !== "darwin") {
      expect(true).toBe(true);
      return;
    }

    const scriptPath = resolve("scripts/send-hotkey.jxa");
    const down = spawnSync("osascript", ["-l", "JavaScript", scriptPath, "Fn + 1", "down"], { encoding: "utf8" });
    const up = spawnSync("osascript", ["-l", "JavaScript", scriptPath, "Fn + 1", "up"], { encoding: "utf8" });

    expect(down.status).toBe(0);
    expect(up.status).toBe(0);
  });

  it("supports standalone Fn", () => {
    if (process.platform !== "darwin") {
      expect(true).toBe(true);
      return;
    }

    const scriptPath = resolve("scripts/send-hotkey.jxa");
    const down = spawnSync("osascript", ["-l", "JavaScript", scriptPath, "Fn", "down"], { encoding: "utf8" });
    const up = spawnSync("osascript", ["-l", "JavaScript", scriptPath, "Fn", "up"], { encoding: "utf8" });

    expect(down.status).toBe(0);
    expect(up.status).toBe(0);
  });
});
