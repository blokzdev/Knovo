-- 0004_editorial_workflow.sql — pivot to a governed autonomous editorial team.
-- Expands the lifecycle, adds admin directives/comments, revision history, series, and an
-- audit log; switches all writes to soft-delete. Worker routines no longer connect to the DB
-- as a role — they go through the governed Knovo API (service-role, server-only), which is the
-- trusted enforcer of the slot-schema / transitions / audit. So the old least-privilege
-- `knovo_routine` DB role from 0001 is now unused and is dropped here.
-- See foundation/data-model.md, security-and-privacy.md, agent-architecture.md (amended).

-- ── Expanded status lifecycle ────────────────────────────────────────────────
-- draft → needs_review ⇄ changes_requested → approved → published; any → archived;
-- rejected stays terminal (still feeds dedup). New values are not referenced elsewhere in
-- this migration (avoids the "unsafe use of new enum value" in-transaction restriction).
alter type public.artifact_status add value if not exists 'needs_review';
alter type public.artifact_status add value if not exists 'changes_requested';
alter type public.artifact_status add value if not exists 'approved';
alter type public.artifact_status add value if not exists 'archived';

-- ── New enums ────────────────────────────────────────────────────────────────
-- A directive is two axes: WHAT to do (action) × whether to PUBLISH after (publish_after),
-- plus a free-text note and optional advanced params. `revise` covers update/enhance on a
-- draft or a live article; null action = a plain note (or, with publish_after, "publish as-is").
create type public.directive_action as enum (
  'revise',         -- change content per the note (edit/update/enhance/retitle)
  'expand',         -- substantially deepen/extend
  'condense',       -- tighten without losing substance
  'reverify',       -- re-check primary sources (retraction/update); refresh provenance
  'split',          -- break one over-broad artifact into several focused drafts
  'make_series',    -- create a series (collection) from artifacts
  'add_to_series',  -- attach artifacts to an existing series
  'archive'         -- remove from public, keep in workflow
);
create type public.comment_status as enum ('open', 'addressed', 'dismissed');

-- ── series (collections) ─────────────────────────────────────────────────────
create table public.series (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  summary    text,
  created_at timestamptz not null default now()
);

-- ── artifacts: soft-delete, series membership, last actor ────────────────────
alter table public.artifacts
  add column deleted_at   timestamptz,
  add column series_id    uuid references public.series(id) on delete set null,
  add column series_order int,
  add column last_worker  text;
create index artifacts_series_idx  on public.artifacts(series_id);
create index artifacts_deleted_idx on public.artifacts(deleted_at);

-- ── comments (admin editorial signals — NOT public social comments) ──────────
create table public.comments (
  id            uuid primary key default gen_random_uuid(),
  artifact_id   uuid not null references public.artifacts(id) on delete cascade,
  author        uuid references auth.users(id),         -- admin author; null for system
  note          text,                                   -- natural-language instruction
  action        public.directive_action,                -- optional structured cue (null = note)
  publish_after boolean not null default false,          -- "...and publish when done"
  options       jsonb,                                   -- optional advanced params (future)
  status        public.comment_status not null default 'open',
  created_at    timestamptz not null default now(),
  addressed_at  timestamptz,
  addressed_by  text                                    -- worker that handled it
);
create index comments_artifact_idx on public.comments(artifact_id);
-- "Actionable" = open AND (has an action OR is flagged publish-after). Plain notes are excluded
-- from the worker queue but kept as a human record.
create index comments_actionable_idx on public.comments(artifact_id)
  where status = 'open' and (action is not null or publish_after);

-- ── revisions (version history → recoverability) ─────────────────────────────
create table public.revisions (
  id             uuid primary key default gen_random_uuid(),
  artifact_id    uuid not null references public.artifacts(id) on delete cascade,
  schema_version int not null,
  doc            jsonb not null,
  title          text,
  summary        text,
  note           text,
  created_by     text,                                  -- 'worker:editor' | 'admin:<uid>'
  created_at     timestamptz not null default now()
);
create index revisions_artifact_idx on public.revisions(artifact_id, created_at desc);

-- ── audit_log (who/what changed; required once workers can publish) ──────────
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null,                            -- 'worker:scout' | 'admin:<uid>'
  action      text not null,
  artifact_id uuid references public.artifacts(id) on delete set null,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_artifact_idx on public.audit_log(artifact_id);
create index audit_log_created_idx on public.audit_log(created_at desc);

-- ── Drop the now-unused least-privilege routine role (workers use the API) ───
drop policy if exists artifacts_routine_read          on public.artifacts;
drop policy if exists artifacts_routine_insert         on public.artifacts;
drop policy if exists sources_routine_read             on public.sources;
drop policy if exists sources_routine_insert           on public.sources;
drop policy if exists artifact_sources_routine_read    on public.artifact_sources;
drop policy if exists artifact_sources_routine_insert  on public.artifact_sources;
-- Revoke the grants 0001 gave knovo_routine (the only thing blocking DROP ROLE), then drop it.
-- We avoid `drop owned by` / `grant ... to current_user`: those need the migrating role to be a
-- member of knovo_routine, which it isn't on Supabase — and that path drops the SQL-editor
-- connection. Explicit REVOKE only needs table/schema ownership, which the migrating role has.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'knovo_routine') then
    revoke all on all tables in schema public from knovo_routine;
    revoke all on schema public from knovo_routine;
    drop role knovo_routine;
  end if;
end $$;

-- ── Public read excludes soft-deleted rows ───────────────────────────────────
drop policy if exists artifacts_public_read on public.artifacts;
create policy artifacts_public_read on public.artifacts
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists sources_public_read on public.sources;
create policy sources_public_read on public.sources
  for select to anon, authenticated using (
    exists (
      select 1 from public.artifact_sources xs
      join public.artifacts a on a.id = xs.artifact_id
      where xs.source_id = sources.id
        and a.status = 'published' and a.deleted_at is null
    )
  );

drop policy if exists artifact_sources_public_read on public.artifact_sources;
create policy artifact_sources_public_read on public.artifact_sources
  for select to anon, authenticated using (
    exists (
      select 1 from public.artifacts a
      where a.id = artifact_sources.artifact_id
        and a.status = 'published' and a.deleted_at is null
    )
  );

-- ── RLS for the new tables ───────────────────────────────────────────────────
alter table public.series     enable row level security;
alter table public.comments   enable row level security;
alter table public.revisions  enable row level security;
alter table public.audit_log  enable row level security;

-- series: public can read (for future public series pages); admin writes.
grant select on public.series to anon, authenticated;
create policy series_public_read on public.series
  for select to anon, authenticated using (true);
create policy series_admin_write on public.series
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- comments / revisions / audit_log: admin-only (no anon). Workers reach them via the API
-- (service-role), which bypasses RLS.
grant select, insert, update on public.comments to authenticated;
create policy comments_admin_all on public.comments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.revisions to authenticated;
create policy revisions_admin_read on public.revisions
  for select to authenticated using (public.is_admin());

grant select on public.audit_log to authenticated;
create policy audit_log_admin_read on public.audit_log
  for select to authenticated using (public.is_admin());

-- ── Explicit grants for the trusted server (service-role) ────────────────────
-- The Knovo API authenticates as service_role (bypasses RLS) and is the only worker write
-- path. Grant it the privileges it needs on the editorial tables.
grant all on public.series, public.comments, public.revisions, public.audit_log
  to service_role;
