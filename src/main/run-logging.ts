import { timelineDetail, timelineTitle, safeTimelinePayload, timelineTailName } from "../shared/timeline";
import type { RunEventRecord, TestRunRecord } from "../shared/types";

function compactJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "\"<unserializable>\"";
  }
}

export function formatTimelineLog(record: RunEventRecord, firstTsByRunId: Map<string, number>): string {
  const payload = safeTimelinePayload(record);
  const firstTs = firstTsByRunId.get(record.runId) ?? record.tsMs;
  if (!firstTsByRunId.has(record.runId)) {
    firstTsByRunId.set(record.runId, firstTs);
  }
  const offsetMs = Math.max(0, Math.round(record.tsMs - firstTs));
  const app = payload.app ? ` app=${String(payload.app)}` : "";
  const sample = payload.sample ? ` sample=${timelineTailName(payload.sample)}` : "";
  return [
    `[timeline] run=${record.runId}`,
    `t=+${offsetMs}ms`,
    `event=${record.eventType}`,
    `title=${timelineTitle(record)}`,
    `detail=${timelineDetail(record)}`,
    `${app}${sample}`.trim(),
    `payload=${compactJson(payload)}`,
  ].filter(Boolean).join(" | ");
}

export function formatResultLog(record: TestRunRecord): string {
  const base = [
    `[result] run=${record.id}`,
    `session=${record.runSessionId}`,
    `status=${record.status}`,
    `phase=${record.phase}`,
    `app=${record.appName}`,
    `sample=${timelineTailName(record.samplePath)}`,
    `events=${record.timeline.length}`,
    `text_len=${record.finalTextLength}`,
  ];
  if (record.triggerStopToFirstCharMs !== undefined) {
    base.push(`first_char_ms=${record.triggerStopToFirstCharMs}`);
  }
  if (record.triggerStopToFinalTextMs !== undefined) {
    base.push(`final_text_ms=${record.triggerStopToFinalTextMs}`);
  }
  if (record.failureReason) {
    base.push(`failure=${record.failureReason}`);
  }
  return base.join(" | ");
}
