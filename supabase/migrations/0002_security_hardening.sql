-- 0002_security_hardening.sql — resolve Supabase security-linter warnings from 0001.

-- 1. Pin search_path on the updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- 2. handle_new_user runs only as an auth.users trigger — it must not be an API RPC.
revoke execute on function public.handle_new_user() from public;

-- 3. is_admin() is only needed inside authenticated RLS policies. Take it off the
--    anon-exposed API and restrict EXECUTE to authenticated.
revoke execute on function public.is_admin() from public;
grant  execute on function public.is_admin() to authenticated;

-- 4. Drop is_admin() from anon-facing read policies (admins already read all via the
--    admin "for all" policies), so the anon role never evaluates it.
drop policy sources_public_read on public.sources;
create policy sources_public_read on public.sources
  for select to anon, authenticated using (
    exists (
      select 1 from public.artifact_sources xs
      join public.artifacts a on a.id = xs.artifact_id
      where xs.source_id = sources.id and a.status = 'published'
    )
  );

drop policy artifact_sources_public_read on public.artifact_sources;
create policy artifact_sources_public_read on public.artifact_sources
  for select to anon, authenticated using (
    exists (
      select 1 from public.artifacts a
      where a.id = artifact_sources.artifact_id and a.status = 'published'
    )
  );
