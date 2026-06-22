-- 0003_finalize_function_security.sql — clear the remaining SECURITY DEFINER linter warnings.

-- is_admin only needs to read the CALLER's own profile row (which RLS already permits),
-- so it can run as SECURITY INVOKER — no longer a DEFINER function on the public API.
create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Drop the recursive is_admin() branch from the profiles SELECT policy (a user reading
-- their own row is all is_admin needs; admin-wide profile reads aren't used at MVP).
drop policy profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = (select auth.uid()));

-- handle_new_user must stay SECURITY DEFINER (it writes profiles during the signup
-- trigger, bypassing RLS) but should not be invocable as an API RPC.
revoke execute on function public.handle_new_user() from anon, authenticated;
