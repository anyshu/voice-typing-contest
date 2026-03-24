import { execFile } from "node:child_process";
import { open } from "node:fs/promises";
import { promisify } from "node:util";
import { extname } from "node:path";

const execFileAsync = promisify(execFile);

export const supportedAudioSampleExtensions = [".wav", ".mp3", ".ogg"] as const;

export function isSupportedAudioSample(filePath: string): boolean {
  return supportedAudioSampleExtensions.includes(extname(filePath).toLowerCase() as typeof supportedAudioSampleExtensions[number]);
}

export async function readAudioDurationMs(filePath: string): Promise<number> {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".wav") {
    return await readWavDurationMs(filePath);
  }
  return await readAfinfoDurationMs(filePath);
}

async function readWavDurationMs(filePath: string): Promise<number> {
  const file = await open(filePath, "r");
  try {
    const header = Buffer.alloc(44);
    await file.read(header, 0, 44, 0);
    const sampleRate = header.readUInt32LE(24);
    const byteRate = header.readUInt32LE(28);
    const dataSize = header.readUInt32LE(40);
    if (!sampleRate || !byteRate || !dataSize) {
      return 0;
    }
    return Math.round((dataSize / byteRate) * 1000);
  } finally {
    await file.close();
  }
}

async function readAfinfoDurationMs(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync("afinfo", [filePath], { encoding: "utf8" });
  const match = stdout.match(/estimated duration:\s*([0-9.]+)\s*sec/i);
  if (!match) {
    return 0;
  }
  return Math.round(Number(match[1]) * 1000);
}
