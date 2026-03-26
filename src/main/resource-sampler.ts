import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import type { ResourceSampleRecord } from "../shared/types";
import type { HelperClient } from "./helper-client";

const execFileAsync = promisify(execFile);
type PsRow = {
  pid: number;
  ppid: number;
  rssKb: number;
  cpuPercent: number;
};

export class ResourceSampler {
  constructor(private readonly helper: HelperClient) {}

  start(runId: string, appTarget: string, intervalMs: number): { stop: () => Promise<ResourceSampleRecord[]> } {
    const normalizedIntervalMs = Math.max(250, intervalMs);
    const samples: ResourceSampleRecord[] = [];
    let stopped = false;
    let loopPromise: Promise<void> | undefined;
    let pendingTimer: ReturnType<typeof setTimeout> | undefined;
    let resolveSleep: (() => void) | undefined;

    const loop = async (): Promise<void> => {
      let sampleIndex = 0;
      while (!stopped) {
        const sample = await this.sample(runId, appTarget, sampleIndex, normalizedIntervalMs);
        if (sample) {
          samples.push(sample);
          sampleIndex += 1;
        }
        if (stopped) break;
        await new Promise<void>((resolve) => {
          resolveSleep = resolve;
          pendingTimer = setTimeout(() => {
            pendingTimer = undefined;
            resolveSleep = undefined;
            resolve();
          }, normalizedIntervalMs);
        });
      }
    };

    loopPromise = loop();

    return {
      stop: async () => {
        stopped = true;
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          pendingTimer = undefined;
        }
        resolveSleep?.();
        resolveSleep = undefined;
        await loopPromise;
        return samples;
      },
    };
  }

  private async sample(
    runId: string,
    appTarget: string,
    sampleIndex: number,
    intervalMs: number,
  ): Promise<ResourceSampleRecord | undefined> {
    try {
      const runningApp = await this.helper.getRunningAppInfo(appTarget);
      if (!runningApp?.pid) return undefined;
      const rows = await this.listProcesses();
      const processByPid = new Map(rows.map((row) => [row.pid, row]));
      const root = processByPid.get(runningApp.pid);
      if (!root) return undefined;
      const descendantPids = this.collectDescendantPids(runningApp.pid, rows);
      const processRows = descendantPids
        .map((pid) => processByPid.get(pid))
        .filter((row): row is PsRow => Boolean(row));
      const totalMemoryMb = processRows.reduce((sum, row) => sum + row.rssKb / 1024, 0);
      const totalCpuPercent = processRows.reduce((sum, row) => sum + row.cpuPercent, 0);
      return {
        id: nanoid(),
        runId,
        sampleIndex,
        sampledAt: new Date().toISOString(),
        mainPid: root.pid,
        processCount: processRows.length,
        mainCpuPercent: this.round(root.cpuPercent),
        totalCpuPercent: this.round(totalCpuPercent),
        mainMemoryMb: this.round(root.rssKb / 1024),
        totalMemoryMb: this.round(totalMemoryMb),
        intervalMs,
      };
    } catch {
      return undefined;
    }
  }

  private collectDescendantPids(rootPid: number, rows: PsRow[]): number[] {
    const childrenByParent = new Map<number, number[]>();
    for (const row of rows) {
      childrenByParent.set(row.ppid, [...(childrenByParent.get(row.ppid) ?? []), row.pid]);
    }
    const pending = [rootPid];
    const visited = new Set<number>();
    while (pending.length) {
      const pid = pending.pop()!;
      if (visited.has(pid)) continue;
      visited.add(pid);
      pending.push(...(childrenByParent.get(pid) ?? []));
    }
    return [...visited];
  }

  private async listProcesses(): Promise<PsRow[]> {
    const { stdout } = await execFileAsync("/bin/ps", ["-axo", "pid=,ppid=,rss=,%cpu="]);
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [pidText, ppidText, rssText, cpuText] = line.split(/\s+/, 4);
        return {
          pid: Number.parseInt(pidText ?? "", 10),
          ppid: Number.parseInt(ppidText ?? "", 10),
          rssKb: Number.parseInt(rssText ?? "", 10),
          cpuPercent: Number.parseFloat(cpuText ?? "0"),
        } satisfies PsRow;
      })
      .filter((row) => Number.isFinite(row.pid) && Number.isFinite(row.ppid) && Number.isFinite(row.rssKb) && Number.isFinite(row.cpuPercent));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
