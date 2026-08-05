-- ============================================================
--  MIGRATION: product images
--  Adds an image_url column and a public Storage bucket so
--  admins/superadmins can upload product photos. Anyone can VIEW
--  the images (they show on the POS and the public menu); only
--  logged-in staff can upload/replace them.
--
--  Run in Supabase > SQL Editor.
-- ============================================================

-- 1) Column to hold the public image URL
alter table public.products add column if not exists image_url text;

-- 2) Public storage bucket for the images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 3) Storage policies (on storage.objects) scoped to this bucket
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_auth_insert" on storage.objects;
create policy "product_images_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists "product_images_auth_update" on storage.objects;
create policy "product_images_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images');

drop policy if exists "product_images_auth_delete" on storage.objects;
create policy "product_images_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');

-- ============================================================
--  DONE.
-- ============================================================
