create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  customer_email text not null,
  customer_phone text not null,
  status public.order_status not null default 'pending'::public.order_status,
  payment_method text not null default 'cash_on_delivery'
    check (payment_method = 'cash_on_delivery'),
  payment_status public.payment_status not null
    default 'pending'::public.payment_status,
  subtotal_tnd numeric(12,3) not null check (subtotal_tnd >= 0),
  shipping_cost_tnd numeric(12,3) not null default 0
    check (shipping_cost_tnd >= 0),
  total_tnd numeric(12,3) not null check (total_tnd >= 0),
  currency char(3) not null default 'TND' check (currency = 'TND'),
  carrier text,
  tracking_number text,
  shipping_address_snapshot jsonb not null
    check (jsonb_typeof(shipping_address_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  movement_type public.inventory_movement_type not null,
  quantity_before integer not null check (quantity_before >= 0),
  quantity_change integer not null,
  quantity_after integer not null check (quantity_after >= 0),
  reserved_before integer not null check (reserved_before >= 0),
  reserved_change integer not null,
  reserved_after integer not null check (reserved_after >= 0),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  check (quantity_after = quantity_before + quantity_change),
  check (reserved_after = reserved_before + reserved_change),
  check (reserved_after <= quantity_after)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  request_id text,
  ip_address inet,
  user_agent text,
  action text not null check (length(btrim(action)) between 1 and 120),
  resource_type text not null
    check (length(btrim(resource_type)) between 1 and 120),
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key text not null
    check (length(btrim(idempotency_key)) between 16 and 255),
  request_hash text not null check (length(btrim(request_hash)) > 0),
  order_id uuid unique references public.orders(id) on delete restrict,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (profile_id, idempotency_key),
  check (expires_at > created_at)
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
    select 1
    from public.orders o
    where o.id = coalesce(new.order_id, old.order_id)
      and (
        o.subtotal_tnd <> expected_subtotal
        or o.total_tnd <> o.subtotal_tnd + o.shipping_cost_tnd
      )
  ) then
    raise exception 'Order totals do not match order items';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.create_order(
  p_idempotency_key text,
  p_request_hash text,
  p_items jsonb,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_shipping_cost_tnd numeric(12,3) default 0,
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
  item_total numeric(12,3);
  subtotal numeric(12,3) := 0;
  current_profile uuid := auth.uid();
begin
  if current_profile is null
     or (p_profile_id is not null and p_profile_id <> current_profile)
     or p_idempotency_key is null
     or p_request_hash is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or p_shipping_cost_tnd < 0
     or jsonb_typeof(p_shipping_address) <> 'object' then
    raise exception 'Invalid order request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    current_profile::text || ':' || p_idempotency_key, 0
  ));

  select o.* into existing
  from public.idempotency_keys k
  join public.orders o on o.id = k.order_id
  where k.profile_id = current_profile
    and k.idempotency_key = p_idempotency_key
  for update;

  if found then
    if not exists (
      select 1
      from public.idempotency_keys
      where profile_id = current_profile
        and idempotency_key = p_idempotency_key
        and request_hash = p_request_hash
    ) then
      raise exception 'Idempotency key was reused with a different request';
    end if;
    return existing;
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item ->> 'quantity')::integer;
    if item_quantity is null or item_quantity <= 0 then
      raise exception 'Invalid order quantity';
    end if;

    select v.id, v.product_id, v.name, v.sku, v.price_tnd,
           i.on_hand, i.reserved
      into variant_row
    from public.product_variants v
    join public.products p
      on p.id = v.product_id
      and p.status = 'active'::public.product_status
    join public.inventory i on i.variant_id = v.id
    where v.id = (item ->> 'variant_id')::uuid
      and v.status = 'active'::public.product_status
    for update of i;

    if not found or variant_row.on_hand - variant_row.reserved < item_quantity then
      raise exception 'Variant unavailable or insufficient stock';
    end if;

    item_total := round(variant_row.price_tnd * item_quantity, 3);
    subtotal := subtotal + item_total;
  end loop;

  insert into public.orders (
    order_number, profile_id, customer_email, customer_phone, status,
    payment_method, payment_status, subtotal_tnd, shipping_cost_tnd,
    total_tnd, shipping_address_snapshot
  )
  values (
    'VM-' || upper(encode(extensions.gen_random_bytes(6), 'hex')),
    current_profile, p_customer_email, p_customer_phone, 'confirmed',
    'cash_on_delivery', 'pending', subtotal, p_shipping_cost_tnd,
    subtotal + p_shipping_cost_tnd, p_shipping_address
  )
  returning * into created;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item ->> 'quantity')::integer;

    select v.id, v.product_id, v.name, v.sku, v.price_tnd,
           i.on_hand, i.reserved
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

    insert into public.inventory_movements (
      variant_id, order_id, actor_id, movement_type,
      quantity_before, quantity_change, quantity_after,
      reserved_before, reserved_change, reserved_after, reason
    )
    values (
      variant_row.id, created.id, current_profile, 'reserve',
      variant_row.on_hand, 0, variant_row.on_hand,
      variant_row.reserved, item_quantity,
      variant_row.reserved + item_quantity, 'Order reservation'
    );
  end loop;

  insert into public.idempotency_keys (
    profile_id, idempotency_key, request_hash, order_id, expires_at
  )
  values (
    current_profile, p_idempotency_key, p_request_hash, created.id,
    now() + interval '24 hours'
  );

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
  select *
    into target
  from public.orders
  where id = p_order_id
    and (profile_id = auth.uid() or public.is_admin())
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if target.status in ('shipped', 'delivered', 'returned', 'refunded') then
    raise exception 'Order cannot be cancelled from its current status';
  end if;
  if target.status = 'cancelled' then
    return target;
  end if;

  for item in
    select variant_id, quantity
    from public.order_items
    where order_id = target.id and variant_id is not null
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

    insert into public.inventory_movements (
      variant_id, order_id, actor_id, movement_type,
      quantity_before, quantity_change, quantity_after,
      reserved_before, reserved_change, reserved_after, reason
    )
    values (
      item.variant_id, target.id, auth.uid(), 'release',
      inventory_row.on_hand, 0, inventory_row.on_hand,
      inventory_row.reserved, -item.quantity,
      inventory_row.reserved - item.quantity, 'Order cancellation'
    );
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

  select *
    into target
  from public.orders
  where id = p_order_id
    and status in ('confirmed', 'processing')
  for update;

  if not found then
    raise exception 'Order is not ready for shipment';
  end if;

  for item in
    select variant_id, quantity
    from public.order_items
    where order_id = target.id and variant_id is not null
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

    insert into public.inventory_movements (
      variant_id, order_id, actor_id, movement_type,
      quantity_before, quantity_change, quantity_after,
      reserved_before, reserved_change, reserved_after, reason
    )
    values (
      item.variant_id, target.id, auth.uid(), 'sale',
      inventory_row.on_hand, -item.quantity,
      inventory_row.on_hand - item.quantity,
      inventory_row.reserved, -item.quantity,
      inventory_row.reserved - item.quantity, 'Order shipment'
    );
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
  if not public.is_stock_manager()
     or p_delta = 0
     or nullif(btrim(p_reason), '') is null then
    raise exception 'Invalid inventory adjustment';
  end if;

  select * into current_inventory
  from public.inventory
  where variant_id = p_variant_id
  for update;

  if not found
     or current_inventory.on_hand + p_delta < current_inventory.reserved then
    raise exception 'Inventory adjustment would make stock invalid';
  end if;

  update public.inventory
  set on_hand = on_hand + p_delta
  where variant_id = p_variant_id
  returning * into updated_inventory;

  insert into public.inventory_movements (
    variant_id, actor_id, movement_type,
    quantity_before, quantity_change, quantity_after,
    reserved_before, reserved_change, reserved_after, reason
  )
  values (
    p_variant_id, auth.uid(), 'adjustment',
    current_inventory.on_hand, p_delta, updated_inventory.on_hand,
    current_inventory.reserved, 0, updated_inventory.reserved, p_reason
  );

  return updated_inventory;
end;
$$;

create constraint trigger order_items_totals_check
after insert or update or delete on public.order_items
deferrable initially deferred
for each row execute function public.validate_order_totals();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create index orders_profile_created_idx
  on public.orders(profile_id, created_at desc);
create index orders_status_created_idx
  on public.orders(status, created_at desc);
create index orders_payment_status_created_idx
  on public.orders(payment_status, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create unique index order_items_one_variant_per_order_idx
  on public.order_items(order_id, variant_id)
  where variant_id is not null;
create index inventory_movements_variant_created_idx
  on public.inventory_movements(variant_id, created_at desc);
create index inventory_movements_order_idx
  on public.inventory_movements(order_id);
create index audit_logs_resource_created_idx
  on public.audit_logs(resource_type, resource_id, created_at desc);
create index audit_logs_user_created_idx
  on public.audit_logs(user_id, created_at desc);
create index audit_logs_created_idx
  on public.audit_logs(created_at);
create index idempotency_keys_expires_idx
  on public.idempotency_keys(expires_at);
