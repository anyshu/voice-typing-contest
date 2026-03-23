import { copyFile, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { execFile } from "node:child_process";
import type { AudioSample } from "../shared/types";

const cacheRoot = join(tmpdir(), "vtc-builtin-samples");
const voiceByLanguage: Record<string, string> = {
  zh: "Eddy (中文（中国大陆）)",
  en: "Eddy (英语（美国）)",
};

async function runSay(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    execFile("say", args, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export class BuiltinSampleMaterializer {
  async resolve(sample: AudioSample): Promise<string> {
    if (!sample.filePath.startsWith("__builtin__/")) {
      return await this.copyExternalSample(sample);
    }

    mkdirSync(cacheRoot, { recursive: true });
    const ext = sample.language === "zh" ? "aiff" : "aiff";
    const outputPath = join(cacheRoot, `${sample.id}.${ext}`);
    if (existsSync(outputPath)) {
      return outputPath;
    }

    const message = sample.expectedText?.trim() || sample.displayName || sample.relativePath;
    const preferredVoice = voiceByLanguage[sample.language];

    try {
      if (preferredVoice) {
        await runSay(["-v", preferredVoice, "-o", outputPath, message]);
      } else {
        await runSay(["-o", outputPath, message]);
      }
    } catch {
      await runSay(["-o", outputPath, message]);
    }

    return outputPath;
  }

  private async copyExternalSample(sample: AudioSample): Promise<string> {
    if (sample.filePath.startsWith(cacheRoot)) {
      return sample.filePath;
    }

    mkdirSync(cacheRoot, { recursive: true });
    const sourceStat = await stat(sample.filePath);
    const extension = extname(sample.filePath) || ".wav";
    const outputPath = join(cacheRoot, `${sample.id}-${sourceStat.size}-${Math.round(sourceStat.mtimeMs)}${extension}`);
    if (!existsSync(outputPath)) {
      await this.copyWithFallback(sample.filePath, outputPath);
    }
    return outputPath;
  }

  private async copyWithFallback(sourcePath: string, outputPath: string): Promise<void> {
    try {
      await copyFile(sourcePath, outputPath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!["EPERM", "EXDEV", "EINVAL"].includes(code ?? "")) {
        throw error;
      }
    }

    // `copyFile` can be rejected by macOS privacy rules for Downloads/Desktop
    // even when plain file reads are still allowed for the current process.
    const buffer = await readFile(sourcePath);
    await writeFile(outputPath, buffer);
  }
}
