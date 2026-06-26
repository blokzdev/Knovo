-- 0011 — privacy-first, own-your-data audience measurement.
--
-- Records a deduped daily "view" per *published* artifact, keyed by a COOKIELESS, salted,
-- one-way visitor hash. No PII is ever stored: we never persist the IP or User-Agent, only an
-- HMAC(salt, ip+ua) hash whose salt rotates per window (7 days) and is *destroyed on rotation*,
-- so a hash becomes unlinkable once its window passes. No cookie is set in the browser (nothing
-- for a reader to decline), and no third party is involved. This answers the open Phase-2
-- validation question — "are niche practitioners finding and RETURNING to these explainers?" —
-- without tracking anyone. See foundation/security-and-privacy.md (Audience measurement).
--
-- Metrics this supports:
--   views/day       = sum(hits) per day
--   unique readers  = count(distinct visitor_hash) per day (or per window)
--   top artifacts   = group by artifact_id
--   returning reader= a visitor_hash observed on >= 2 distinct days (within a salt window)
--
-- These tables sit OUTSIDE the worker API + slot schema (like the 0005 reader tables), so the
-- worker surface and docs/routines.md are unchanged. Reads happen only via server-only,
-- service-role code (the admin Insights page); the browser gets no RLS grant, so per-visitor
-- hashes never reach a client. Designed to generalize per-tenant later (add a tenant_id
-- discriminator + composite keys); single-tenant now.

-- pgcrypto provides gen_random_bytes() + hmac(); it lives in the `extensions` schema on Supabase.
create extension if not exists pgcrypto with schema extensions;

-- --------------------------------------------------------------------------------------------
-- The rotating server-side salt (single row, id = true). Never leaves the server: only the
-- SECURITY DEFINER recorder below reads it. Rotated lazily when the time window advances; the
-- prior salt is overwritten (destroyed), severing linkability for past windows.
-- --------------------------------------------------------------------------------------------
create table public.audience_salt (
  id          boolean primary key default true,
  salt        text        not null,
  window_id   bigint      not null,                  -- floor(epoch_seconds / window_seconds)
  rotated_at  timestamptz not null default now(),
  constraint audience_salt_singleton check (id)      -- only id = true is allowed → one row
);
alter table public.audience_salt enable row level security;
-- No policies: default-deny for anon/authenticated. service_role bypasses RLS; the recorder is
-- SECURITY DEFINER and owns access regardless.

-- --------------------------------------------------------------------------------------------
-- Deduped daily views. One row per (artifact, day, visitor_hash); `hits` counts repeat visits
-- the same day so unique-readers (row count) and raw views (sum hits) are both derivable, while
-- growth stays bounded (deduped per day) and prunable past the salt window.
-- --------------------------------------------------------------------------------------------
create table public.artifact_views (
  artifact_id   uuid        not null references public.artifacts(id) on delete cascade,
  day           date        not null,
  visitor_hash  text        not null,
  hits          integer     not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  primary key (artifact_id, day, visitor_hash)
);
alter table public.artifact_views enable row level security;
-- No anon/authenticated policies: the browser never reads raw per-visitor rows. The Insights
-- page reads via the service-role client and aggregates server-side before rendering.

create index artifact_views_day_idx on public.artifact_views (day);
create index artifact_views_hash_day_idx on public.artifact_views (visitor_hash, day);

-- --------------------------------------------------------------------------------------------
-- The recorder. Called only by server-only, service-role code (lib/audience/record.ts) with the
-- request IP + User-Agent. Those are used ONLY inside this function to compute the salted hash and
-- are never stored. SECURITY DEFINER + locked search_path (matches the 0002/0003 function-security
-- posture); execute is granted to service_role only.
-- --------------------------------------------------------------------------------------------
create or replace function public.record_artifact_view(
  p_artifact_id uuid,
  p_ip          text,
  p_ua          text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_seconds constant bigint := 7 * 24 * 60 * 60;   -- 7-day salt window
  v_window_id bigint := floor(extract(epoch from now()) / v_window_seconds)::bigint;
  v_salt text;
  v_hash text;
begin
  -- Only measure live, published artifacts (never drafts / rejected / soft-deleted).
  if not exists (
    select 1 from public.artifacts
    where id = p_artifact_id and status = 'published' and deleted_at is null
  ) then
    return;
  end if;

  -- Rotate-or-read the salt atomically. A fresh random salt is generated every call but only
  -- ADOPTED when the window advances; otherwise the existing salt is kept. When the window rolls,
  -- the old salt is overwritten (destroyed) so past-window hashes can no longer be linked.
  insert into public.audience_salt (id, salt, window_id)
  values (true, encode(extensions.gen_random_bytes(32), 'hex'), v_window_id)
  on conflict (id) do update
    set salt       = case when public.audience_salt.window_id <> excluded.window_id
                          then excluded.salt else public.audience_salt.salt end,
        window_id  = excluded.window_id,
        rotated_at = case when public.audience_salt.window_id <> excluded.window_id
                          then now() else public.audience_salt.rotated_at end
  returning salt into v_salt;

  -- One-way salted hash of IP+UA. Inputs are used only here and never persisted.
  v_hash := encode(
    extensions.hmac(coalesce(p_ip, '') || E'\n' || coalesce(p_ua, ''), v_salt, 'sha256'),
    'hex'
  );

  -- Deduped daily upsert (UTC day). Repeat same-day visits bump hits + last_seen_at.
  insert into public.artifact_views (artifact_id, day, visitor_hash)
  values (p_artifact_id, (now() at time zone 'utc')::date, v_hash)
  on conflict (artifact_id, day, visitor_hash) do update
    set hits = public.artifact_views.hits + 1,
        last_seen_at = now();
end;
$$;

-- --------------------------------------------------------------------------------------------
-- Grants. service_role (used by the server-only recorder + admin reads) needs table privileges;
-- the recorder function is locked to service_role.
-- --------------------------------------------------------------------------------------------
grant all on public.audience_salt, public.artifact_views to service_role;

revoke execute on function public.record_artifact_view(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_artifact_view(uuid, text, text) to service_role;
