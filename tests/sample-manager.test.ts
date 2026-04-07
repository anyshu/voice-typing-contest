import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("../src/shared/audio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/shared/audio")>();
  return {
    ...actual,
    readAudioDurationMs: vi.fn(async (filePath: string) => filePath.endsWith(".wav") ? 1200 : 900),
  };
});

import { SampleManager } from "../src/main/sample-manager";

let root = "";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe("SampleManager", () => {
  it("scans nested wav, mp3, and ogg files and keeps relative paths", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-samples-"));
    await mkdir(join(root, "mandarin", "basic"), { recursive: true });
    await writeFile(join(root, "mandarin", "basic", "a.wav"), "wav");
    await writeFile(join(root, "mandarin", "basic", "b.mp3"), "mp3");
    await writeFile(join(root, "mandarin", "basic", "c.ogg"), "ogg");
    await writeFile(join(root, "ignore.txt"), "nope");

    const samples = await new SampleManager().scan(root);
    expect(samples).toHaveLength(3);
    expect(samples.map((sample) => sample.relativePath)).toEqual([
      "mandarin/basic/a.wav",
      "mandarin/basic/b.mp3",
      "mandarin/basic/c.ogg",
    ]);
    expect(samples.every((sample) => sample.durationMs > 0)).toBe(true);
  });

  it("preserves sample id and enabled state when rescanning the same files", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-samples-"));
    await mkdir(join(root, "english"), { recursive: true });
    await writeFile(join(root, "english", "line-1.wav"), "wav");

    const manager = new SampleManager();
    const firstScan = await manager.scan(root);
    const rescanned = await manager.scan(root, [{
      ...firstScan[0],
      enabled: false,
      expectedText: "keep me",
    }]);

    expect(rescanned).toHaveLength(1);
    expect(rescanned[0].id).toBe(firstScan[0].id);
    expect(rescanned[0].enabled).toBe(false);
    expect(rescanned[0].expectedText).toBe("keep me");
  });

  it("marks missing external samples during validation", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-samples-"));
    await mkdir(join(root, "english"), { recursive: true });
    const existingPath = join(root, "english", "line-1.wav");
    const missingPath = join(root, "english", "line-2.wav");
    await writeFile(existingPath, "wav");

    const manager = new SampleManager();
    const validation = await manager.validate([
      {
        id: "sample-existing",
        filePath: existingPath,
        relativePath: "english/line-1.wav",
        displayName: "line-1.wav",
        language: "en",
        durationMs: 1200,
        tags: ["english"],
        enabled: true,
      },
      {
        id: "sample-missing",
        filePath: missingPath,
        relativePath: "english/line-2.wav",
        displayName: "line-2.wav",
        language: "en",
        durationMs: 1200,
        tags: ["english"],
        enabled: true,
      },
    ]);

    expect(validation.changed).toBe(true);
    expect(validation.samples.map((sample) => sample.exists)).toEqual([true, false]);
    expect(validation.samples.map((sample) => sample.enabled)).toEqual([true, false]);
  });
});
