-- 0010 — routine_runs: persist each dashboard worker dispatch (incl. its Claude session) so the
-- admin HUD can group a worker's activity into "runs" and open the originating Claude session.
--
-- A run is created when an admin dispatches a worker from the HUD (lib/admin/actions.dispatchWorker):
-- we record which worker, who dispatched it, the optional artifact scope, and — once fireWorker
-- returns — the Claude session id + deep link. Worker activity (audit_log rows authored by
-- worker:<id>) is correlated to a run at READ time by (worker, time window); the dispatch's own
-- audit row also carries run_id explicitly. We deliberately store only what dispatch already knows
-- (session id/url, status, error) — NOT live worker telemetry (scope wall, CLAUDE.md invariant #6).

create table public.routine_runs (
  id uuid primary key default gen_random_uuid(),
  worker text not null,                       -- 'scout' | 'editor' | 'keeper' (mirrors routine_configs.worker)
  status text not null default 'dispatched',  -- 'dispatched' | 'failed' (no completion callback beyond dispatch)
  session_id text,                            -- claude_code_session_id from fireWorker
  session_url text,                           -- claude_code_session_url (surfaced as "Open session")
  artifact_id uuid references public.artifacts(id) on delete set null,  -- scope when dispatched from /admin/a/[id]
  dispatched_by uuid references public.profiles(id),
  text_context text,                          -- the freeform nudge passed to fireWorker (truncated)
  error text,                                 -- failure detail when fireWorker throws
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index routine_runs_worker_started_idx on public.routine_runs (worker, started_at desc);
create index routine_runs_artifact_idx on public.routine_runs (artifact_id);

-- Correlate audit rows to a run. Set explicitly for the dispatch event; worker rows are grouped at
-- read time by worker + timestamp, so this stays null for them (future: explicit per-action run_id).
alter table public.audit_log add column if not exists run_id uuid references public.routine_runs(id) on delete set null;
create index if not exists audit_log_run_idx on public.audit_log (run_id);

-- updated_at-style stamp on close-out is handled in the action; no trigger needed here.

alter table public.routine_runs enable row level security;

-- Admin-only read (the HUD reads via the signed-in admin's RLS session). Writes happen via the
-- service-role client inside the admin server action, which bypasses RLS.
create policy routine_runs_admin_read on public.routine_runs
  for select to authenticated using (public.is_admin());

-- Grants (match 0004/0009 style): service_role drives the governed writes; authenticated reads via RLS.
grant all on public.routine_runs to service_role;
grant select on public.routine_runs to authenticated;
