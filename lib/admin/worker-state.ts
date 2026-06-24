import type { ConfigSource } from "./settings";
import type { Tone, WorkerId } from "./labels";

// Pure derivation of a dispatch worker's dashboard status, so the HUD cards can show whether a
// routine is live, not-yet-configured, or broken — and gracefully gate the dispatch button instead
// of firing into a guaranteed error toast. Inputs are what the dashboard already reads: the routine's
// config `source` (db/env/none) + whether its fire URL is valid (both from getRoutineSettings, which
// validates db AND env server-side) + its latest routine_runs row. Kept pure + presentation-agnostic
// (no React, no Date, no env access) so it's unit-tested; the component maps state → visuals.

export type WorkerState = "ready" | "setup" | "issue";

// The slice of a routine_runs row the derivation needs (latest run for the worker).
export type LastRun = {
  status: string;
  started_at: string;
  session_url: string | null;
  error?: string | null;
} | null;

export type WorkerStatusInput = { source: ConfigSource; fireUrlValid: boolean };

export type WorkerStatus = {
  state: WorkerState;
  active: boolean; // ready AND a prior run exists (it has actually run, not just wired)
  canDispatch: boolean; // whether firing could plausibly succeed (false → offer "Fix" instead)
  source: ConfigSource;
  lastRunAt: string | null;
  sessionUrl: string | null;
  reason: string | null; // human-readable detail for the `issue` state
};

// Derive the status. Precedence: not-configured → structurally-broken trigger (invalid URL, can NEVER
// dispatch) → failed last dispatch (transient — retry is legitimate) → healthy. We deliberately can't
// see deeper health (a configured routine whose worker token is missing still "dispatches"); that
// needs the worker to report back (logged as a follow-on in BACKLOG.md).
export function deriveWorkerStatus(setting: WorkerStatusInput, lastRun: LastRun): WorkerStatus {
  const common = {
    source: setting.source,
    lastRunAt: lastRun?.started_at ?? null,
    sessionUrl: lastRun?.session_url ?? null,
  };

  if (setting.source === "none") {
    return { state: "setup", active: false, canDispatch: false, reason: null, ...common };
  }
  // Configured but the resolved fire URL isn't a valid Claude API URL — dispatch would refuse to send
  // the token (fireWorker's isAllowedFireUrl guard), so it can never succeed until fixed.
  if (!setting.fireUrlValid) {
    return { state: "issue", active: false, canDispatch: false, reason: "Fire URL isn't a valid Claude API URL.", ...common };
  }
  // The most recent dashboard dispatch failed (e.g. the trigger 404'd or the API was unreachable).
  // The config looks valid, so a retry is legitimate (canDispatch stays true).
  if (lastRun && lastRun.status === "failed") {
    return { state: "issue", active: false, canDispatch: true, reason: lastRun.error?.trim() || "Last dispatch failed.", ...common };
  }
  return { state: "ready", active: !!lastRun, canDispatch: true, reason: null, ...common };
}

// Pill label + tone + icon key per state. `ready` splits into Active (has run) / Ready (wired, idle)
// at the component layer. Tones come from the shared HUD palette (lib/admin/labels TONES).
export type WorkerStateIcon = "ready" | "setup" | "issue";
export const WORKER_STATE_META: Record<WorkerState, { label: string; tone: Tone; icon: WorkerStateIcon }> = {
  ready: { label: "Ready", tone: "emerald", icon: "ready" },
  setup: { label: "Needs setup", tone: "zinc", icon: "setup" },
  issue: { label: "Issue", tone: "red", icon: "issue" },
};

// The pill label, accounting for the active/idle split within `ready`.
export function statusLabel(status: WorkerStatus): string {
  if (status.state === "ready") return status.active ? "Active" : "Ready";
  return WORKER_STATE_META[status.state].label;
}

// Deep link to a worker's own tab in /admin/settings (the dashboard CTAs + kebab point here).
export function settingsHref(worker: WorkerId): string {
  return `/admin/settings?worker=${worker}`;
}
