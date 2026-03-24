import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { isSupportedAudioSample, readAudioDurationMs } from "../src/shared/audio";

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

describe("audio helpers", () => {
  it("accepts wav, mp3, and ogg sample extensions", () => {
    expect(isSupportedAudioSample("demo.wav")).toBe(true);
    expect(isSupportedAudioSample("demo.MP3")).toBe(true);
    expect(isSupportedAudioSample("demo.ogg")).toBe(true);
    expect(isSupportedAudioSample("demo.m4a")).toBe(false);
  });

  it("reads wav duration from the file header", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-audio-"));
    const wavPath = join(root, "demo.wav");
    await writeFile(wavPath, createWav(1250));

    const durationMs = await readAudioDurationMs(wavPath);
    expect(durationMs).toBeGreaterThanOrEqual(1200);
    expect(durationMs).toBeLessThanOrEqual(1300);
  });
});
