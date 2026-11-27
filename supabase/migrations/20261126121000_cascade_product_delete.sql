-- Make deleting a product actually remove it.
--
-- product_variants.product_id, product_images.product_id and inventory.variant_id
-- were ON DELETE RESTRICT, so any product that still had variants (i.e. every
-- real product) could not be deleted: the "Supprimer" button silently failed
-- with a foreign-key error. Cascading these deletes lets an unsold product be
-- removed together with its variants, photos and stock.
--
-- inventory_movements.variant_id stays RESTRICT on purpose: a product that has
-- been sold (audit trail) still cannot be deleted and the button reports the
-- error instead of destroying order history.

alter table public.product_variants
  drop constraint if exists product_variants_product_id_fkey,
  add constraint product_variants_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.product_images
  drop constraint if exists product_images_product_id_fkey,
  add constraint product_images_product_id_fkey
    foreign key (product_id) references public.products(id) on delete cascade;

alter table public.inventory
  drop constraint if exists inventory_variant_id_fkey,
  add constraint inventory_variant_id_fkey
    foreign key (variant_id) references public.product_variants(id) on delete cascade;
