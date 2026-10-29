create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  profile_id uuid references public.profiles(id) on delete set null,
  customer_email text not null,
  customer_phone text not null,
  guest_access_token_hash text,
  guest_token_expires_at timestamptz,
  guest_access_revoked_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'not_required'
    check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'refunded')),
  subtotal_tnd numeric(12,3) not null check (subtotal_tnd >= 0),
  shipping_cost_tnd numeric(12,3) not null default 0 check (shipping_cost_tnd >= 0),
  total_tnd numeric(12,3) not null check (total_tnd >= 0),
  currency char(3) not null default 'TND' check (currency = 'TND'),
  shipping_address_snapshot jsonb not null
    check (jsonb_typeof(shipping_address_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (profile_id is not null and guest_access_token_hash is null)
    or
    (profile_id is null and guest_access_token_hash is not null
      and guest_token_expires_at is not null)
  ),
  check (total_tnd = subtotal_tnd + shipping_cost_tnd)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  variant_name_snapshot text not null,
  sku_snapshot text not null,
  unit_price_tnd numeric(12,3) not null check (unit_price_tnd >= 0),
  quantity integer not null check (quantity > 0),
  line_total_tnd numeric(12,3) not null check (line_total_tnd >= 0),
  check (line_total_tnd = round(unit_price_tnd * quantity, 3))
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  movement_type text not null
    check (movement_type in ('restock', 'reserve', 'release', 'sale', 'adjustment')),
  quantity integer not null check (quantity > 0),
  on_hand_after integer not null check (on_hand_after >= 0),
  reserved_after integer not null check (reserved_after >= 0),
  reason text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text,
  provider_reference text,
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  amount_tnd numeric(12,3) not null check (amount_tnd >= 0),
  currency char(3) not null default 'TND' check (currency = 'TND'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  request_hash text not null,
  order_id uuid unique references public.orders(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.validate_order_totals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  expected_subtotal numeric(12,3);
begin
  select coalesce(sum(line_total_tnd), 0)::numeric(12,3)
    into expected_subtotal
  from public.order_items
  where order_id = coalesce(new.order_id, old.order_id);

  if exists (
    select 1 from public.orders o
    where o.id = coalesce(new.order_id, old.order_id)
      and (o.subtotal_tnd <> expected_subtotal
        or o.total_tnd <> o.subtotal_tnd + o.shipping_cost_tnd)
  ) then
    raise exception 'Order totals do not match order items';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create constraint trigger order_items_totals_check
after insert or update or delete on public.order_items
deferrable initially deferred
for each row execute function public.validate_order_totals();

create or replace function public.create_order(
  p_idempotency_key text,
  p_request_hash text,
  p_items jsonb,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_shipping_cost_tnd numeric(12,3) default 0,
  p_guest_access_token_hash text default null,
  p_guest_token_expires_at timestamptz default null,
  p_profile_id uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.orders;
  created public.orders;
  item jsonb;
  variant_row record;
  item_quantity integer;
  item_price numeric(12,3);
  item_total numeric(12,3);
  subtotal numeric(12,3) := 0;
  current_profile uuid := auth.uid();
begin
  if p_idempotency_key is null or p_request_hash is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Invalid order request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  current_profile := coalesce(current_profile, p_profile_id);

  select o.* into existing
  from public.idempotency_keys k
  join public.orders o on o.id = k.order_id
  where k.idempotency_key = p_idempotency_key
  for update;

  if found then
    if not exists (
      select 1 from public.idempotency_keys
      where idempotency_key = p_idempotency_key and request_hash = p_request_hash
    ) then
      raise exception 'Idempotency key was reused with a different request';
    end if;
    return existing;
  end if;

  if current_profile is null and (p_guest_access_token_hash is null or p_guest_token_expires_at is null) then
    raise exception 'Guest orders require an expiring access token';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item ->> 'quantity')::integer;
    if item_quantity is null or item_quantity <= 0 then
      raise exception 'Invalid order quantity';
    end if;

    select v.id, v.product_id, v.name, v.sku, v.price_tnd, i.on_hand, i.reserved
      into variant_row
    from public.product_variants v
    join public.products p on p.id = v.product_id and p.is_active
    join public.inventory i on i.variant_id = v.id
    where v.id = (item ->> 'variant_id')::uuid and v.is_active
    for update of i;

    if not found or variant_row.on_hand - variant_row.reserved < item_quantity then
      raise exception 'Variant unavailable or insufficient stock';
    end if;

    item_price := variant_row.price_tnd;
    item_total := round(item_price * item_quantity, 3);
    subtotal := subtotal + item_total;
  end loop;

  insert into public.orders (
    order_number, profile_id, customer_email, customer_phone,
    guest_access_token_hash, guest_token_expires_at, status,
    subtotal_tnd, shipping_cost_tnd, total_tnd, shipping_address_snapshot
  )
  values (
    'VM-' || upper(encode(gen_random_bytes(6), 'hex')),
    current_profile, p_customer_email, p_customer_phone,
    case when current_profile is null then p_guest_access_token_hash end,
    case when current_profile is null then p_guest_token_expires_at end,
    'confirmed', subtotal, p_shipping_cost_tnd,
    subtotal + p_shipping_cost_tnd, p_shipping_address
  )
  returning * into created;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item ->> 'quantity')::integer;
    select v.id, v.product_id, v.name, v.sku, v.price_tnd, i.on_hand, i.reserved
      into variant_row
    from public.product_variants v
    join public.inventory i on i.variant_id = v.id
    where v.id = (item ->> 'variant_id')::uuid
    for update of i;

    item_total := round(variant_row.price_tnd * item_quantity, 3);
    insert into public.order_items (
      order_id, variant_id, product_name_snapshot, variant_name_snapshot,
      sku_snapshot, unit_price_tnd, quantity, line_total_tnd
    )
    select created.id, variant_row.id, p.name, variant_row.name,
           variant_row.sku, variant_row.price_tnd, item_quantity, item_total
    from public.products p
    where p.id = variant_row.product_id;

    update public.inventory
    set reserved = reserved + item_quantity
    where variant_id = variant_row.id;

    insert into public.stock_movements (
      variant_id, order_id, movement_type, quantity,
      on_hand_after, reserved_after, reason, actor_id
    )
    select variant_row.id, created.id, 'reserve', item_quantity,
           i.on_hand, i.reserved, 'Order reservation', current_profile
    from public.inventory i
    where i.variant_id = variant_row.id;
  end loop;

  insert into public.idempotency_keys (idempotency_key, request_hash, order_id, profile_id)
  values (p_idempotency_key, p_request_hash, created.id, current_profile);

  return created;
end;
$$;

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
begin
  select * into target
  from public.orders
  where id = p_order_id
    and (profile_id = auth.uid() or public.is_admin())
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if target.status in ('shipped', 'delivered', 'cancelled') then
    if target.status = 'cancelled' then
      return target;
    end if;
    raise exception 'Order cannot be cancelled from its current status';
  end if;

  for item in
    select oi.variant_id, oi.quantity
    from public.order_items oi
    where oi.order_id = target.id and oi.variant_id is not null
  loop
    select * into inventory_row
    from public.inventory
    where variant_id = item.variant_id
    for update;

    if inventory_row.reserved < item.quantity then
      raise exception 'Reserved stock is inconsistent';
    end if;

    update public.inventory
    set reserved = reserved - item.quantity
    where variant_id = item.variant_id;

    insert into public.stock_movements (
      variant_id, order_id, movement_type, quantity,
      on_hand_after, reserved_after, reason, actor_id
    )
    select item.variant_id, target.id, 'release', item.quantity,
           i.on_hand, i.reserved, 'Order cancellation', auth.uid()
    from public.inventory i
    where i.variant_id = item.variant_id;
  end loop;

  update public.orders
  set status = 'cancelled'
  where id = target.id
  returning * into target;
  return target;
end;
$$;

create or replace function public.ship_order(p_order_id uuid)
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
  if not public.is_stock_manager() then
    raise exception 'Stock manager permission required';
  end if;

  select * into target
  from public.orders
  where id = p_order_id
    and status in ('confirmed', 'processing')
  for update;

  if not found then
    raise exception 'Order is not ready for shipment';
  end if;

  for item in
    select oi.variant_id, oi.quantity
    from public.order_items oi
    where oi.order_id = target.id and oi.variant_id is not null
  loop
    select * into inventory_row
    from public.inventory
    where variant_id = item.variant_id
    for update;

    if inventory_row.reserved < item.quantity
       or inventory_row.on_hand < item.quantity then
      raise exception 'Stock is inconsistent for shipment';
    end if;

    update public.inventory
    set on_hand = on_hand - item.quantity,
        reserved = reserved - item.quantity
    where variant_id = item.variant_id;

    insert into public.stock_movements (
      variant_id, order_id, movement_type, quantity,
      on_hand_after, reserved_after, reason, actor_id
    )
    select item.variant_id, target.id, 'sale', item.quantity,
           i.on_hand, i.reserved, 'Order shipment', auth.uid()
    from public.inventory i
    where i.variant_id = item.variant_id;
  end loop;

  update public.orders
  set status = 'shipped'
  where id = target.id
  returning * into target;
  return target;
end;
$$;

create or replace function public.adjust_inventory(
  p_variant_id uuid,
  p_delta integer,
  p_reason text
)
returns public.inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  current_inventory public.inventory;
  updated_inventory public.inventory;
begin
  if not public.is_stock_manager() or p_delta = 0 or nullif(btrim(p_reason), '') is null then
    raise exception 'Invalid inventory adjustment';
  end if;

  select * into current_inventory
  from public.inventory
  where variant_id = p_variant_id
  for update;

  if not found or current_inventory.on_hand + p_delta < current_inventory.reserved then
    raise exception 'Inventory adjustment would make stock invalid';
  end if;

  update public.inventory
  set on_hand = on_hand + p_delta
  where variant_id = p_variant_id
  returning * into updated_inventory;

  insert into public.stock_movements (
    variant_id, movement_type, quantity, on_hand_after,
    reserved_after, reason, actor_id
  )
  values (
    p_variant_id, 'adjustment', abs(p_delta),
    updated_inventory.on_hand, updated_inventory.reserved,
    p_reason, auth.uid()
  );

  return updated_inventory;
end;
$$;

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger payment_transactions_set_updated_at
before update on public.payment_transactions
for each row execute function public.set_updated_at();

create index orders_profile_created_idx on public.orders(profile_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at);
create index order_items_order_idx on public.order_items(order_id);
create unique index order_items_one_variant_per_order_idx
  on public.order_items(order_id, variant_id)
  where variant_id is not null;
create index stock_movements_variant_created_idx on public.stock_movements(variant_id, created_at desc);
create index stock_movements_order_idx on public.stock_movements(order_id);
create index payment_transactions_order_idx on public.payment_transactions(order_id);
