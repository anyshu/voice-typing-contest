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
      sampleId: "sample-1",
      samplePath: "a.wav",
      status: "success",
      phase: "completed",
      rawText: "hello",
      normalizedText: "hello",
      inputEventCount: 2,
      finalTextLength: 5,
      createdAt: new Date().toISOString(),
      timeline: [],
    });
    const csv = store.exportCsv();
    expect(csv).toContain("run_id");
    expect(csv).toContain("latest_run_id");
    expect(csv).toContain("retry_root_run_id");
    expect(csv).toContain("retry_attempt");
    expect(csv).toContain("app_name");
    expect(csv).toContain("trigger_stop_to_first_char_ms");
    expect(csv).toContain("trigger_stop_to_final_text_ms");
    expect(csv).toContain("hello");
    expect(store.getRunDetail("run-1")?.record.appName).toBe("App");
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
        "app_name,sample_path,status,failure_category,failure_reason,trigger_stop_to_first_char_ms,trigger_stop_to_final_text_ms,final_text_length,raw_text,created_at",
        "\"AutoGLM\",\"6.3/en/sample.mp3\",\"success\",\"\",\"\",\"1356\",\"1356\",\"11\",\"hello world\",\"2026-03-24T03:50:22.741Z\"",
      ].join("\n"), "/tmp/sample.csv", config, defaultPermissions(), defaultDevices());

      const sessions = store.listSessions();
      const runs = store.listRuns(summary.sessionId);

      expect(summary.importedCount).toBe(1);
      expect(sessions[0]?.id).toBe(summary.sessionId);
      expect(summary.startedAt).toBe("2026-03-24T12:34:56.000Z");
      expect(runs[0]?.appName).toBe("AutoGLM");
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
