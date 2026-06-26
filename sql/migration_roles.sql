-- ============================================================
--  MIGRATION: superadmin role + secure in-app role management
--
--  HOW TO RUN:
--  Supabase Dashboard > SQL Editor > New query > paste all > Run
-- ============================================================

-- 1) Allow the new 'superadmin' role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('server','admin','superadmin'));

-- 2) Helper: the caller's role.
--    SECURITY DEFINER so it bypasses RLS and avoids policy recursion.
create or replace function public.my_role()
returns text language sql security definer stable
set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 3) Secure RPC to change a user's role.
--    Enforces the hierarchy server < admin < superadmin.
create or replace function public.set_user_role(target_id uuid, new_role text)
returns void language plpgsql security definer
set search_path = public as $$
declare
  caller_role text := public.my_role();
  target_role text := (select role from public.profiles where id = target_id);
begin
  if caller_role not in ('admin','superadmin') then
    raise exception 'Not authorized';
  end if;
  if new_role not in ('server','admin','superadmin') then
    raise exception 'Invalid role';
  end if;
  -- Only a superadmin may grant superadmin OR modify an existing superadmin
  if (new_role = 'superadmin' or target_role = 'superadmin') and caller_role <> 'superadmin' then
    raise exception 'Only a superadmin can manage superadmins';
  end if;
  update public.profiles set role = new_role where id = target_id;
end; $$;

revoke all on function public.set_user_role(uuid, text) from anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- 4) Close a privilege-escalation hole: remove direct self-update of profiles
--    (role changes now go only through set_user_role, which checks permissions).
drop policy if exists "profiles_update" on public.profiles;

-- 5) Make the OWNER a superadmin.
update public.profiles set role = 'superadmin'
where id = (select id from auth.users where email = 'danielpenero111@gmail.com');

-- ============================================================
--  DONE.
-- ============================================================
