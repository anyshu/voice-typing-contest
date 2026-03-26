import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { nanoid } from "nanoid";
import type {
  AppConfig,
  AudioDevice,
  CsvImportSummary,
  PermissionSnapshot,
  ResourceSampleRecord,
  ResultDetail,
  ResultStatus,
  RunEventRecord,
  RunSessionRecord,
  RunSessionSummary,
  TestRunRecord,
} from "../shared/types";

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

type ImportedCsvRow = {
  appName: string;
  appVersion?: string;
  samplePath: string;
  status: ResultStatus;
  failureCategory?: string;
  failureReason?: string;
  triggerStopToFirstCharMs?: number;
  triggerStopToFinalTextMs?: number;
  finalTextLength: number;
  rawText: string;
  createdAt: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeImportedStatus(value: string): ResultStatus {
  if (value === "failed" || value === "cancelled" || value === "success") {
    return value;
  }
  return "success";
}

function phaseFromImportedStatus(status: ResultStatus): TestRunRecord["phase"] {
  if (status === "success") return "completed";
  if (status === "cancelled") return "cancelled";
  return "failed";
}

function parseOptionalInteger(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeImportedRows(csvText: string): ImportedCsvRow[] {
  const rows = parseCsv(csvText);
  const [header, ...body] = rows;
  if (!header?.length) {
    throw new Error("CSV 为空，无法导入。");
  }

  const indexByName = new Map(header.map((name, index) => [name.trim(), index]));
  const requiredColumns = [
    "app_name",
    "sample_path",
    "status",
    "final_text_length",
    "raw_text",
    "created_at",
  ];

  for (const column of requiredColumns) {
    if (!indexByName.has(column)) {
      throw new Error(`CSV 缺少必需列：${column}`);
    }
  }

  return body.map((row, rowIndex) => {
    const getValue = (name: string): string => row[indexByName.get(name) ?? -1] ?? "";
    const createdAt = getValue("created_at").trim();
    if (!createdAt) {
      throw new Error(`第 ${rowIndex + 2} 行缺少 created_at，无法导入。`);
    }

    return {
      appName: getValue("app_name").trim() || "Imported App",
      appVersion: getValue("app_version").trim() || undefined,
      samplePath: getValue("sample_path").trim() || `imported-sample-${rowIndex + 1}`,
      status: normalizeImportedStatus(getValue("status").trim()),
      failureCategory: getValue("failure_category").trim() || undefined,
      failureReason: getValue("failure_reason").trim() || undefined,
      triggerStopToFirstCharMs: parseOptionalInteger(getValue("trigger_stop_to_first_char_ms")),
      triggerStopToFinalTextMs: parseOptionalInteger(getValue("trigger_stop_to_final_text_ms")),
      finalTextLength: parseOptionalInteger(getValue("final_text_length")) ?? getValue("raw_text").length,
      rawText: getValue("raw_text"),
      createdAt,
    };
  });
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
        app_version TEXT,
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
        retry_root_run_id TEXT,
        retry_attempt INTEGER NOT NULL DEFAULT 0,
        timeline_json TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS run_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        ts_ms REAL NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS resource_samples (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        sample_index INTEGER NOT NULL,
        sampled_at TEXT NOT NULL,
        main_pid INTEGER NOT NULL,
        process_count INTEGER NOT NULL,
        main_cpu_percent REAL NOT NULL,
        total_cpu_percent REAL NOT NULL,
        main_memory_mb REAL NOT NULL,
        total_memory_mb REAL NOT NULL,
        interval_ms INTEGER NOT NULL
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
    if (!testRunColumnNames.has("retry_root_run_id")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN retry_root_run_id TEXT");
    }
    if (!testRunColumnNames.has("retry_attempt")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN retry_attempt INTEGER NOT NULL DEFAULT 0");
    }
    if (!testRunColumnNames.has("app_version")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN app_version TEXT");
    }
    if (!testRunColumnNames.has("average_cpu_percent")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN average_cpu_percent REAL");
    }
    if (!testRunColumnNames.has("peak_cpu_percent")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN peak_cpu_percent REAL");
    }
    if (!testRunColumnNames.has("average_memory_mb")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN average_memory_mb REAL");
    }
    if (!testRunColumnNames.has("peak_memory_mb")) {
      this.db.exec("ALTER TABLE test_runs ADD COLUMN peak_memory_mb REAL");
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
        id, run_session_id, app_id, app_name, app_version, sample_id, sample_path, status, phase,
        failure_category, failure_reason, raw_text, normalized_text, expected_text,
        hotkey_to_audio_ms, trigger_stop_to_first_char_ms, trigger_stop_to_final_text_ms,
        total_run_ms, average_cpu_percent, peak_cpu_percent, average_memory_mb, peak_memory_mb,
        input_event_count, final_text_length, created_at,
        retry_root_run_id, retry_attempt, timeline_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.runSessionId,
      record.appId,
      record.appName,
      record.appVersion ?? null,
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
      record.averageCpuPercent ?? null,
      record.peakCpuPercent ?? null,
      record.averageMemoryMb ?? null,
      record.peakMemoryMb ?? null,
      record.inputEventCount,
      record.finalTextLength,
      record.createdAt,
      record.retryRootRunId ?? null,
      record.retryAttempt ?? 0,
      JSON.stringify(record.timeline),
    );
  }

  getNextRetryAttempt(rootRunId: string): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count
      FROM test_runs
      WHERE id = ? OR retry_root_run_id = ?
    `).get(rootRunId, rootRunId) as { count?: number } | undefined;
    return Math.max(0, row?.count ?? 0);
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

  insertResourceSamples(samples: ResourceSampleRecord[]): void {
    if (!samples.length) return;
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO resource_samples (
        id, run_id, sample_index, sampled_at, main_pid, process_count,
        main_cpu_percent, total_cpu_percent, main_memory_mb, total_memory_mb, interval_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const sample of samples) {
      insert.run(
        sample.id,
        sample.runId,
        sample.sampleIndex,
        sample.sampledAt,
        sample.mainPid,
        sample.processCount,
        sample.mainCpuPercent,
        sample.totalCpuPercent,
        sample.mainMemoryMb,
        sample.totalMemoryMb,
        sample.intervalMs,
      );
    }
  }

  listRuns(sessionId?: string): TestRunRecord[] {
    const query = `
      SELECT
        id,
        run_session_id AS runSessionId,
        app_id AS appId,
        app_name AS appName,
        app_version AS appVersion,
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
        average_cpu_percent AS averageCpuPercent,
        peak_cpu_percent AS peakCpuPercent,
        average_memory_mb AS averageMemoryMb,
        peak_memory_mb AS peakMemoryMb,
        input_event_count AS inputEventCount,
        final_text_length AS finalTextLength,
        created_at AS createdAt,
        retry_root_run_id AS retryRootRunId,
        retry_attempt AS retryAttempt,
        timeline_json AS timelineJson
      FROM test_runs
      ORDER BY created_at DESC
    `;
    const rows = this.db.prepare(query).all() as Array<TestRunRecord & { timelineJson?: string }>;
    const normalizedRows = rows.map(({ id, timelineJson, ...row }) => {
      const timeline = this.parseTimeline(timelineJson);
      return {
        id,
        ...row,
        timeline: timeline.length ? timeline : this.listEventsForRun(id),
      };
    });
    const rowById = new Map(normalizedRows.map((row) => [row.id, row]));
    const grouped = new Map<string, TestRunRecord[]>();
    for (const row of normalizedRows) {
      const rootId = row.retryRootRunId ?? row.id;
      grouped.set(rootId, [...(grouped.get(rootId) ?? []), row]);
    }

    const collapsedRows = [...grouped.entries()].map(([rootId, chain]) => {
      const root = rowById.get(rootId) ?? chain[chain.length - 1]!;
      const latest = [...chain].sort((left, right) => {
        if (left.createdAt === right.createdAt) {
          return (right.retryAttempt ?? 0) - (left.retryAttempt ?? 0);
        }
        return right.createdAt.localeCompare(left.createdAt);
      })[0]!;
      return {
        ...latest,
        runSessionId: root.runSessionId,
        retryRootRunId: rootId === latest.id ? latest.retryRootRunId : rootId,
        retryCount: Math.max(...chain.map((item) => item.retryAttempt ?? 0)),
      } satisfies TestRunRecord;
    }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return sessionId ? collapsedRows.filter((row) => row.runSessionId === sessionId) : collapsedRows;
  }

  listSessions(): RunSessionSummary[] {
    const sessions = this.db.prepare(`
      SELECT
        id,
        started_at AS startedAt,
        finished_at AS finishedAt,
        status
      FROM run_sessions
      ORDER BY started_at DESC
    `).all() as Array<Pick<RunSessionSummary, "id" | "startedAt" | "finishedAt" | "status">>;
    const collapsedRuns = this.listRuns();
    return sessions
      .map((session) => {
        const sessionRuns = collapsedRuns.filter((item) => item.runSessionId === session.id);
        return {
          ...session,
          runCount: sessionRuns.length,
          successCount: sessionRuns.filter((item) => item.status === "success").length,
          failedCount: sessionRuns.filter((item) => item.status === "failed").length,
          cancelledCount: sessionRuns.filter((item) => item.status === "cancelled").length,
        };
      })
      .filter((session) => session.runCount > 0);
  }

  getRunDetail(runId: string): ResultDetail | undefined {
    const record = this.db.prepare(`
      SELECT
        id,
        run_session_id AS runSessionId,
        app_id AS appId,
        app_name AS appName,
        app_version AS appVersion,
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
        average_cpu_percent AS averageCpuPercent,
        peak_cpu_percent AS peakCpuPercent,
        average_memory_mb AS averageMemoryMb,
        peak_memory_mb AS peakMemoryMb,
        input_event_count AS inputEventCount,
        final_text_length AS finalTextLength,
        created_at AS createdAt,
        retry_root_run_id AS retryRootRunId,
        retry_attempt AS retryAttempt,
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
      "run_id",
      "latest_run_id",
      "retry_root_run_id",
      "retry_attempt",
      "app_name",
      "app_version",
      "sample_path",
      "status",
      "failure_category",
      "failure_reason",
      "trigger_stop_to_first_char_ms",
      "trigger_stop_to_final_text_ms",
      "average_cpu_percent",
      "peak_cpu_percent",
      "average_memory_mb",
      "peak_memory_mb",
      "retry_count",
      "final_text_length",
      "raw_text",
      "created_at",
    ];
    const csvRows = [headers.join(",")];
    for (const row of rows) {
      const rootRunId = row.retryRootRunId ?? row.id;
      const line = [
        rootRunId,
        row.id,
        rootRunId,
        row.retryAttempt ?? 0,
        row.appName,
        row.appVersion ?? "",
        row.samplePath,
        row.status,
        row.failureCategory ?? "",
        row.failureReason ?? "",
        row.triggerStopToFirstCharMs ?? "",
        row.triggerStopToFinalTextMs ?? "",
        row.averageCpuPercent ?? "",
        row.peakCpuPercent ?? "",
        row.averageMemoryMb ?? "",
        row.peakMemoryMb ?? "",
        row.retryCount ?? row.retryAttempt ?? 0,
        row.finalTextLength,
        row.rawText,
        row.createdAt,
      ].map((value) => `"${String(value).replaceAll(`"`, `""`)}"`).join(",");
      csvRows.push(line);
    }
    return csvRows.join("\n");
  }

  exportResourceCsv(sessionId?: string): string {
    const rows = this.db.prepare(`
      SELECT
        resource_samples.run_id AS runId,
        test_runs.run_session_id AS runSessionId,
        test_runs.app_name AS appName,
        test_runs.app_version AS appVersion,
        test_runs.sample_path AS samplePath,
        test_runs.status AS status,
        resource_samples.sample_index AS sampleIndex,
        resource_samples.sampled_at AS sampledAt,
        resource_samples.main_pid AS mainPid,
        resource_samples.process_count AS processCount,
        resource_samples.main_cpu_percent AS mainCpuPercent,
        resource_samples.total_cpu_percent AS totalCpuPercent,
        resource_samples.main_memory_mb AS mainMemoryMb,
        resource_samples.total_memory_mb AS totalMemoryMb,
        resource_samples.interval_ms AS intervalMs
      FROM resource_samples
      INNER JOIN test_runs ON test_runs.id = resource_samples.run_id
      ${sessionId ? "WHERE test_runs.run_session_id = ?" : ""}
      ORDER BY resource_samples.sampled_at ASC, resource_samples.sample_index ASC
    `).all(...(sessionId ? [sessionId] : [])) as Array<Record<string, string | number>>;
    const firstSampledAtByRunId = new Map<string, number>();
    for (const row of rows) {
      const runId = String(row.runId);
      const sampledAtMs = new Date(String(row.sampledAt)).getTime();
      const current = firstSampledAtByRunId.get(runId);
      if (Number.isFinite(sampledAtMs) && (current === undefined || sampledAtMs < current)) {
        firstSampledAtByRunId.set(runId, sampledAtMs);
      }
    }
    const headers = [
      "run_id",
      "run_session_id",
      "app_name",
      "app_version",
      "sample_path",
      "status",
      "sample_index",
      "sampled_at",
      "relative_sampled_at_ms",
      "main_pid",
      "process_count",
      "main_cpu_percent",
      "total_cpu_percent",
      "main_memory_mb",
      "total_memory_mb",
      "interval_ms",
    ];
    const csvRows = [headers.join(",")];
    for (const row of rows) {
      const sampledAtMs = new Date(String(row.sampledAt)).getTime();
      const firstSampledAtMs = firstSampledAtByRunId.get(String(row.runId));
      const relativeSampledAtMs = Number.isFinite(sampledAtMs) && firstSampledAtMs !== undefined
        ? Math.max(0, sampledAtMs - firstSampledAtMs)
        : "";
      const line = [
        row.runId,
        row.runSessionId,
        row.appName,
        row.appVersion ?? "",
        row.samplePath,
        row.status,
        row.sampleIndex,
        row.sampledAt,
        relativeSampledAtMs,
        row.mainPid,
        row.processCount,
        row.mainCpuPercent,
        row.totalCpuPercent,
        row.mainMemoryMb,
        row.totalMemoryMb,
        row.intervalMs,
      ].map((value) => `"${String(value).replaceAll(`"`, `""`)}"`).join(",");
      csvRows.push(line);
    }
    return csvRows.join("\n");
  }

  exportResourceSummaryCsv(sessionId?: string): string {
    const rows = this.db.prepare(`
      SELECT
        id AS runId,
        run_session_id AS runSessionId,
        app_name AS appName,
        app_version AS appVersion,
        sample_path AS samplePath,
        status,
        total_run_ms AS totalRunMs,
        average_cpu_percent AS averageCpuPercent,
        peak_cpu_percent AS peakCpuPercent,
        average_memory_mb AS averageMemoryMb,
        peak_memory_mb AS peakMemoryMb
      FROM test_runs
      ${sessionId ? "WHERE run_session_id = ?" : ""}
      ORDER BY created_at ASC
    `).all(...(sessionId ? [sessionId] : [])) as Array<Record<string, string | number | null>>;
    const samplingIntervalByRunIdRows = this.db.prepare(`
      SELECT
        run_id AS runId,
        MIN(interval_ms) AS samplingIntervalMs
      FROM resource_samples
      GROUP BY run_id
    `).all() as Array<{ runId: string; samplingIntervalMs: number | null }>;
    const samplingIntervalByRunId = new Map(
      samplingIntervalByRunIdRows.map((row) => [row.runId, row.samplingIntervalMs]),
    );
    const headers = [
      "run_id",
      "run_session_id",
      "app_name",
      "app_version",
      "sample_path",
      "status",
      "total_run_ms",
      "sampling_interval_ms",
      "average_cpu_percent",
      "peak_cpu_percent",
      "average_memory_mb",
      "peak_memory_mb",
    ];
    const csvRows = [headers.join(",")];
    for (const row of rows) {
      const line = [
        row.runId,
        row.runSessionId,
        row.appName,
        row.appVersion ?? "",
        row.samplePath,
        row.status,
        row.totalRunMs ?? "",
        samplingIntervalByRunId.get(String(row.runId)) ?? "",
        row.averageCpuPercent ?? "",
        row.peakCpuPercent ?? "",
        row.averageMemoryMb ?? "",
        row.peakMemoryMb ?? "",
      ].map((value) => `"${String(value).replaceAll(`"`, `""`)}"`).join(",");
      csvRows.push(line);
    }
    return csvRows.join("\n");
  }

  importCsv(
    csvText: string,
    sourcePath: string,
    configSnapshot: AppConfig,
    permissionSnapshot: PermissionSnapshot[],
    deviceSnapshot: AudioDevice[],
  ): CsvImportSummary {
    const importedRows = normalizeImportedRows(csvText).sort((left, right) => (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    ));
    if (!importedRows.length) {
      throw new Error("CSV 里没有可导入的结果。");
    }

    const sessionId = `import-${nanoid(8)}`;
    const sampleIds = new Map<string, string>();
    const appIds = new Map<string, string>();
    const importStartedAtMs = Date.now();
    const importedCreatedAts = importedRows.map((_, index) => new Date(importStartedAtMs + index * 1000).toISOString());
    const startedAt = importedCreatedAts[0]!;
    const finishedAt = importedCreatedAts[importedCreatedAts.length - 1]!;

    for (const row of importedRows) {
      if (!appIds.has(row.appName)) {
        appIds.set(row.appName, `imported-app-${nanoid(8)}`);
      }
      if (!sampleIds.has(row.samplePath)) {
        sampleIds.set(row.samplePath, `imported-sample-${nanoid(8)}`);
      }
    }

    this.createSession({
      id: sessionId,
      startedAt,
      finishedAt,
      selectedAppIds: [...appIds.values()],
      selectedSampleIds: [...sampleIds.values()],
      permissionSnapshot,
      deviceSnapshot,
      configSnapshot,
      status: importedRows.some((row) => row.status === "failed")
        ? "failed"
        : importedRows.some((row) => row.status === "cancelled")
          ? "cancelled"
          : "completed",
    });

    for (const [index, row] of importedRows.entries()) {
      const samplePath = row.samplePath;
      this.insertRun({
        id: `imported-run-${nanoid(10)}`,
        runSessionId: sessionId,
        appId: appIds.get(row.appName)!,
        appName: row.appName,
        appVersion: row.appVersion,
        sampleId: sampleIds.get(samplePath)!,
        samplePath,
        status: row.status,
        phase: phaseFromImportedStatus(row.status),
        failureCategory: row.failureCategory as TestRunRecord["failureCategory"],
        failureReason: row.failureReason ?? (row.status === "failed" ? "Imported from CSV" : undefined),
        rawText: row.rawText,
        normalizedText: row.rawText,
        triggerStopToFirstCharMs: row.triggerStopToFirstCharMs,
        triggerStopToFinalTextMs: row.triggerStopToFinalTextMs,
        inputEventCount: 0,
        finalTextLength: row.finalTextLength,
        createdAt: importedCreatedAts[index]!,
        timeline: [],
      });
    }

    return {
      sessionId,
      importedCount: importedRows.length,
      appCount: appIds.size,
      startedAt,
      finishedAt,
      sourcePath,
    };
  }

  close(): void {
    this.db.close();
  }
}
