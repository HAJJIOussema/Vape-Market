-- ============================================================
-- Migration : browser_rpc
-- Date      : 2026-11-25
-- Purpose   : let the React app (hosted on Vercel) work directly against
--             Supabase, without the Express backend. Everything the backend
--             did with the service role is now either covered by the existing
--             RLS policies or by the SECURITY DEFINER functions below, each of
--             which checks the caller's role itself.
--
-- Fixes included:
--   - confirming an order (backend) was several non-atomic writes; now one
--     transaction with row locks;
--   - cancelling a confirmed order released "reserved" stock that confirm had
--     already consumed ("Reserved stock is inconsistent"); it now restocks;
--   - input formats only validated by the backend (phones, postal codes,
--     slugs, prices) are now enforced by CHECK constraints (NOT VALID, so
--     existing rows are kept, new/updated rows are checked).
-- Non destructive: no table, column or row is dropped.
-- ============================================================

-- ── 1. Public stock flag (no quantities exposed) ─────────────────────────
-- PostgREST computed field: select=*,product_variants(*,in_stock)
create or replace function public.in_stock(variant public.product_variants)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select i.on_hand > i.reserved
    from public.inventory i
    where i.variant_id = variant.id
  ), false);
$$;

revoke all on function public.in_stock(public.product_variants) from public;
grant execute on function public.in_stock(public.product_variants) to anon, authenticated;

-- ── 2. Admin: confirm an order (stock leaves the warehouse) ──────────────
create or replace function public.confirm_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.orders;
  item record;
  inventory_row public.inventory;
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;

  select * into target from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if target.status::text <> 'pending' then
    raise exception 'Seules les commandes en attente peuvent être confirmées.';
  end if;

  for item in
    select variant_id, quantity from public.order_items
    where order_id = target.id and variant_id is not null
    order by variant_id
  loop
    select * into inventory_row from public.inventory
    where variant_id = item.variant_id for update;

    if not found or inventory_row.reserved < item.quantity
       or inventory_row.on_hand < item.quantity then
      raise exception 'Stock insuffisant pour confirmer cette commande.';
    end if;

    update public.inventory
    set on_hand = on_hand - item.quantity, reserved = reserved - item.quantity
    where variant_id = item.variant_id;

    insert into public.inventory_movements (
      variant_id, order_id, actor_id, movement_type,
      quantity_before, quantity_change, quantity_after,
      reserved_before, reserved_change, reserved_after, reason
    ) values (
      item.variant_id, target.id, auth.uid(), 'sale',
      inventory_row.on_hand, -item.quantity, inventory_row.on_hand - item.quantity,
      inventory_row.reserved, -item.quantity, inventory_row.reserved - item.quantity,
      'Commande confirmée'
    );
  end loop;

  update public.orders set status = 'confirmed' where id = target.id
  returning * into target;
  return target;
end;
$$;

revoke all on function public.confirm_order(uuid) from public, anon;
grant execute on function public.confirm_order(uuid) to authenticated;

-- ── 3. Cancel: release reservation, or restock a confirmed order ─────────
create or replace function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.orders;
  item record;
  inventory_row public.inventory;
  was_confirmed boolean;
begin
  select * into target
  from public.orders
  where id = p_order_id
    and (profile_id = auth.uid() or public.is_admin())
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if target.status::text = 'cancelled' then
    return target;
  end if;
  if target.status::text not in ('pending', 'confirmed') then
    raise exception 'Order cannot be cancelled from its current status';
  end if;
  -- Customers may only cancel orders that are still pending.
  if target.status::text = 'confirmed' and not public.is_admin() then
    raise exception 'Order cannot be cancelled from its current status';
  end if;
  was_confirmed := target.status::text = 'confirmed';

  for item in
    select variant_id, quantity from public.order_items
    where order_id = target.id and variant_id is not null
    order by variant_id
  loop
    select * into inventory_row from public.inventory
    where variant_id = item.variant_id for update;
    if not found then
      continue;
    end if;

    if was_confirmed then
      update public.inventory set on_hand = on_hand + item.quantity
      where variant_id = item.variant_id;

      insert into public.inventory_movements (
        variant_id, order_id, actor_id, movement_type,
        quantity_before, quantity_change, quantity_after,
        reserved_before, reserved_change, reserved_after, reason
      ) values (
        item.variant_id, target.id, auth.uid(), 'return',
        inventory_row.on_hand, item.quantity, inventory_row.on_hand + item.quantity,
        inventory_row.reserved, 0, inventory_row.reserved, 'Order cancellation (restock)'
      );
    else
      if inventory_row.reserved < item.quantity then
        raise exception 'Reserved stock is inconsistent';
      end if;

      update public.inventory set reserved = reserved - item.quantity
      where variant_id = item.variant_id;

      insert into public.inventory_movements (
        variant_id, order_id, actor_id, movement_type,
        quantity_before, quantity_change, quantity_after,
        reserved_before, reserved_change, reserved_after, reason
      ) values (
        item.variant_id, target.id, auth.uid(), 'release',
        inventory_row.on_hand, 0, inventory_row.on_hand,
        inventory_row.reserved, -item.quantity, inventory_row.reserved - item.quantity,
        'Order cancellation'
      );
    end if;
  end loop;

  update public.orders set status = 'cancelled' where id = target.id
  returning * into target;
  return target;
