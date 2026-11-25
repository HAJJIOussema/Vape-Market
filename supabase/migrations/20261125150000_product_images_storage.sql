-- Product photos uploaded from the admin (Supabase Storage).
--
-- Bucket "product-images" (the frontend default, VITE_STORAGE_BUCKET):
--   - public: anyone can display a photo through its public URL;
--   - only stock managers / admins / super admins can upload, replace or
--     delete files (public.is_stock_manager(), the same rule as the
--     product_images table);
--   - images only, 5 MB maximum per file.
-- The rows linking a photo to a product stay in public.product_images,
-- whose RLS policies already exist.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_staff_select on storage.objects;
drop policy if exists product_images_staff_insert on storage.objects;
drop policy if exists product_images_staff_update on storage.objects;
drop policy if exists product_images_staff_delete on storage.objects;

-- Listing files is for staff only; public display uses the public URL.
create policy product_images_staff_select on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_stock_manager());

create policy product_images_staff_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_stock_manager());

create policy product_images_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_stock_manager())
  with check (bucket_id = 'product-images' and public.is_stock_manager());

create policy product_images_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_stock_manager());
