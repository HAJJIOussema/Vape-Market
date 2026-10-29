alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.idempotency_keys enable row level security;

create policy categories_public_read on public.categories
for select to anon, authenticated using (is_active or public.is_admin());

create policy products_public_read on public.products
for select to anon, authenticated using (is_active or public.is_admin());

create policy variants_public_read on public.product_variants
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.products p where p.id = product_id and p.is_active
  )
  or public.is_admin()
);

create policy images_public_read on public.product_images
for select to anon, authenticated using (
  exists (
    select 1 from public.products p where p.id = product_id and p.is_active
  )
  or public.is_admin()
);

create policy categories_admin_manage on public.categories
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy products_admin_manage on public.products
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy variants_admin_manage on public.product_variants
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy images_admin_manage on public.product_images
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy profiles_self_read on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());

create policy profiles_self_update on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy addresses_owner_all on public.addresses
for all to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (profile_id = auth.uid() or public.is_admin());

create policy carts_owner_all on public.carts
for all to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (profile_id = auth.uid() or public.is_admin());

create policy cart_items_owner_all on public.cart_items
for all to authenticated
using (exists (select 1 from public.carts c where c.id = cart_id and (c.profile_id = auth.uid() or public.is_admin())))
with check (exists (select 1 from public.carts c where c.id = cart_id and (c.profile_id = auth.uid() or public.is_admin())));

create policy orders_owner_or_admin_read on public.orders
for select to authenticated
using (profile_id = auth.uid() or public.is_admin());

create policy order_items_owner_or_admin_read on public.order_items
for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and (o.profile_id = auth.uid() or public.is_admin())));

create policy inventory_stock_read on public.inventory
for select to authenticated using (public.is_stock_manager());

create policy stock_movements_stock_read on public.stock_movements
for select to authenticated using (public.is_stock_manager());

create policy payment_transactions_admin_read on public.payment_transactions
for select to authenticated using (public.is_admin());

revoke all on public.inventory from anon, authenticated;
revoke all on public.stock_movements from anon, authenticated;
revoke all on public.payment_transactions from anon, authenticated;
revoke all on public.idempotency_keys from anon, authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
revoke update(role) on public.profiles from authenticated;

grant select on public.inventory, public.stock_movements to authenticated;

revoke execute on function public.create_order(
  text, text, jsonb, text, text, jsonb, numeric, text, timestamptz, uuid
) from anon, authenticated;
grant execute on function public.create_order(
  text, text, jsonb, text, text, jsonb, numeric, text, timestamptz, uuid
) to service_role;

grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.ship_order(uuid) to authenticated;
grant execute on function public.adjust_inventory(uuid, integer, text) to authenticated;