end;
$$;

revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

-- ── 4. Staff: product variants with stock ────────────────────────────────
-- Internal helper: set the absolute stock of a variant and log the movement.
create or replace function public.set_variant_stock_internal(
  p_variant_id uuid, p_stock integer, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_inventory public.inventory;
  delta integer;
begin
  if p_stock is null or p_stock < 0 then
    raise exception 'Le stock doit être un entier positif ou nul.' using errcode = '22023';
  end if;

  select * into current_inventory from public.inventory
  where variant_id = p_variant_id for update;
  if not found then
    insert into public.inventory (variant_id, on_hand, reserved)
    values (p_variant_id, 0, 0)
    returning * into current_inventory;
  end if;

  if p_stock < current_inventory.reserved then
    raise exception 'Le stock ne peut pas être inférieur à la quantité réservée (%).',
      current_inventory.reserved;
  end if;

  delta := p_stock - current_inventory.on_hand;
  if delta = 0 then
    return;
  end if;

  update public.inventory set on_hand = p_stock where variant_id = p_variant_id;

  insert into public.inventory_movements (
    variant_id, actor_id, movement_type,
    quantity_before, quantity_change, quantity_after,
    reserved_before, reserved_change, reserved_after, reason
  ) values (
    p_variant_id, auth.uid(),
    (case when delta > 0 then 'restock' else 'adjustment' end)::public.inventory_movement_type,
    current_inventory.on_hand, delta, p_stock,
    current_inventory.reserved, 0, current_inventory.reserved, p_reason
  );
end;
$$;

revoke all on function public.set_variant_stock_internal(uuid, integer, text)
  from public, anon, authenticated;

-- Allowed variant fields: name, sku, price_tnd, attributes, is_default, status.
create or replace function public.save_product_variant(
  p_product_id uuid,
  p_variant_id uuid,
  p_values     jsonb,
  p_stock      integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.product_variants;
  inv public.inventory;
begin
  if not public.is_stock_manager() then
    raise exception 'Stock manager permission required' using errcode = '42501';
  end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception 'Variante invalide' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_values) key
    where key not in ('name', 'sku', 'price_tnd', 'attributes', 'is_default', 'status')
  ) then
    raise exception 'Champ de variante non autorisé' using errcode = '22023';
  end if;

  if p_variant_id is null then
    if p_product_id is null then
      raise exception 'Produit requis' using errcode = '22023';
    end if;
    if coalesce((p_values->>'is_default')::boolean, false) then
      update public.product_variants set is_default = false
      where product_id = p_product_id and is_default;
    end if;
    insert into public.product_variants (product_id, name, sku, price_tnd, attributes, is_default, status)
    values (
      p_product_id,
      btrim(p_values->>'name'),
      btrim(p_values->>'sku'),
      (p_values->>'price_tnd')::numeric,
      coalesce(p_values->'attributes', '{}'::jsonb),
      coalesce((p_values->>'is_default')::boolean, false),
      coalesce(p_values->>'status', 'active')::public.product_status
    )
    returning * into saved;
    insert into public.inventory (variant_id, on_hand, reserved) values (saved.id, 0, 0);
    if coalesce(p_stock, 0) > 0 then
      perform public.set_variant_stock_internal(saved.id, p_stock, 'Création de variante');
    end if;
  else
    select * into saved from public.product_variants where id = p_variant_id for update;
    if not found then
      raise exception 'Variant not found' using errcode = 'P0002';
    end if;
    if coalesce((p_values->>'is_default')::boolean, false) and not saved.is_default then
      update public.product_variants set is_default = false
      where product_id = saved.product_id and is_default and id <> saved.id;
    end if;
    update public.product_variants set
      name       = coalesce(btrim(p_values->>'name'), name),
      sku        = coalesce(btrim(p_values->>'sku'), sku),
      price_tnd  = coalesce((p_values->>'price_tnd')::numeric, price_tnd),
      attributes = coalesce(p_values->'attributes', attributes),
      is_default = coalesce((p_values->>'is_default')::boolean, is_default),
      status     = coalesce((p_values->>'status')::public.product_status, status)
    where id = saved.id
    returning * into saved;
    if p_stock is not null then
      perform public.set_variant_stock_internal(saved.id, p_stock, 'Modification admin du stock');
    end if;
  end if;

  select * into inv from public.inventory where variant_id = saved.id;
  return to_jsonb(saved) || jsonb_build_object(
    'on_hand', coalesce(inv.on_hand, 0),
    'reserved', coalesce(inv.reserved, 0),
    'available', coalesce(inv.on_hand, 0) - coalesce(inv.reserved, 0)
  );
