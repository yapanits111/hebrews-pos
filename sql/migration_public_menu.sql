-- ============================================================
--  MIGRATION: public read-only menu
--  Lets visitors who are NOT logged in see the active menu only.
--  Everything else (ingredients, sales, full product writes)
--  stays restricted to logged-in staff.
--
--  Run in Supabase > SQL Editor.
-- ============================================================

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select to anon using (is_active = true);

-- ============================================================
--  DONE.
-- ============================================================
