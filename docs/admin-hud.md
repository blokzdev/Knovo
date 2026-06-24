# Admin HUD — activity system

The admin HUD is the control surface for the autonomous editorial team. This doc is the plan of
record for the **activity-elevation pass** (2026-06-24): a shared, mobile-first system that turns the
raw audit/directive/revision data into legible, actionable activity across every admin surface.

## Shared activity components (`components/admin/activity/`)
- **ActorBadge** — `worker:<id>` / `admin:<uuid>` / system → icon + human label + tone. Admin uuids
  resolve to names via a server-injected profiles map (`lib/admin/profiles.resolveActorProfiles`);
  the signed-in admin renders as **You**. Server-safe (no client query).
- **ActionChip** — an audit/activity action token → human label + icon + tone (`describeAction`).
- **DetailRenderer** — formats `audit_log.detail` (status arrow, quoted reason, note, changed-field
  pills) via the typed `parseAuditDetail`.
- **ActivityRow / ActivityFeed** — the one canonical row (mobile-first: chips/detail flow on top,
  relative time drops to its own line on <sm and never wraps) + a divide-y list with empty state.
- **RunGroup** — a collapsible header for a dispatch *run*: worker + status + action count +
  **Open session ↗** + relative time, over the activity correlated to it.

The vocabulary is pure + tested in `lib/admin/activity.ts` (`parseActor`, `describeAction`,
`parseAuditDetail`, `groupActivityIntoRuns`) and `lib/admin/labels.ts` (`TONES`, `RUN_STATUS_META`,
`WORKER_META` tones). Unknown action tokens degrade to a neutral chip showing the raw token, so new
verbs never crash the feed.

## Runs + session links (`routine_runs`, migration `0010`)
A **run** is created when an admin dispatches a worker from the HUD (`dispatchWorker`): it records the
worker, who dispatched it, the optional artifact scope, and — once `fireWorker` returns — the Claude
**session id + deep link**. The dispatch's audit row carries `run_id` explicitly; the worker's
subsequent audit rows are correlated to the run at **read time** by `groupActivityIntoRuns`
(worker + 6h window). This needs **no worker-prompt or worker-API change**. Session links surface in
the HUD feed (RunGroup), the artifact Audit tab, and `/admin/settings` → Recent runs.

> Scope wall: `routine_runs` stores only what dispatch already knows (session id/url, status, error) —
> not live worker telemetry. Precise per-action correlation (explicit `run_id` on every worker write)
> is a deferred upgrade (see BACKLOG).

## Interactive actions
- **Revision diff + restore** (`RevisionList` + `restoreRevision`): the Revisions tab shows each
  version (author, vN of M, note) and a "Compare & restore" dialog with a color-coded unified diff
  (`lib/admin/doc-text`). Restore is governed like any admin write — it re-validates the revision doc
  against the zod schema, snapshots the current doc first (recoverable), and audits `restore_revision`.
  It never changes public status. This is the first admin manual-edit capability.
- **Directives** — resolve/dismiss inline; `DirectiveBadges` + `ActorBadge` for raised_by/addressed_by.

## Surfaces touched
HUD home (run-grouped feed) · artifact review page (Directives/Revisions/Audit + diff/restore) ·
library (last-actor badge, responsive search) · moderation (status icons, wrap) · settings (Recent
runs). All verified responsive at 375px (rows stack, no viewport overflow) and in light + dark.

## Deploy note
Migration `0010` must be applied to the hosted dev + prod Supabase (`supabase db push`) for runs to
persist; `dispatchWorker` is resilient to its absence (dispatch still works, runs aren't tracked).