end;
$$;

revoke all on function public.save_product_variant(uuid, uuid, jsonb, integer) from public, anon;
grant execute on function public.save_product_variant(uuid, uuid, jsonb, integer) to authenticated;

create or replace function public.delete_product_variant(p_variant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_stock_manager() then
    raise exception 'Stock manager permission required' using errcode = '42501';
  end if;
  if exists (select 1 from public.inventory where variant_id = p_variant_id and reserved > 0) then
    raise exception 'Cette variante a du stock réservé par des commandes en cours.';
  end if;
  if exists (select 1 from public.inventory_movements where variant_id = p_variant_id)
     or exists (select 1 from public.order_items where variant_id = p_variant_id) then
    raise exception 'Cette variante a un historique de stock ou de commandes : archivez-la plutôt que de la supprimer.';
  end if;

  delete from public.inventory where variant_id = p_variant_id;
  delete from public.product_variants where id = p_variant_id;
  if not found then
    raise exception 'Variant not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_product_variant(uuid) from public, anon;
grant execute on function public.delete_product_variant(uuid) to authenticated;

-- ── 5. Formats previously validated only by the backend ──────────────────
do $$
declare
  checks text[][] := array[
    ['addresses', 'addresses_phone_format_check', $c$phone ~ '^(\+216)?[0-9]{8}$'$c$],
    ['addresses', 'addresses_postal_code_format_check', $c$postal_code is null or postal_code ~ '^[0-9]{4}$'$c$],
    ['profiles', 'profiles_phone_format_check', $c$phone is null or phone ~ '^(\+216)?[0-9]{8}$'$c$],
    ['product_variants', 'product_variants_price_positive_check', $c$price_tnd > 0 and price_tnd = round(price_tnd, 3)$c$],
    ['products', 'products_slug_format_check', $c$slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'$c$],
    ['categories', 'categories_slug_format_check', $c$slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'$c$],
    ['brands', 'brands_slug_format_check', $c$slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'$c$]
  ];
  item text[];
begin
  foreach item slice 1 in array checks loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = item[1]
    ) and not exists (
      select 1 from pg_constraint
      where conname = item[2] and conrelid = format('public.%I', item[1])::regclass
    ) then
      execute format('alter table public.%I add constraint %I check (%s) not valid',
        item[1], item[2], item[3]);
    end if;
  end loop;
end
$$;

-- ── 6. Role changes: super administrators only ───────────────────────────
-- Profiles are now updated directly from the browser. The previous trigger
-- let any admin change roles, including promoting themselves to
-- super_admin. Browser requests always carry a JWT role (anon or
-- authenticated); a direct database connection without JWT (SQL editor,
-- migrations, seed) or the service role stays allowed.
create or replace function public.prevent_client_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and coalesce(auth.role(), 'service_role') <> 'service_role'
    and not public.is_super_admin() then
    raise exception 'Only a super administrator can change profile roles';
  end if;
  return new;
end;
$$;
