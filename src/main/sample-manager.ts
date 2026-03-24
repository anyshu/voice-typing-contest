import { readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { nanoid } from "nanoid";
import { isSupportedAudioSample, readAudioDurationMs } from "../shared/audio";
import type { AudioSample } from "../shared/types";
import { resolveHomePath } from "../shared/paths";

export class SampleManager {
  async scan(root: string): Promise<AudioSample[]> {
    const resolvedRoot = resolveHomePath(root);
    const found: AudioSample[] = [];
    await this.walk(resolvedRoot, resolvedRoot, found);
    return found.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  private async walk(root: string, current: string, found: AudioSample[]): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = join(current, entry.name);
      if (entry.isDirectory()) {
        await this.walk(root, filePath, found);
        continue;
      }
      if (!isSupportedAudioSample(entry.name)) continue;
      const relativePath = relative(root, filePath);
      const durationMs = await readAudioDurationMs(filePath);
      found.push({
        id: nanoid(),
        filePath,
        relativePath,
        displayName: basename(filePath),
        durationMs,
        language: relativePath.includes("english") ? "en" : "zh",
        tags: relativePath.split("/").slice(0, -1),
        enabled: true,
      });
    }
  }
}
