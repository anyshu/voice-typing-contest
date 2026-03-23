import { open } from "node:fs/promises";

export async function readWavDurationMs(filePath: string): Promise<number> {
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
