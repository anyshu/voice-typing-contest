import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { AppConfig, ResultDetail, RunEventRecord, RunSessionRecord, RunSessionSummary, TestRunRecord } from "../shared/types";

type DatabaseLike = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  close(): void;
};

const require = createRequire(import.meta.url);

function openDatabase(dbPath: string): DatabaseLike {
  if (process.versions.electron) {
    const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");
    return new BetterSqlite3(dbPath);
  }

  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  return new DatabaseSync(dbPath);
}

export class ResultStore {
  private readonly db: DatabaseLike;

  constructor(private readonly dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = openDatabase(dbPath);
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS target_apps (
        id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audio_samples (
        id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS run_sessions (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL,
        selected_app_ids_json TEXT NOT NULL,
        selected_sample_ids_json TEXT NOT NULL,
        permission_snapshot_json TEXT NOT NULL,
        device_snapshot_json TEXT NOT NULL,
        config_snapshot_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        run_session_id TEXT NOT NULL,
        app_id TEXT NOT NULL,
        app_name TEXT NOT NULL,
        sample_id TEXT NOT NULL,
        sample_path TEXT NOT NULL,
        status TEXT NOT NULL,
        phase TEXT NOT NULL,
        failure_category TEXT,
        failure_reason TEXT,
        raw_text TEXT NOT NULL,
        normalized_text TEXT NOT NULL,
        expected_text TEXT,
        hotkey_to_audio_ms INTEGER,
        audio_to_first_char_ms INTEGER,
        audio_end_to_first_char_ms INTEGER,
        audio_end_to_final_text_ms INTEGER,
        trigger_stop_to_first_char_ms INTEGER,
        trigger_stop_to_final_text_ms INTEGER,
        total_run_ms INTEGER,
        input_event_count INTEGER NOT NULL,
        final_text_length INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        timeline_json TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS run_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        ts_ms REAL NOT NULL,
        payload_json TEXT NOT NULL
      );
    `);

    const testRunColumns = this.db.prepare("PRAGMA table_info(test_runs)").all() as Array<{ name: string }>;
    const testRunColumnNames = new Set(testRunColumns.map((column) => column.name));
    if (!testRunColumnNames.has("trigger_stop_to_first_char_ms")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN trigger_stop_to_first_char_ms INTEGER");
    }
    if (!testRunColumnNames.has("trigger_stop_to_final_text_ms")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN trigger_stop_to_final_text_ms INTEGER");
    }
    if (!testRunColumnNames.has("timeline_json")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN timeline_json TEXT NOT NULL DEFAULT '[]'");
    }
  }

  syncConfig(config: AppConfig): void {
    const upsertApp = this.db.prepare("INSERT OR REPLACE INTO target_apps (id, payload_json) VALUES (?, ?)");
    const upsertSample = this.db.prepare("INSERT OR REPLACE INTO audio_samples (id, payload_json) VALUES (?, ?)");
    for (const app of config.targetApps) upsertApp.run(app.id, JSON.stringify(app));
    for (const sample of config.audioSamples) upsertSample.run(sample.id, JSON.stringify(sample));
  }

  createSession(record: RunSessionRecord): void {
    this.db.prepare(`
      INSERT INTO run_sessions (
        id, started_at, finished_at, status, selected_app_ids_json, selected_sample_ids_json,
        permission_snapshot_json, device_snapshot_json, config_snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.startedAt,
      record.finishedAt ?? null,
      record.status,
      JSON.stringify(record.selectedAppIds),
      JSON.stringify(record.selectedSampleIds),
      JSON.stringify(record.permissionSnapshot),
      JSON.stringify(record.deviceSnapshot),
      JSON.stringify(record.configSnapshot),
    );
  }

  updateSessionStatus(id: string, status: string, finishedAt?: string): void {
    this.db.prepare("UPDATE run_sessions SET status = ?, finished_at = COALESCE(?, finished_at) WHERE id = ?").run(status, finishedAt ?? null, id);
  }

  insertRun(record: TestRunRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO test_runs (
        id, run_session_id, app_id, app_name, sample_id, sample_path, status, phase,
        failure_category, failure_reason, raw_text, normalized_text, expected_text,
        hotkey_to_audio_ms, trigger_stop_to_first_char_ms, trigger_stop_to_final_text_ms,
        total_run_ms, input_event_count, final_text_length, created_at, timeline_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.runSessionId,
      record.appId,
      record.appName,
      record.sampleId,
      record.samplePath,
      record.status,
      record.phase,
      record.failureCategory ?? null,
      record.failureReason ?? null,
      record.rawText,
      record.normalizedText,
      record.expectedText ?? null,
      record.hotkeyToAudioMs ?? null,
      record.triggerStopToFirstCharMs ?? null,
      record.triggerStopToFinalTextMs ?? null,
      record.totalRunMs ?? null,
      record.inputEventCount,
      record.finalTextLength,
      record.createdAt,
      JSON.stringify(record.timeline),
    );
  }

  appendEvent(record: RunEventRecord): void {
    this.db.prepare("INSERT INTO run_events (id, run_id, event_type, ts_ms, payload_json) VALUES (?, ?, ?, ?, ?)").run(
      record.id,
      record.runId,
      record.eventType,
      record.tsMs,
      record.payloadJson,
    );
  }

  updateRunTimeline(runId: string, timeline: RunEventRecord[]): void {
    this.db.prepare("UPDATE test_runs SET timeline_json = ? WHERE id = ?").run(JSON.stringify(timeline), runId);
  }

  listRuns(sessionId?: string): TestRunRecord[] {
    const query = `
      SELECT
        id,
        run_session_id AS runSessionId,
        app_id AS appId,
        app_name AS appName,
        sample_id AS sampleId,
        sample_path AS samplePath,
        status,
        phase,
        failure_category AS failureCategory,
        failure_reason AS failureReason,
        raw_text AS rawText,
        normalized_text AS normalizedText,
        expected_text AS expectedText,
        hotkey_to_audio_ms AS hotkeyToAudioMs,
        trigger_stop_to_first_char_ms AS triggerStopToFirstCharMs,
        trigger_stop_to_final_text_ms AS triggerStopToFinalTextMs,
        total_run_ms AS totalRunMs,
        input_event_count AS inputEventCount,
        final_text_length AS finalTextLength,
        created_at AS createdAt,
        timeline_json AS timelineJson
      FROM test_runs
      ${sessionId ? "WHERE run_session_id = ?" : ""}
      ORDER BY created_at DESC
    `;
    const rows = (sessionId
      ? this.db.prepare(query).all(sessionId)
      : this.db.prepare(query).all()) as Array<TestRunRecord & { timelineJson?: string }>;
    return rows.map(({ id, timelineJson, ...row }) => {
      const timeline = this.parseTimeline(timelineJson);
      return {
        id,
        ...row,
        timeline: timeline.length ? timeline : this.listEventsForRun(id),
      };
    });
  }

  listSessions(): RunSessionSummary[] {
    return this.db.prepare(`
      SELECT
        run_sessions.id AS id,
        run_sessions.started_at AS startedAt,
        run_sessions.finished_at AS finishedAt,
        run_sessions.status AS status,
        COUNT(test_runs.id) AS runCount,
        COALESCE(SUM(CASE WHEN test_runs.status = 'success' THEN 1 ELSE 0 END), 0) AS successCount,
        COALESCE(SUM(CASE WHEN test_runs.status = 'failed' THEN 1 ELSE 0 END), 0) AS failedCount,
        COALESCE(SUM(CASE WHEN test_runs.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelledCount
      FROM run_sessions
      LEFT JOIN test_runs ON test_runs.run_session_id = run_sessions.id
      GROUP BY run_sessions.id
      ORDER BY run_sessions.started_at DESC
    `).all() as unknown as RunSessionSummary[];
  }

  getRunDetail(runId: string): ResultDetail | undefined {
    const record = this.db.prepare(`
      SELECT
        id,
        run_session_id AS runSessionId,
        app_id AS appId,
        app_name AS appName,
        sample_id AS sampleId,
        sample_path AS samplePath,
        status,
        phase,
        failure_category AS failureCategory,
        failure_reason AS failureReason,
        raw_text AS rawText,
        normalized_text AS normalizedText,
        expected_text AS expectedText,
        hotkey_to_audio_ms AS hotkeyToAudioMs,
        trigger_stop_to_first_char_ms AS triggerStopToFirstCharMs,
        trigger_stop_to_final_text_ms AS triggerStopToFinalTextMs,
        total_run_ms AS totalRunMs,
        input_event_count AS inputEventCount,
        final_text_length AS finalTextLength,
        created_at AS createdAt,
        timeline_json AS timelineJson
      FROM test_runs
      WHERE id = ?
    `).get(runId) as (TestRunRecord & { timelineJson?: string }) | undefined;
    if (!record) return undefined;
    const timeline = this.parseTimeline(record.timelineJson);
    const normalizedTimeline = timeline.length ? timeline : this.listEventsForRun(runId);
    const { timelineJson, ...baseRecord } = record;
    const normalizedRecord: TestRunRecord = {
      ...baseRecord,
      timeline: normalizedTimeline,
    };
    return { record: normalizedRecord, events: normalizedTimeline };
  }

  private parseTimeline(timelineJson?: string): RunEventRecord[] {
    if (!timelineJson) return [];
    try {
      const timeline = JSON.parse(timelineJson) as RunEventRecord[];
      return Array.isArray(timeline) ? timeline : [];
    } catch {
      return [];
    }
  }

  private listEventsForRun(runId: string): RunEventRecord[] {
    return this.db.prepare(`
      SELECT
        id,
        run_id AS runId,
        event_type AS eventType,
        ts_ms AS tsMs,
        payload_json AS payloadJson
      FROM run_events
      WHERE run_id = ?
      ORDER BY ts_ms ASC
    `).all(runId) as unknown as RunEventRecord[];
  }

  exportCsv(sessionId?: string): string {
    const rows = this.listRuns(sessionId);
    const headers = [
      "app_name",
      "sample_path",
      "status",
      "failure_category",
      "failure_reason",
      "trigger_stop_to_first_char_ms",
      "trigger_stop_to_final_text_ms",
      "final_text_length",
      "raw_text",
      "created_at",
    ];
    const csvRows = [headers.join(",")];
    for (const row of rows) {
      const line = [
        row.appName,
        row.samplePath,
        row.status,
        row.failureCategory ?? "",
        row.failureReason ?? "",
        row.triggerStopToFirstCharMs ?? "",
        row.triggerStopToFinalTextMs ?? "",
        row.finalTextLength,
        row.rawText,
        row.createdAt,
      ].map((value) => `"${String(value).replaceAll(`"`, `""`)}"`).join(",");
      csvRows.push(line);
    }
    return csvRows.join("\n");
  }

  close(): void {
    this.db.close();
  }
}
