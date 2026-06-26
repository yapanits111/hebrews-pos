-- ============================================================
--  MIGRATION: promos / discounts
--  Admins & superadmins create reusable promos (e.g. "Senior 10%").
--  Servers can only READ them (to pick from a dropdown at checkout) —
--  they cannot create or change promos.
--
--  Requires migration_roles.sql first (uses public.my_role()).
--  Run in Supabase > SQL Editor.
-- ============================================================

create table if not exists public.promos (
  id         bigint generated always as identity primary key,
  name       text not null,                       -- "Senior Citizen", "October Promo"
  type       text not null default 'percent' check (type in ('percent','fixed')),
  value      numeric(10,2) not null default 0,    -- 10 (percent) or 20.00 (pesos)
  is_active  boolean default true,
  created_at timestamptz default now()
);

alter table public.promos enable row level security;

-- Everyone logged in can read promos (servers need them at checkout).
drop policy if exists "promos_read" on public.promos;
create policy "promos_read" on public.promos
  for select to authenticated using (true);

-- Only admin / superadmin can create, edit, or delete promos.
drop policy if exists "promos_admin_write" on public.promos;
create policy "promos_admin_write" on public.promos
  for all to authenticated
  using (public.my_role() in ('admin','superadmin'))
  with check (public.my_role() in ('admin','superadmin'));

-- Optional starter promos (edit or delete freely):
insert into public.promos (name, type, value) values
  ('Senior Citizen', 'percent', 20),
  ('PWD',            'percent', 20),
  ('Student',        'percent', 10);

-- ============================================================
--  DONE.
-- ============================================================
