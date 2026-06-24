-- 0009 — back-fill service_role grants on the core content objects created in 0001.
--
-- The governed worker API authenticates each worker with a per-worker token and then writes through
-- the service-role Supabase client (lib/supabase/admin.ts). service_role bypasses RLS but still needs
-- table-level privileges. Migrations 0004/0005/0008 grant service_role on the tables they add, but
-- 0001 granted only anon/authenticated on the core content objects — leaving service_role with no
-- SELECT/INSERT/UPDATE/DELETE on artifacts/sources/artifact_sources/profiles and no SELECT on the
-- dedup views. Every governed write to a core table therefore failed with
--   "permission denied for table artifacts"
-- the first time the loop actually touched the database. (Hosted projects historically masked this
-- via Supabase's auto-exposed grants, which the new Data API default revokes — config field removed
-- 2026-10-30 — so this is also the forward-compatible fix.)
--
-- Back-fill the missing grants, matching the style of the service_role grants 0004/0005/0008 already
-- make. Additive and idempotent: a no-op where service_role already holds these privileges.

-- Core content tables (0001).
grant all on
  public.artifacts,
  public.sources,
  public.artifact_sources,
  public.profiles
to service_role;

-- Dedup views (0001) — read-only; the worker API selects from them on create/dedup.
grant select on
  public.seen_source_keys,
  public.rejected_source_keys
to service_role;
