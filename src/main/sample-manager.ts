import { access, readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { nanoid } from "nanoid";
import { isSupportedAudioSample, readAudioDurationMs } from "../shared/audio";
import type { AudioSample } from "../shared/types";
import { resolveHomePath } from "../shared/paths";

export class SampleManager {
  async scan(root: string, previousSamples: AudioSample[] = []): Promise<AudioSample[]> {
    const resolvedRoot = resolveHomePath(root);
    const existingByPath = new Map(previousSamples.map((sample) => [sample.filePath, sample]));
    const found: AudioSample[] = [];
    try {
      await this.walk(resolvedRoot, resolvedRoot, found, existingByPath);
    } catch (error) {
      if (this.isMissingPathError(error)) {
        throw new Error("样本目录不存在，可能已经被移动或删除了。请重新选择目录后再扫描。");
      }
      throw error;
    }
    return found.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  private async walk(root: string, current: string, found: AudioSample[], existingByPath: Map<string, AudioSample>): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = join(current, entry.name);
      if (entry.isDirectory()) {
        await this.walk(root, filePath, found, existingByPath);
        continue;
      }
      if (!isSupportedAudioSample(entry.name)) continue;
      const relativePath = relative(root, filePath);
      const durationMs = await readAudioDurationMs(filePath);
      const previous = existingByPath.get(filePath);
      found.push({
        id: previous?.id ?? nanoid(),
        filePath,
        relativePath,
        displayName: basename(filePath),
        durationMs,
        language: relativePath.includes("english") ? "en" : "zh",
        tags: relativePath.split("/").slice(0, -1),
        expectedText: previous?.expectedText,
        enabled: previous?.enabled ?? true,
        exists: true,
      });
    }
  }

  async validate(samples: AudioSample[]): Promise<{ samples: AudioSample[]; changed: boolean }> {
    let changed = false;
    const nextSamples = await Promise.all(samples.map(async (sample) => {
      const exists = await this.sampleExists(sample);
      const enabled = exists ? sample.enabled : false;
      if (sample.exists !== exists) changed = true;
      if (sample.enabled !== enabled) changed = true;
      return {
        ...sample,
        exists,
        enabled,
      };
    }));
    return { samples: nextSamples, changed };
  }

  private async sampleExists(sample: AudioSample): Promise<boolean> {
    if (sample.filePath.startsWith("__builtin__/")) return true;
    try {
      await access(resolveHomePath(sample.filePath));
      return true;
    } catch {
      return false;
    }
  }

  private isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
  }
}
