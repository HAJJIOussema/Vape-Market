-- V1 stores image references in storage_path.
-- Preserve legacy Cloudinary data while allowing V1 image inserts.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_images'
      and column_name = 'cloudinary_public_id'
  ) then
    alter table public.product_images
      alter column cloudinary_public_id drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_images'
      and column_name = 'secure_url'
  ) then
    alter table public.product_images
      alter column secure_url drop not null;
  end if;
end
$$;
