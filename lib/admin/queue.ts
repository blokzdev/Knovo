import type { Status } from "./labels";

// An open directive is "actionable" — it enters the Editor's queue AND the board's Awaiting-Editor
// lane — when it carries an action OR the publish-after flag (a plain note is a human record). This
// is the single predicate shared by the worker queue route (app/api/worker/queue) and the board page
// (app/admin/queue) so the two can never drift on "what the Editor will process." (action is widened
// to string|null so both the route's row type and the board's typed directive satisfy it.)
export function isActionableDirective(d: { action: string | null; publish_after: boolean }): boolean {
  return d.action !== null || d.publish_after;
}

// The editorial Queue is a *view over the lifecycle*, not a new status: artifacts flow through lanes
// by the stage they're in, and the Editor's open-directive queue is surfaced as its own lane so the
// human↔AI handoff is visible. Pure grouping here (unit-tested); the page renders lanes + actions.

export type QueueLaneKey = "incoming" | "in_review" | "ready";

// Which lifecycle statuses fall in each artifact lane. (published/rejected/archived leave the active
// queue — they live in the Library.) needs_review + changes_requested share the "in review" lane.
export const LANE_STATUSES: Record<QueueLaneKey, Status[]> = {
  incoming: ["draft"],
  in_review: ["needs_review", "changes_requested"],
  ready: ["approved"],
};

export const LANE_META: Record<QueueLaneKey, { title: string; hint: string; icon: string }> = {
  incoming: { title: "Incoming", hint: "Scout drafts · awaiting triage", icon: "inbox" },
  in_review: { title: "In review", hint: "you're reviewing / iterating", icon: "review" },
  ready: { title: "Ready to publish", hint: "approved · one click to go live", icon: "ready" },
};

export const LANE_ORDER: QueueLaneKey[] = ["incoming", "in_review", "ready"];

const STATUS_LANE: Partial<Record<Status, QueueLaneKey>> = (() => {
  const m: Partial<Record<Status, QueueLaneKey>> = {};
  for (const lane of LANE_ORDER) for (const s of LANE_STATUSES[lane]) m[s] = lane;
  return m;
})();

export function laneFor(status: Status): QueueLaneKey | null {
  return STATUS_LANE[status] ?? null;
}

// Split active artifacts into the three artifact lanes, preserving input order within each lane.
// (Directives — the "Awaiting Editor" lane — come from a separate source and aren't grouped here.)
export function splitArtifactsIntoLanes<T extends { status: Status }>(
  artifacts: T[],
): Record<QueueLaneKey, T[]> {
  const lanes: Record<QueueLaneKey, T[]> = { incoming: [], in_review: [], ready: [] };
  for (const a of artifacts) {
    const lane = laneFor(a.status);
    if (lane) lanes[lane].push(a);
  }
  return lanes;
}
