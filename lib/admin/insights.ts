// Pure, DB-agnostic aggregation for the admin Insights view (Phase 2 observability). Takes the raw
// audit_log + routine_runs rows the page reads via admin RLS and folds them into a view model:
// pipeline flow, the dedup/validation **drops** (logged by the worker API — see
// app/api/worker/artifacts/route.ts), per-day throughput, median time-to-publish, and run health.
// Kept pure + `now`-injectable (no Date.now()) so it's deterministic and unit-tested.

const DAY_MS = 24 * 60 * 60 * 1000;

// The only audit_log fields the aggregation reads (a subset of the activity ActivityEvent).
export type InsightEvent = {
  action: string;
  artifact_id: string | null;
  created_at: string;
};

// The only routine_runs fields the aggregation reads.
export type InsightRun = { status: string; worker: string };

export type FlowCounts = {
  drafted: number; // create_draft
  review: number; // status:needs_review
  published: number; // status:published
  rejected: number; // status:rejected
  archived: number; // status:archived
  dedupSkipped: number; // dedup_suppressed (duplicate/rejected primary source)
  validationRejected: number; // validation_rejected (zod)
  flags: number; // flag:*
};

export type DayBucket = { date: string; drafts: number; publishes: number };

export type RunStats = {
  total: number;
  dispatched: number;
  failed: number;
  successRate: number | null; // dispatched / total, null when no runs
};

export type InsightsSummary = {
  flow: FlowCounts;
  throughput: DayBucket[]; // oldest → newest, length `days`
  medianTimeToPublishMs: number | null;
  runs: RunStats;
  createAttempts: number; // drafted + dedupSkipped + validationRejected (everything Scout tried)
  dedupRate: number | null; // dedupSkipped / createAttempts
  validationRate: number | null; // validationRejected / createAttempts
};

const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

// Tally the pipeline flow + drops from a window of audit events.
export function flowCounts(events: InsightEvent[]): FlowCounts {
  const c: FlowCounts = {
    drafted: 0,
    review: 0,
    published: 0,
    rejected: 0,
    archived: 0,
    dedupSkipped: 0,
    validationRejected: 0,
    flags: 0,
  };
  for (const e of events) {
    const a = e.action;
    if (a === "create_draft") c.drafted++;
    else if (a === "status:needs_review") c.review++;
    else if (a === "status:published") c.published++;
    else if (a === "status:rejected") c.rejected++;
    else if (a === "status:archived") c.archived++;
    else if (a === "dedup_suppressed") c.dedupSkipped++;
    else if (a === "validation_rejected") c.validationRejected++;
    else if (a.startsWith("flag:")) c.flags++;
  }
  return c;
}

// Per-day drafts + publishes for the last `days` calendar days (UTC), oldest → newest.
export function bucketByDay(events: InsightEvent[], days: number, now: number): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  const order: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(now - i * DAY_MS);
    const b = { date: key, drafts: 0, publishes: 0 };
    buckets.set(key, b);
    order.push(key);
  }
  for (const e of events) {
    const t = Date.parse(e.created_at);
    if (Number.isNaN(t)) continue;
    const b = buckets.get(dayKey(t));
    if (!b) continue; // outside the window
    if (e.action === "create_draft") b.drafts++;
    else if (e.action === "status:published") b.publishes++;
  }
  return order.map((k) => buckets.get(k)!);
}

// Median draft→first-publish latency, pairing each artifact's earliest create_draft with its
// earliest status:published within the supplied events. Artifacts missing either side are excluded.
export function medianTimeToPublishMs(events: InsightEvent[]): number | null {
  const byArtifact = new Map<string, { draft?: number; publish?: number }>();
  for (const e of events) {
    if (!e.artifact_id) continue;
    const t = Date.parse(e.created_at);
    if (Number.isNaN(t)) continue;
    const entry = byArtifact.get(e.artifact_id) ?? {};
    if (e.action === "create_draft") entry.draft = Math.min(entry.draft ?? Infinity, t);
    else if (e.action === "status:published") entry.publish = Math.min(entry.publish ?? Infinity, t);
    byArtifact.set(e.artifact_id, entry);
  }
  const durations: number[] = [];
  for (const { draft, publish } of byArtifact.values()) {
    if (draft !== undefined && publish !== undefined && publish >= draft) durations.push(publish - draft);
  }
  if (durations.length === 0) return null;
  durations.sort((a, b) => a - b);
  const mid = Math.floor(durations.length / 2);
  return durations.length % 2 === 0 ? Math.round((durations[mid - 1] + durations[mid]) / 2) : durations[mid];
}

export function runStats(runs: InsightRun[]): RunStats {
  let dispatched = 0;
  let failed = 0;
  for (const r of runs) {
    if (r.status === "failed") failed++;
    else dispatched++;
  }
  const total = runs.length;
  return { total, dispatched, failed, successRate: total === 0 ? null : dispatched / total };
}

export function summarize(
  events: InsightEvent[],
  runs: InsightRun[],
  days: number,
  now: number,
): InsightsSummary {
  const flow = flowCounts(events);
  const createAttempts = flow.drafted + flow.dedupSkipped + flow.validationRejected;
  return {
    flow,
    throughput: bucketByDay(events, days, now),
    medianTimeToPublishMs: medianTimeToPublishMs(events),
    runs: runStats(runs),
    createAttempts,
    dedupRate: createAttempts === 0 ? null : flow.dedupSkipped / createAttempts,
    validationRate: createAttempts === 0 ? null : flow.validationRejected / createAttempts,
  };
}

// Humanize a positive duration as a compact "3d" / "5h" / "45m" / "30s" label (largest unit only).
export function formatDurationShort(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

// Render a 0..1 rate as a rounded percentage string ("12%"), or "—" when there's no denominator.
export function formatPct(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}
