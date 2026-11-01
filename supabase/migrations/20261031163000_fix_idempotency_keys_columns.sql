create or replace function public.create_order(
  p_idempotency_key   text,
  p_request_hash      text,
  p_items             jsonb,
  p_customer_email    text,
  p_customer_phone    text,
  p_shipping_address  jsonb,
  p_shipping_cost_tnd numeric(12,3) default 0,
  p_profile_id        uuid          default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  existing        public.orders;
  created         public.orders;
  item            jsonb;
  variant_row     record;
  item_quantity   integer;
  item_total      numeric(12,3);
  subtotal        numeric(12,3) := 0;
  current_profile uuid          := auth.uid();
  v_variant_id    uuid;
  v_available     integer;
  v_random_bytes  bytea;
begin
  if current_profile is null
     or (p_profile_id is not null and p_profile_id <> current_profile)
     or p_idempotency_key is null
     or p_request_hash    is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or p_shipping_cost_tnd < 0
     or jsonb_typeof(p_shipping_address) <> 'object' then
    raise exception 'Invalid order request';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(current_profile::text || ':' || p_idempotency_key, 0)
  );

  select o.* into existing
  from   public.idempotency_keys k
  join   public.orders           o on o.id = k.order_id
  where  k.profile_id      = current_profile
    and  k.idempotency_key = p_idempotency_key
  for update;

  if found then
    if not exists (
      select 1
      from   public.idempotency_keys
      where  profile_id      = current_profile
        and  idempotency_key = p_idempotency_key
        and  request_hash    = p_request_hash
    ) then
      raise exception 'Idempotency key was reused with a different request';
    end if;
    return existing;
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item->>'quantity')::integer;
    if item_quantity is null or item_quantity <= 0 then
      raise exception 'Invalid order quantity';
    end if;

    v_variant_id := coalesce(
      (item->>'variant_id')::uuid,
      (item->>'variantId')::uuid
    );
    if v_variant_id is null then
      raise exception 'Missing or invalid variant_id in order items';
    end if;

    select
      v.id,
      v.product_id,
      v.name        as variant_name,
      v.sku,
      v.price_tnd,
      p.name        as product_name,
      i.on_hand,
      i.reserved
    into variant_row
    from   public.product_variants v
    join   public.products         p  on  p.id = v.product_id
                                      and (p.status::text = 'active' or p.is_active = true)
    join   public.inventory        i  on  i.variant_id = v.id
    where  v.id = v_variant_id
      and  (v.status::text = 'active' or v.is_active = true);

    if not found then
      raise exception 'Produit introuvable ou inactif : variant_id=%', v_variant_id;
    end if;

    v_available := variant_row.on_hand - variant_row.reserved;

    if v_available < item_quantity then
      raise exception
        'Stock insuffisant — Produit : % | Demandé : % | Disponible : %',
        variant_row.product_name,
        item_quantity,
        v_available;
    end if;

    item_total := round(variant_row.price_tnd * item_quantity, 3);
    subtotal   := subtotal + item_total;
  end loop;

  begin
    v_random_bytes := extensions.gen_random_bytes(6);
  exception when others then
    v_random_bytes := gen_random_bytes(6);
  end;

  insert into public.orders (
    order_number, profile_id, customer_email, customer_phone, status,
    subtotal_tnd, shipping_cost_tnd,
    total_tnd, shipping_address_snapshot
  )
  values (
    'VM-' || upper(encode(v_random_bytes, 'hex')),
    current_profile,
    p_customer_email,
    p_customer_phone,
    'pending',
    subtotal,
    p_shipping_cost_tnd,
    subtotal + p_shipping_cost_tnd,
    p_shipping_address
  )
  returning * into created;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item->>'quantity')::integer;

    v_variant_id := coalesce(
      (item->>'variant_id')::uuid,
      (item->>'variantId')::uuid
    );

    select
      v.id,
      v.product_id,
      v.name    as variant_name,
      v.sku,
      v.price_tnd,
      p.name    as product_name,
      i.on_hand,
      i.reserved
    into variant_row
    from   public.product_variants v
    join   public.products         p  on p.id = v.product_id
    join   public.inventory        i  on i.variant_id = v.id
    where  v.id = v_variant_id
    for update of i;

    item_total := round(variant_row.price_tnd * item_quantity, 3);

    insert into public.order_items (
      order_id, variant_id, product_name_snapshot, variant_name_snapshot,
      sku_snapshot, unit_price_tnd, quantity, line_total_tnd
    )
    values (
      created.id,
      variant_row.id,
      variant_row.product_name,
      variant_row.variant_name,
      variant_row.sku,
      variant_row.price_tnd,
      item_quantity,
      item_total
    );

    update public.inventory
    set    reserved = reserved + item_quantity
    where  variant_id = variant_row.id;

    insert into public.inventory_movements (
      variant_id, order_id, actor_id, movement_type,
      quantity_before, quantity_change, quantity_after,
      reserved_before, reserved_change, reserved_after, reason
    )
    values (
      variant_row.id,
      created.id,
      current_profile,
      'reserve',
      variant_row.on_hand,
      0,
      variant_row.on_hand,
      variant_row.reserved,
      item_quantity,
      variant_row.reserved + item_quantity,
      'Order reservation'
    );
  end loop;

  insert into public.idempotency_keys (
    idempotency_key, request_hash, order_id, profile_id
  )
  values (
    p_idempotency_key,
    p_request_hash,
    created.id,
    current_profile
  );

  return created;
end;
$$;

grant execute on function public.create_order(
  text, text, jsonb, text, text, jsonb, numeric, uuid
) to authenticated;
