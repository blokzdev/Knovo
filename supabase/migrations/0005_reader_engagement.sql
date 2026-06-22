-- 0005_reader_engagement.sql — public reader accounts & engagement (Phase 1d).
-- Reader-owned tables (bookmarks, reader_comments, subscriptions), a safe public-profile view for
-- comment authors, and capture of the Google display name/avatar on signup. These tables sit
-- OUTSIDE the worker API + slot schema; the worker-facing surface is unchanged. Amends Decision #5.
-- See foundation/data-model.md, security-and-privacy.md.

-- ── profiles: public display fields from the OAuth identity ───────────────────
alter table public.profiles add column if not exists avatar_url text;

-- Capture display_name + avatar from Google's user metadata at signup (read-only in v1: no
-- self-update policy, so a user can never escalate their own role via a profile write).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- Backfill existing rows from auth metadata.
update public.profiles p
set display_name = coalesce(p.display_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    avatar_url   = coalesce(p.avatar_url,   u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where u.id = p.id;

-- ── public_profiles: expose ONLY safe display fields to everyone ──────────────
-- SECURITY DEFINER view (default security_invoker=false): bypasses profiles RLS but selects only
-- non-sensitive columns, so comment authors render publicly without leaking email/role.
create or replace view public.public_profiles as
  select id, display_name, avatar_url from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- ── bookmarks (user-owned; private) ──────────────────────────────────────────
create table public.bookmarks (
  user_id     uuid not null references public.profiles(id)  on delete cascade,
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, artifact_id)
);
create index bookmarks_user_idx on public.bookmarks(user_id, created_at desc);

-- ── reader_comments (public discussion — DISTINCT from editorial `comments`) ──
create type public.reader_comment_status as enum ('visible', 'hidden', 'removed');
create table public.reader_comments (
  id          uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  author_id   uuid not null references public.profiles(id)  on delete cascade,
  body        text not null check (length(btrim(body)) between 1 and 5000),
  status      public.reader_comment_status not null default 'visible',
  edited      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index reader_comments_artifact_idx on public.reader_comments(artifact_id, created_at desc);
create trigger reader_comments_set_updated_at
  before update on public.reader_comments
  for each row execute function public.set_updated_at();

-- ── subscriptions (records intent; transactional email is later scope) ───────
create table public.subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  scope      text not null default 'all' check (scope in ('all')),
  created_at timestamptz not null default now(),
  unique (user_id, scope)
);

-- ── Grants (RLS gates actual access) ─────────────────────────────────────────
grant select, insert, delete         on public.bookmarks       to authenticated;
grant select                         on public.reader_comments to anon, authenticated;
grant insert, update, delete         on public.reader_comments to authenticated;
grant select, insert, delete         on public.subscriptions   to authenticated;
grant all on public.bookmarks, public.reader_comments, public.subscriptions to service_role;

-- ── Row-Level Security ───────────────────────────────────────────────────────
alter table public.bookmarks       enable row level security;
alter table public.reader_comments enable row level security;
alter table public.subscriptions   enable row level security;

-- bookmarks + subscriptions: fully private to the owner.
create policy bookmarks_owner_all on public.bookmarks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy subscriptions_owner_all on public.subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reader_comments: public reads VISIBLE comments on published, non-deleted artifacts.
create policy reader_comments_public_read on public.reader_comments
  for select to anon, authenticated using (
    status = 'visible' and exists (
      select 1 from public.artifacts a
      where a.id = reader_comments.artifact_id
        and a.status = 'published' and a.deleted_at is null
    )
  );
-- author posts as themselves, only on a published, non-deleted artifact.
create policy reader_comments_author_insert on public.reader_comments
  for insert to authenticated with check (
    author_id = auth.uid() and exists (
      select 1 from public.artifacts a
      where a.id = reader_comments.artifact_id
        and a.status = 'published' and a.deleted_at is null
    )
  );
-- author edits / deletes own.
create policy reader_comments_author_update on public.reader_comments
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy reader_comments_author_delete on public.reader_comments
  for delete to authenticated using (author_id = auth.uid());
-- admin moderates anything (sees hidden/removed; flips status).
create policy reader_comments_admin_all on public.reader_comments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
