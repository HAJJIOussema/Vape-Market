-- Row-level security and least-privilege grants for the V1 schema.

alter table public.categories enable row level security;
alter table public.brands enable row level security;
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
alter table public.inventory_movements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.idempotency_keys enable row level security;

-- Public catalogue.
create policy categories_public_read on public.categories
for select to anon, authenticated
using (is_active);

create policy categories_admin_read on public.categories
for select to authenticated
using (public.is_admin());

create policy brands_public_read on public.brands
for select to anon, authenticated
using (is_active);

create policy brands_admin_read on public.brands
for select to authenticated
using (public.is_admin());

create policy products_public_read on public.products
for select to anon, authenticated
using (status = 'active'::public.product_status);

create policy products_admin_read on public.products
for select to authenticated
using (public.is_admin());

create policy variants_public_read on public.product_variants
for select to anon, authenticated
using (
  status = 'active'::public.product_status
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.status = 'active'::public.product_status
  )
);

create policy variants_admin_read on public.product_variants
for select to authenticated
using (public.is_admin());

create policy images_public_read on public.product_images
for select to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.status = 'active'::public.product_status
  )
);

create policy images_admin_read on public.product_images
for select to authenticated
using (public.is_admin());

create policy categories_staff_manage on public.categories
for all to authenticated
using (
  public.is_stock_manager()
)
with check (
  public.is_stock_manager()
);

create policy brands_staff_manage on public.brands
for all to authenticated
using (
  public.is_stock_manager()
)
with check (
  public.is_stock_manager()
);

create policy products_staff_manage on public.products
for all to authenticated
using (
  public.is_stock_manager()
)
with check (
  public.is_stock_manager()
);

create policy variants_staff_manage on public.product_variants
for all to authenticated
using (
  public.is_stock_manager()
)
with check (
  public.is_stock_manager()
);

create policy images_staff_manage on public.product_images
for all to authenticated
using (
  public.is_stock_manager()
)
with check (
  public.is_stock_manager()
);

-- Profiles: customers own their profile; administrators can read; only
-- super administrators can perform administrative profile changes.
create policy profiles_self_read on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy profiles_admin_read on public.profiles
for select to authenticated
using (public.is_admin());

create policy profiles_self_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy profiles_super_admin_manage on public.profiles
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- Addresses belong to one profile. Administrators have read-only access;
-- super administrators retain full operational access.
create policy addresses_owner_read on public.addresses
for select to authenticated
using (profile_id = (select auth.uid()));

create policy addresses_owner_write on public.addresses
for insert to authenticated
with check (profile_id = (select auth.uid()));

create policy addresses_owner_update on public.addresses
for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create policy addresses_owner_delete on public.addresses
for delete to authenticated
using (profile_id = (select auth.uid()));

create policy addresses_admin_read on public.addresses
for select to authenticated
using (public.is_admin());

create policy addresses_super_admin_manage on public.addresses
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- Carts are customer-owned and are not administrative resources.
create policy carts_owner_manage on public.carts
for all to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

create policy cart_items_owner_manage on public.cart_items
for all to authenticated
using (
  exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.profile_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.profile_id = (select auth.uid())
  )
);

-- Orders are created and mutated through SECURITY DEFINER functions.
create policy orders_customer_read on public.orders
for select to authenticated
using (profile_id = (select auth.uid()));

create policy orders_admin_read on public.orders
for select to authenticated
using (public.is_admin());

create policy orders_super_admin_manage on public.orders
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy order_items_customer_read on public.order_items
for select to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.profile_id = (select auth.uid())
  )
);

create policy order_items_admin_read on public.order_items
for select to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and public.is_admin()
  )
);

create policy order_items_super_admin_manage on public.order_items
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- Inventory is visible and writable only to stock staff. Direct writes are
-- allowed for the explicitly authorized staff roles; movement history remains
-- append-only through the SECURITY DEFINER business functions.
create policy inventory_staff_read on public.inventory
for select to authenticated
using (public.is_stock_manager());

create policy inventory_staff_insert on public.inventory
for insert to authenticated
with check (public.is_stock_manager());

create policy inventory_staff_update on public.inventory
for update to authenticated
using (public.is_stock_manager())
with check (public.is_stock_manager());

create policy inventory_movements_staff_read on public.inventory_movements
for select to authenticated
using (public.is_stock_manager());

-- No INSERT/UPDATE/DELETE policy is intentional: only SECURITY DEFINER
-- functions may append inventory movements.

-- Audit logs are immutable and visible only to super administrators.
create policy audit_logs_super_admin_read on public.audit_logs
for select to authenticated
using (public.is_super_admin());

-- No INSERT/UPDATE/DELETE policy is intentional.

-- No client policy is defined for idempotency_keys. It is internal to
-- create_order().

revoke all on public.categories from anon, authenticated;
revoke all on public.brands from anon, authenticated;
revoke all on public.products from anon, authenticated;
revoke all on public.product_variants from anon, authenticated;
revoke all on public.product_images from anon, authenticated;
revoke all on public.inventory from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.addresses from anon, authenticated;
revoke all on public.carts from anon, authenticated;
revoke all on public.cart_items from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.inventory_movements from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.idempotency_keys from anon, authenticated;

grant select on public.categories, public.brands, public.products,
  public.product_variants, public.product_images to anon, authenticated;

grant select, insert, update, delete on public.categories, public.brands,
  public.products, public.product_variants, public.product_images
  to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, update, delete on public.carts, public.cart_items
  to authenticated;
grant select on public.orders, public.order_items to authenticated;
grant select, insert, update on public.inventory to authenticated;
grant select on public.inventory_movements, public.audit_logs to authenticated;

revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.is_super_admin() from public, anon, authenticated;
revoke execute on function public.is_stock_manager() from public, anon, authenticated;
revoke execute on function public.has_role(public.user_role)
  from public, anon, authenticated;
revoke execute on function public.current_user_role()
  from public, anon, authenticated;

grant execute on function public.is_admin(), public.is_super_admin(),
  public.is_stock_manager(), public.has_role(public.user_role),
  public.current_user_role() to authenticated;

revoke execute on function public.create_order(
  text, text, jsonb, text, text, jsonb, numeric, uuid
) from public, anon, authenticated;
grant execute on function public.create_order(
  text, text, jsonb, text, text, jsonb, numeric, uuid
) to authenticated;

revoke execute on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

revoke execute on function public.ship_order(uuid) from public, anon;
grant execute on function public.ship_order(uuid) to authenticated;

revoke execute on function public.adjust_inventory(uuid, integer, text)
  from public, anon;
grant execute on function public.adjust_inventory(uuid, integer, text)
  to authenticated;
