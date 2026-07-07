import { access, readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { nanoid } from "nanoid";
import { isSupportedAudioSample, readAudioDurationMs } from "../shared/audio";
import type { AppConfig, AudioSample } from "../shared/types";
import { resolveHomePath } from "../shared/paths";

interface JsonlSampleRecord {
  id?: string;
  audio_filepath?: string;
  text?: string;
  duration?: number;
  category?: string;
  subcategory?: string;
  group_id?: string;
  language?: string;
  source_md?: string;
}

interface SampleManagerOptions {
  durationProbeTimeoutMs?: number;
  durationProbeConcurrency?: number;
}

interface DiscoveredSampleFile {
  filePath: string;
  relativePath: string;
}

const DEFAULT_DURATION_PROBE_TIMEOUT_MS = 2000;
const DEFAULT_DURATION_PROBE_CONCURRENCY = 4;

export class SampleManager {
  private readonly durationProbeTimeoutMs: number;
  private readonly durationProbeConcurrency: number;

  constructor(options: SampleManagerOptions = {}) {
    this.durationProbeTimeoutMs = options.durationProbeTimeoutMs ?? DEFAULT_DURATION_PROBE_TIMEOUT_MS;
    this.durationProbeConcurrency = options.durationProbeConcurrency ?? DEFAULT_DURATION_PROBE_CONCURRENCY;
  }

  async scan(root: string, previousSamples: AudioSample[] = []): Promise<AudioSample[]> {
    return await this.scanDirectory(root, previousSamples);
  }

  async loadFromConfig(config: Pick<AppConfig, "sampleSourceType" | "sampleRoot" | "sampleJsonlPath" | "audioSamples">): Promise<AudioSample[]> {
    if (config.sampleSourceType === "jsonl") {
      return await this.loadJsonl(config.sampleJsonlPath, config.audioSamples);
    }
    return await this.scanDirectory(config.sampleRoot, config.audioSamples);
  }

  async scanDirectory(root: string, previousSamples: AudioSample[] = []): Promise<AudioSample[]> {
    const resolvedRoot = resolveHomePath(root);
    const existingByPath = new Map(previousSamples.map((sample) => [sample.filePath, sample]));
    const discoveredFiles: DiscoveredSampleFile[] = [];
    try {
      await this.walk(resolvedRoot, resolvedRoot, discoveredFiles);
    } catch (error) {
      if (this.isMissingPathError(error)) {
        throw new Error("样本目录不存在，可能已经被移动或删除了。请重新选择目录后再扫描。");
      }
      throw error;
    }
    const found = await this.mapWithConcurrency(discoveredFiles, this.durationProbeConcurrency, async ({ filePath, relativePath }) => {
      const durationMs = await this.probeDurationMs(filePath);
      const previous = existingByPath.get(filePath);
      return {
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
        sourceType: previous?.sourceType ?? "directory",
        metadata: previous?.metadata,
      };
    });
    return found.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  async loadJsonl(jsonlPath: string, previousSamples: AudioSample[] = []): Promise<AudioSample[]> {
    const resolvedJsonlPath = resolveHomePath(jsonlPath);
    let content = "";
    try {
      content = await readFile(resolvedJsonlPath, "utf8");
    } catch (error) {
      if (this.isMissingPathError(error)) {
        throw new Error("JSONL 文件不存在，可能已经被移动或删除了。请重新选择文件后再加载。");
      }
      throw error;
    }

    const existingByStableKey = new Map(previousSamples.map((sample) => [this.sampleStableKey(sample), sample]));
    const audioBasePath = dirname(resolvedJsonlPath);
    const found: AudioSample[] = [];

    for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
      const line = rawLine.trim();
      if (!line) continue;

      let record: JsonlSampleRecord;
      try {
        record = JSON.parse(line) as JsonlSampleRecord;
      } catch {
        throw new Error(`JSONL 第 ${index + 1} 行不是合法 JSON。`);
      }

      const relativeAudioPath = record.audio_filepath?.trim();
      if (!relativeAudioPath) {
        throw new Error(`JSONL 第 ${index + 1} 行缺少 audio_filepath。`);
      }

      const filePath = join(audioBasePath, relativeAudioPath);
      const previous = existingByStableKey.get(this.sampleStableKeyFromJsonl(resolvedJsonlPath, record, relativeAudioPath))
        ?? existingByStableKey.get(filePath);
      const exists = await this.pathExists(filePath);
      const durationMs = exists
        ? await this.resolveJsonlDurationMs(filePath, record.duration)
        : this.normalizeDurationMs(record.duration);
      const language = record.language?.trim() || this.inferLanguage(relativeAudioPath);

      found.push({
        id: previous?.id ?? `jsonl:${record.id?.trim() || nanoid()}`,
        filePath,
        relativePath: relativeAudioPath,
        displayName: basename(relativeAudioPath),
        expectedText: record.text?.trim() || previous?.expectedText,
        language,
        durationMs,
        tags: [
          "jsonl",
          ...(record.group_id?.trim() ? [record.group_id.trim()] : []),
          ...(record.category?.trim() ? [record.category.trim()] : []),
          ...(record.subcategory?.trim() ? [record.subcategory.trim()] : []),
          ...(language ? [language] : []),
        ],
        enabled: exists ? (previous?.enabled ?? true) : false,
        exists,
        sourceType: "jsonl",
        metadata: {
          sourceId: record.id?.trim(),
          category: record.category?.trim(),
          subcategory: record.subcategory?.trim(),
          groupId: record.group_id?.trim(),
          sourceMd: record.source_md?.trim(),
          jsonlPath: resolvedJsonlPath,
        },
      });
    }

    return found.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  private async walk(root: string, current: string, found: DiscoveredSampleFile[]): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = join(current, entry.name);
      if (entry.isDirectory()) {
        await this.walk(root, filePath, found);
        continue;
      }
      if (!isSupportedAudioSample(entry.name)) continue;
      const relativePath = relative(root, filePath);
      found.push({ filePath, relativePath });
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

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private sampleStableKey(sample: AudioSample): string {
    if (sample.sourceType === "jsonl") {
      return this.sampleStableKeyFromJsonl(sample.metadata?.jsonlPath, { id: sample.metadata?.sourceId }, sample.relativePath);
    }
    return sample.filePath;
  }

  private sampleStableKeyFromJsonl(jsonlPath: string | undefined, record: Pick<JsonlSampleRecord, "id">, relativeAudioPath: string): string {
    return `${jsonlPath ?? ""}::${record.id?.trim() || relativeAudioPath}`;
  }

  private async resolveJsonlDurationMs(filePath: string, durationSeconds?: number): Promise<number> {
    const fallbackMs = this.normalizeDurationMs(durationSeconds);
    if (fallbackMs > 0) return fallbackMs;
    return await this.probeDurationMs(filePath);
  }

  private normalizeDurationMs(durationSeconds?: number): number {
    if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return 0;
    }
    return Math.round(durationSeconds * 1000);
  }

  private inferLanguage(relativePath: string): string {
    return relativePath.includes("english") ? "en" : "zh";
  }

  private async probeDurationMs(filePath: string): Promise<number> {
    try {
      return await this.withTimeout(readAudioDurationMs(filePath), this.durationProbeTimeoutMs, 0);
    } catch {
      return 0;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => {
          timeout = setTimeout(() => resolve(fallback), timeoutMs);
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    const workers = Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex]);
      }
    });
    await Promise.all(workers);
    return results;
  }
}
