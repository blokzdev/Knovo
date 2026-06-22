-- 0006_reader_hardening.sql — Phase 1 hardening (advisor cleanup for 0005).
-- 1) Remove the SECURITY DEFINER `public_profiles` view (linter ERROR 0010) by denormalizing the
--    comment author's PUBLIC display onto reader_comments via a spoof-proof insert trigger.
-- 2) Wrap auth.uid() in (select auth.uid()) so RLS evaluates it once per query, not per row (0003).
-- 3) Add covering indexes for foreign keys (0001).

-- ── 1) Denormalized, immutable author display on reader_comments ──────────────
alter table public.reader_comments
  add column author_name   text,
  add column author_avatar text;

-- Stamp the author's display from their profile at insert time. SECURITY DEFINER + sourced from
-- auth.uid()'s profile (not client input), so a caller can't spoof another reader's name/avatar.
create or replace function public.stamp_reader_comment_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select p.display_name, p.avatar_url
    into new.author_name, new.author_avatar
  from public.profiles p
  where p.id = new.author_id;
  return new;
end; $$;

create trigger reader_comments_stamp_author
  before insert on public.reader_comments
  for each row execute function public.stamp_reader_comment_author();

-- Backfill any rows that predate the trigger (none expected this early).
update public.reader_comments rc
set author_name = p.display_name, author_avatar = p.avatar_url
from public.profiles p
where p.id = rc.author_id and rc.author_name is null;

-- The view is no longer needed; the public display now travels on the comment row.
drop view if exists public.public_profiles;

-- ── 2) Re-evaluate auth.uid() once per query (perf) ──────────────────────────
drop policy if exists bookmarks_owner_all on public.bookmarks;
create policy bookmarks_owner_all on public.bookmarks
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists subscriptions_owner_all on public.subscriptions;
create policy subscriptions_owner_all on public.subscriptions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists reader_comments_author_insert on public.reader_comments;
create policy reader_comments_author_insert on public.reader_comments
  for insert to authenticated with check (
    author_id = (select auth.uid()) and exists (
      select 1 from public.artifacts a
      where a.id = reader_comments.artifact_id
        and a.status = 'published' and a.deleted_at is null
    )
  );

drop policy if exists reader_comments_author_update on public.reader_comments;
create policy reader_comments_author_update on public.reader_comments
  for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

drop policy if exists reader_comments_author_delete on public.reader_comments;
create policy reader_comments_author_delete on public.reader_comments
  for delete to authenticated using (author_id = (select auth.uid()));

-- ── 3) Covering indexes for foreign keys ─────────────────────────────────────
create index if not exists reader_comments_author_idx on public.reader_comments(author_id);
create index if not exists bookmarks_artifact_idx     on public.bookmarks(artifact_id);
create index if not exists artifacts_created_by_idx   on public.artifacts(created_by);
create index if not exists artifacts_reviewed_by_idx  on public.artifacts(reviewed_by);
create index if not exists comments_author_idx        on public.comments(author);
