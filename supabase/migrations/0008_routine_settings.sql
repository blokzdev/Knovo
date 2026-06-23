-- 0008_routine_settings.sql — admin-managed (BYOK) config for the dashboard "run now" dispatch.
-- The HUD lets an admin store each worker routine's API fire-trigger URL + token (and a global
-- KNOVO_API_BASE) instead of redeploying env vars. fireWorker() reads these DB-first (env stays a
-- fallback). Both tables are ADMIN-ONLY (RLS is_admin()), read only server-side, and the token is
-- never sent to the browser (the UI masks it to ••••last4). Workers never touch these tables —
-- this is dashboard-only config. See foundation/security-and-privacy.md, data-model.md, and the
-- Decision 8 amendment in DECISIONS.md.

-- ── routine_configs: per-routine fire trigger (one row per worker) ────────────
create table public.routine_configs (
  worker     text primary key check (worker in ('scout', 'editor', 'keeper')),
  fire_url   text,
  token      text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- ── app_settings: small admin-only key/value (e.g. knovo_api_base) ────────────
create table public.app_settings (
  key        text primary key,
  value      text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- Stamp updated_at on every update (reuse the shared trigger fn pinned in 0001/0002).
create trigger routine_configs_set_updated_at
  before update on public.routine_configs
  for each row execute function public.set_updated_at();
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ── RLS: admin-only (no anon). The trusted server reads via service_role (bypasses RLS). ──
alter table public.routine_configs enable row level security;
alter table public.app_settings    enable row level security;

grant select, insert, update on public.routine_configs to authenticated;
grant select, insert, update on public.app_settings    to authenticated;

create policy routine_configs_admin_all on public.routine_configs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy app_settings_admin_all on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- The trusted server (service_role) is the only path that reads the token (in fireWorker).
grant all on public.routine_configs, public.app_settings to service_role;
