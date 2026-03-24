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
});
