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
    expect(csv).toContain("app_name");
    expect(csv).toContain("trigger_stop_to_first_char_ms");
    expect(csv).toContain("trigger_stop_to_final_text_ms");
    expect(csv).toContain("hello");
    expect(store.getRunDetail("run-1")?.record.appName).toBe("App");
    expect(store.listRuns()[0]?.timeline).toEqual([]);
    store.close();
  });
});
