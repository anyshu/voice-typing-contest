import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SampleManager } from "../src/main/sample-manager";

function createWav(durationMs = 1000): Buffer {
  const sampleRate = 16000;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * channels * bytesPerSample;
  const dataSize = Math.floor((durationMs / 1000) * byteRate);
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

let root = "";

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe("SampleManager", () => {
  it("scans nested wav files and keeps relative paths", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-samples-"));
    await mkdir(join(root, "mandarin", "basic"), { recursive: true });
    await writeFile(join(root, "mandarin", "basic", "a.wav"), createWav(1200));
    await writeFile(join(root, "ignore.txt"), "nope");
    const samples = await new SampleManager().scan(root);
    expect(samples).toHaveLength(1);
    expect(samples[0]?.relativePath).toBe("mandarin/basic/a.wav");
    expect(samples[0]?.durationMs).toBeGreaterThan(1000);
  });
});
