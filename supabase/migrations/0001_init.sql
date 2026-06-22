-- 0001_init.sql — Knovo foundation schema
-- Status lifecycle (draft/published/rejected), profiles + role, provenance with stable
-- source IDs + citations, dedup of seen/rejected sources, RLS, and a least-privilege
-- insert-only routine role. See foundation/data-model.md and foundation/security-and-privacy.md.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.user_role       as enum ('admin', 'viewer');
create type public.source_db       as enum ('pdb', 'chembl', 'pubmed', 'biorxiv');
create type public.artifact_status as enum ('draft', 'published', 'rejected');
create type public.source_role     as enum ('primary', 'supporting');

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ── profiles (mirrors auth.users; carries role) ──────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  role         public.user_role not null default 'viewer',
  display_name text,
  created_at   timestamptz not null default now()
);

-- Auto-create a profile on signup (security definer; bypasses RLS intentionally).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check (security definer avoids RLS recursion on profiles).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ── sources (provenance registry + dedup key) ────────────────────────────────
create table public.sources (
  id           uuid primary key default gen_random_uuid(),
  source_db    public.source_db not null,
  source_uid   text not null,             -- stable external id: PDB ID / ChEMBL ID / PMID / DOI
  url          text,
  title        text,
  retrieved_at timestamptz not null default now(),
  raw_meta     jsonb,
  unique (source_db, source_uid)          -- "already seen" key
);

-- ── artifacts (the slot-schema documents + status lifecycle) ─────────────────
create table public.artifacts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,    -- clean public URL: /a/<slug>
  title           text not null,
  summary         text,
  status          public.artifact_status not null default 'draft',
  schema_version  int  not null default 1,
  doc             jsonb not null,          -- zod-validated slot document
  created_by      uuid references auth.users(id),
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  published_at    timestamptz,
  rejected_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index artifacts_status_idx on public.artifacts(status);
create trigger artifacts_set_updated_at
  before update on public.artifacts
  for each row execute function public.set_updated_at();

-- ── artifact_sources (provenance/citation links → provenance footer) ─────────
create table public.artifact_sources (
  artifact_id   uuid not null references public.artifacts(id) on delete cascade,
  source_id     uuid not null references public.sources(id)   on delete restrict,
  role          public.source_role not null default 'primary',
  citation_text text,
  primary key (artifact_id, source_id)
);
create index artifact_sources_source_idx on public.artifact_sources(source_id);

-- ── Dedup views (security_invoker so RLS of the caller applies) ──────────────
create view public.seen_source_keys with (security_invoker = true) as
  select distinct s.source_db, s.source_uid
  from public.sources s
  join public.artifact_sources xs on xs.source_id = s.id;

create view public.rejected_source_keys with (security_invoker = true) as
  select distinct s.source_db, s.source_uid
  from public.sources s
  join public.artifact_sources xs on xs.source_id = s.id
  join public.artifacts a        on a.id = xs.artifact_id
  where a.status = 'rejected' and xs.role = 'primary';

-- ── Least-privilege routine role (insert-only; no update/delete/publish) ─────
-- NOLOGIN template role. Wiring it to a login credential the routine actually uses
-- (vs. service_role) is the remaining step documented in SETUP.md (open question).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'knovo_routine') then
    create role knovo_routine nologin;
  end if;
end $$;

grant usage on schema public to knovo_routine;
grant select, insert on public.sources          to knovo_routine;
grant select, insert on public.artifacts         to knovo_routine;
grant select, insert on public.artifact_sources  to knovo_routine;
grant select on public.seen_source_keys, public.rejected_source_keys to knovo_routine;
-- Deliberately NO update/delete granted to knovo_routine.

-- ── Explicit grants for the API roles (RLS gates actual access) ──────────────
grant select on public.artifacts, public.sources, public.artifact_sources to anon, authenticated;
grant insert, update, delete on public.artifacts, public.sources, public.artifact_sources to authenticated;
grant select, update on public.profiles to authenticated;

-- ── Row-Level Security ───────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.sources          enable row level security;
alter table public.artifacts        enable row level security;
alter table public.artifact_sources enable row level security;

-- profiles: read own (or admin reads all); only admin updates.
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_admin_update on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- artifacts: public reads published; admin full; routine inserts drafts only.
create policy artifacts_public_read on public.artifacts
  for select to anon, authenticated using (status = 'published');
create policy artifacts_admin_all on public.artifacts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy artifacts_routine_read on public.artifacts
  for select to knovo_routine using (true);
create policy artifacts_routine_insert on public.artifacts
  for insert to knovo_routine with check (status = 'draft');

-- sources: public reads those tied to a published artifact; admin all; routine rw-insert.
create policy sources_public_read on public.sources
  for select to anon, authenticated using (
    public.is_admin() or exists (
      select 1 from public.artifact_sources xs
      join public.artifacts a on a.id = xs.artifact_id
      where xs.source_id = sources.id and a.status = 'published'
    )
  );
create policy sources_admin_write on public.sources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sources_routine_read on public.sources
  for select to knovo_routine using (true);
create policy sources_routine_insert on public.sources
  for insert to knovo_routine with check (true);

-- artifact_sources: public reads those of published artifacts; admin all; routine rw-insert.
create policy artifact_sources_public_read on public.artifact_sources
  for select to anon, authenticated using (
    public.is_admin() or exists (
      select 1 from public.artifacts a
      where a.id = artifact_sources.artifact_id and a.status = 'published'
    )
  );
create policy artifact_sources_admin_write on public.artifact_sources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy artifact_sources_routine_read on public.artifact_sources
  for select to knovo_routine using (true);
create policy artifact_sources_routine_insert on public.artifact_sources
  for insert to knovo_routine with check (true);
