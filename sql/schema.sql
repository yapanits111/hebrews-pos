-- ============================================================
--  HEBREWS 11:1 Coffee Shop — Database Schema
--  For Supabase (PostgreSQL)
--
--  HOW TO RUN:
--  1. Go to your project's Supabase Dashboard
--  2. Sidebar: "SQL Editor" > "New query"
--  3. Paste everything in this file
--  4. Click "Run"
-- ============================================================

-- ---------- PROFILES (users + role: admin / server) ----------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'server' check (role in ('admin','server')),
  created_at timestamptz default now()
);

-- Automatically creates a profile when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.email),
          'server')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- PRODUCTS (menu items / coffee) ----------
create table if not exists products (
  id         bigint generated always as identity primary key,
  name       text not null,
  category   text default 'Coffee',
  price      numeric(10,2) not null default 0,
  stock      integer,                 -- NULL = made-to-order (stock not tracked)
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- ---------- INGREDIENTS (supplies / raw materials) ----------
create table if not exists ingredients (
  id         bigint generated always as identity primary key,
  name       text not null,
  unit       text default 'pcs',      -- g, ml, pcs, sachet, etc.
  stock      numeric(10,2) default 0,
  cost       numeric(10,2) default 0, -- purchase cost (capital)
  low_stock  numeric(10,2) default 0, -- alert when stock gets low
  created_at timestamptz default now()
);

-- ---------- SALES (transactions / receipts) ----------
create table if not exists sales (
  id              bigint generated always as identity primary key,
  cashier         text,
  subtotal        numeric(10,2) not null default 0,
  discount_label  text,
  discount_amount numeric(10,2) not null default 0,
  total           numeric(10,2) not null default 0,
  payment_method  text default 'Cash',     -- Cash / GCash
  cash_received   numeric(10,2) default 0,
  change_amount   numeric(10,2) default 0,
  created_at      timestamptz default now()
);

create table if not exists sale_items (
  id         bigint generated always as identity primary key,
  sale_id    bigint references sales(id) on delete cascade,
  product_id bigint references products(id),
  name       text not null,              -- name snapshot at time of sale
  qty        integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  line_total numeric(10,2) not null default 0
);

-- ============================================================
--  ROW LEVEL SECURITY
--  Any logged-in staff member can use the app.
--  Admin-only actions are enforced in the app itself.
-- ============================================================
alter table profiles    enable row level security;
alter table products    enable row level security;
alter table ingredients enable row level security;
alter table sales       enable row level security;
alter table sale_items  enable row level security;

drop policy if exists "profiles_read"   on profiles;
drop policy if exists "profiles_update" on profiles;
create policy "profiles_read"   on profiles for select to authenticated using (true);
create policy "profiles_update" on profiles for update to authenticated using (auth.uid() = id);

drop policy if exists "products_all"    on products;
drop policy if exists "ingredients_all" on ingredients;
drop policy if exists "sales_all"       on sales;
drop policy if exists "sale_items_all"  on sale_items;
create policy "products_all"    on products    for all to authenticated using (true) with check (true);
create policy "ingredients_all" on ingredients for all to authenticated using (true) with check (true);
create policy "sales_all"       on sales       for all to authenticated using (true) with check (true);
create policy "sale_items_all"  on sale_items  for all to authenticated using (true) with check (true);

-- ============================================================
--  DONE! See seed.sql if you want sample data.
-- ============================================================
