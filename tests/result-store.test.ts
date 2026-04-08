import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ResultStore } from "../src/main/result-store";
import { defaultConfig, defaultDevices, defaultPermissions } from "../src/shared/defaults";

let root = "";

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe("ResultStore", () => {
  it("stores runs and exports csv", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-db-"));
    const store = new ResultStore(join(root, "test.sqlite"));
    const config = defaultConfig();
    store.syncConfig(config);
    store.createSession({
      id: "session-1",
      startedAt: new Date().toISOString(),
      selectedAppIds: [],
      selectedSampleIds: [],
      permissionSnapshot: defaultPermissions(),
      deviceSnapshot: defaultDevices(),
      configSnapshot: config,
      status: "preflight",
    });
    store.insertRun({
      id: "run-1",
      runSessionId: "session-1",
      appId: "app-1",
      appName: "App",
      appVersion: "1.2.3",
      sampleId: "sample-1",
      samplePath: "a.wav",
      sampleSourceType: "jsonl",
      sampleMetadata: {
        jsonlPath: "/tmp/source.jsonl",
        sourceId: "item-1",
        sourceMd: "dataset/v1",
      },
      status: "success",
      phase: "completed",
      rawText: "hello",
      normalizedText: "hello",
      averageCpuPercent: 12.5,
      peakCpuPercent: 23.5,
      averageMemoryMb: 128.25,
      peakMemoryMb: 156.75,
      inputEventCount: 2,
      finalTextLength: 5,
      createdAt: new Date().toISOString(),
      timeline: [],
    });
    store.insertRun({
      id: "run-2",
      runSessionId: "session-1",
      appId: "app-2",
      appName: "Other App",
      appVersion: "9.9.9",
      sampleId: "sample-2",
      samplePath: "b.wav",
      status: "failed",
      phase: "failed",
      rawText: "",
      normalizedText: "",
      averageCpuPercent: 2.5,
      peakCpuPercent: 3.5,
      averageMemoryMb: 28.25,
      peakMemoryMb: 36.75,
      inputEventCount: 0,
      finalTextLength: 0,
      createdAt: new Date().toISOString(),
      timeline: [],
    });
    store.insertResourceSamples([
      {
        id: "resource-1",
        runId: "run-1",
        sampleIndex: 0,
        sampledAt: "2026-03-24T10:00:01.000Z",
        mainPid: 101,
        processCount: 3,
        mainCpuPercent: 9.4,
        totalCpuPercent: 12.5,
        mainMemoryMb: 88.5,
        totalMemoryMb: 128.25,
        intervalMs: 2000,
      },
      {
        id: "resource-2",
        runId: "run-2",
        sampleIndex: 0,
        sampledAt: "2026-03-24T10:00:02.000Z",
        mainPid: 102,
        processCount: 1,
        mainCpuPercent: 1.4,
        totalCpuPercent: 2.5,
        mainMemoryMb: 18.5,
        totalMemoryMb: 28.25,
        intervalMs: 2000,
      },
    ]);
    const csv = store.exportCsv();
    expect(csv).toContain("run_id");
    expect(csv).toContain("latest_run_id");
    expect(csv).toContain("retry_root_run_id");
    expect(csv).toContain("retry_attempt");
    expect(csv).toContain("app_name");
    expect(csv).toContain("app_version");
    expect(csv).toContain("sample_source_type");
    expect(csv).toContain("sample_jsonl_path");
    expect(csv).toContain("sample_source_id");
    expect(csv).toContain("trigger_stop_to_first_char_ms");
    expect(csv).toContain("trigger_stop_to_final_text_ms");
    expect(csv).toContain("average_cpu_percent");
    expect(csv).toContain("peak_memory_mb");
    expect(csv).toContain("hello");
    const resourceCsv = store.exportResourceCsv();
    expect(resourceCsv).toContain("total_cpu_percent");
    expect(resourceCsv).toContain("relative_sampled_at_ms");
    expect(resourceCsv).toContain("\"run-1\"");
    expect(resourceCsv).toContain("\"0\"");
    const resourceSummaryCsv = store.exportResourceSummaryCsv();
    expect(resourceSummaryCsv).toContain("sampling_interval_ms");
    expect(resourceSummaryCsv).toContain("average_cpu_percent");
    expect(resourceSummaryCsv).toContain("peak_memory_mb");
    expect(resourceSummaryCsv).toContain("\"2000\"");
    expect(resourceSummaryCsv).toContain("\"128.25\"");
    const filteredCsv = store.exportCsv("session-1", "App");
    expect(filteredCsv).toContain("\"App\"");
    expect(filteredCsv).not.toContain("\"Other App\"");
    const filteredResourceCsv = store.exportResourceCsv("session-1", "App");
    expect(filteredResourceCsv).toContain("\"run-1\"");
    expect(filteredResourceCsv).not.toContain("\"run-2\"");
    const filteredResourceSummaryCsv = store.exportResourceSummaryCsv("session-1", "App");
    expect(filteredResourceSummaryCsv).toContain("\"run-1\"");
    expect(filteredResourceSummaryCsv).not.toContain("\"run-2\"");
    expect(store.getRunDetail("run-1")?.record.appName).toBe("App");
    expect(store.getRunDetail("run-1")?.record.appVersion).toBe("1.2.3");
    expect(store.getRunDetail("run-1")?.record.sampleSourceType).toBe("jsonl");
    expect(store.getRunDetail("run-1")?.record.sampleMetadata?.jsonlPath).toBe("/tmp/source.jsonl");
    expect(store.listRuns()[0]?.timeline).toEqual([]);
    store.close();
  });

  it("collapses retry attempts back into the original session row and tracks retry count", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-db-retry-"));
    const store = new ResultStore(join(root, "test.sqlite"));
    const config = defaultConfig();
    store.syncConfig(config);
    store.createSession({
      id: "session-1",
      startedAt: "2026-03-24T10:00:00.000Z",
      selectedAppIds: [],
      selectedSampleIds: [],
      permissionSnapshot: defaultPermissions(),
      deviceSnapshot: defaultDevices(),
      configSnapshot: config,
      status: "completed",
    });
    store.createSession({
      id: "session-2",
      startedAt: "2026-03-24T10:10:00.000Z",
      selectedAppIds: [],
      selectedSampleIds: [],
      permissionSnapshot: defaultPermissions(),
      deviceSnapshot: defaultDevices(),
      configSnapshot: config,
      status: "completed",
    });
    store.insertRun({
      id: "run-1",
      runSessionId: "session-1",
      appId: "app-1",
      appName: "Typeless",
      appVersion: "1.0.0",
      sampleId: "sample-1",
      samplePath: "a.wav",
      status: "failed",
      phase: "failed",
      rawText: "",
      normalizedText: "",
      inputEventCount: 0,
      finalTextLength: 0,
      createdAt: "2026-03-24T10:01:00.000Z",
      timeline: [],
    });
    store.insertRun({
      id: "run-2",
      runSessionId: "session-2",
      appId: "app-1",
      appName: "Typeless",
      appVersion: "1.0.1",
      sampleId: "sample-1",
      samplePath: "a.wav",
      status: "success",
      phase: "completed",
      rawText: "fixed",
      normalizedText: "fixed",
      inputEventCount: 1,
      finalTextLength: 5,
      createdAt: "2026-03-24T10:11:00.000Z",
      retryRootRunId: "run-1",
      retryAttempt: 1,
      timeline: [],
    });

    const runs = store.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("success");
    expect(runs[0]?.runSessionId).toBe("session-1");
    expect(runs[0]?.retryCount).toBe(1);

    const sessions = store.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe("session-1");
    expect(sessions[0]?.successCount).toBe(1);
    expect(sessions[0]?.failedCount).toBe(0);

    const csv = store.exportCsv("session-1");
    expect(csv).toContain("retry_count");
    expect(csv).toContain("latest_run_id");
    expect(csv).toContain("retry_root_run_id");
    expect(csv).toContain("\"run-1\",\"run-2\",\"run-1\",\"1\"");
    expect(csv).toContain("1.0.1");
    expect(csv).toContain("fixed");
    expect(csv).not.toContain("\"run-2\",\"run-2\"");
    expect(csv).not.toContain("session-2");
    store.close();
  });

  it("imports exported csv rows as a new history session", async () => {
    root = await mkdtemp(join(tmpdir(), "vtc-db-import-"));
    const store = new ResultStore(join(root, "import.sqlite"));
    const config = defaultConfig();
    const originalNow = Date.now;
    try {
      Date.now = () => new Date("2026-03-24T12:34:56.000Z").getTime();

      const summary = store.importCsv([
        "app_name,app_version,sample_path,status,failure_category,failure_reason,trigger_stop_to_first_char_ms,trigger_stop_to_final_text_ms,final_text_length,raw_text,created_at",
        "\"AutoGLM\",\"2.8.0\",\"6.3/en/sample.mp3\",\"success\",\"\",\"\",\"1356\",\"1356\",\"11\",\"hello world\",\"2026-03-24T03:50:22.741Z\"",
      ].join("\n"), "/tmp/sample.csv", config, defaultPermissions(), defaultDevices());

      const sessions = store.listSessions();
      const runs = store.listRuns(summary.sessionId);

      expect(summary.importedCount).toBe(1);
      expect(sessions[0]?.id).toBe(summary.sessionId);
      expect(summary.startedAt).toBe("2026-03-24T12:34:56.000Z");
      expect(runs[0]?.appName).toBe("AutoGLM");
      expect(runs[0]?.appVersion).toBe("2.8.0");
      expect(runs[0]?.samplePath).toBe("6.3/en/sample.mp3");
      expect(runs[0]?.triggerStopToFirstCharMs).toBe(1356);
      expect(runs[0]?.createdAt).toBe("2026-03-24T12:34:56.000Z");
      expect(runs[0]?.timeline).toEqual([]);
    } finally {
      Date.now = originalNow;
      store.close();
    }
  });
});
