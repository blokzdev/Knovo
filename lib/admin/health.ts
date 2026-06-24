// Pure health/attention logic for the HUD. Once the loop runs unattended on a cadence, the admin
// shouldn't have to inspect every surface — this turns the data the dashboard already reads into a
// short list of "things that need you": drafts sitting past a review SLA, a worker whose last
// dispatch failed, and dedup/validation rates that have spiked. Kept pure + `now`-injectable so it's
// unit-tested; the component renders the alerts. Thresholds live here as the single source of truth.

const DAY_MS = 24 * 60 * 60 * 1000;

export const STALE_REVIEW_DAYS = 3; // a draft awaiting review longer than this is overdue
export const STALE_CRITICAL_DAYS = 7; // …and escalates past this
const RATE_MIN_SAMPLE = 4; // don't alert on rates from a tiny number of attempts (noise)
export const VALIDATION_RATE_WARN = 0.25; // >25% of drafts failing zod → generation likely off
export const DEDUP_RATE_WARN = 0.5; // >50% of drafts duplicate → discovery/ranking churning

export type AlertKind = "stale_review" | "run_failed" | "validation_spike" | "dedup_spike";
export type Severity = "warn" | "critical";
export type HealthAlert = {
  kind: AlertKind;
  severity: Severity;
  title: string;
  detail: string;
  href: string;
};

export type HealthInput = {
  now: number;
  // needs_review / changes_requested items, with when they last changed.
  reviewItems: { updated_at: string }[];
  // workers whose LATEST run failed (an older failure that's since recovered doesn't count).
  failedWorkers: string[];
  // counts over the observation window (e.g. last 14d), to derive drop rates.
  createAttempts: number;
  dedupSkipped: number;
  validationRejected: number;
};

const WORKER_LABEL: Record<string, string> = { scout: "Scout", editor: "Editor", keeper: "Keeper" };

function dayCount(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

// How long an item has waited, in whole days (0 if in the future / unparseable).
export function waitDays(updatedAt: string, now: number): number {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, dayCount(now - t));
}

export function isOverdue(updatedAt: string, now: number): boolean {
  return waitDays(updatedAt, now) >= STALE_REVIEW_DAYS;
}

const SEV_ORDER: Record<Severity, number> = { critical: 0, warn: 1 };

// Build the attention list (most severe first). Empty array = nothing needs the admin.
export function computeHealth(input: HealthInput): HealthAlert[] {
  const alerts: HealthAlert[] = [];

  // 1. Drafts overdue for review.
  const overdue = input.reviewItems
    .map((r) => waitDays(r.updated_at, input.now))
    .filter((d) => d >= STALE_REVIEW_DAYS)
    .sort((a, b) => b - a);
  if (overdue.length > 0) {
    const oldest = overdue[0];
    alerts.push({
      kind: "stale_review",
      severity: oldest >= STALE_CRITICAL_DAYS ? "critical" : "warn",
      title: `${overdue.length} draft${overdue.length > 1 ? "s" : ""} awaiting review`,
      detail: `Oldest has waited ${oldest} day${oldest > 1 ? "s" : ""}.`,
      href: "/admin/library?status=needs_review",
    });
  }

  // 2. A worker's last dispatch failed.
  for (const w of input.failedWorkers) {
    const label = WORKER_LABEL[w] ?? w;
    alerts.push({
      kind: "run_failed",
      severity: "warn",
      title: `${label}'s last run failed`,
      detail: "Check the trigger configuration and retry.",
      href: `/admin/settings?worker=${w}`,
    });
  }

  // 3. Drop-rate spikes (only above a minimum sample, to avoid noise on a handful of attempts).
  if (input.createAttempts >= RATE_MIN_SAMPLE) {
    const validationRate = input.validationRejected / input.createAttempts;
    const dedupRate = input.dedupSkipped / input.createAttempts;
    if (validationRate > VALIDATION_RATE_WARN) {
      alerts.push({
        kind: "validation_spike",
        severity: "warn",
        title: "High validation-failure rate",
        detail: `${Math.round(validationRate * 100)}% of recent drafts failed schema validation.`,
        href: "/admin/insights",
      });
    }
    if (dedupRate > DEDUP_RATE_WARN) {
      alerts.push({
        kind: "dedup_spike",
        severity: "warn",
        title: "High duplicate rate",
        detail: `${Math.round(dedupRate * 100)}% of recent drafts were duplicates.`,
        href: "/admin/insights",
      });
    }
  }

  return alerts.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}
