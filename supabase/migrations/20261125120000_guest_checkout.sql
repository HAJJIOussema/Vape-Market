-- ============================================================
-- Migration : guest_checkout
-- Date      : 2026-11-25
-- Purpose   :
--   1. Allow cash-on-delivery orders without a customer account, called
--      directly from the browser (no backend): public.checkout() validates
--      every input, computes prices/shipping/request hash in the database
--      and throttles guest orders. Guest orders have profile_id = null and
--      store only the SHA-256 hash of a random access token that lets the
--      guest look up their order (public.lookup_guest_order()).
--   2. Move the order placement logic into one internal function shared by
--      create_order (authenticated, kept for compatibility) and checkout(),
--      and fix these bugs of the previous create_order:
--        - duplicate lines for the same variant violated
--          order_items_one_variant_per_order_idx; lines are now merged;
--        - stock was checked without a lock, then reserved without a
--          re-check; rows are now locked (in a deterministic order, to avoid
--          deadlocks) before the check;
--        - products.is_active / product_variants.is_active only exist on
--          the linked remote schema; the activity check now works on both;
--        - idempotency_keys.expires_at (local schema) had no default while
--          create_order no longer provided it.
--
-- Non destructive: no table, column or row is dropped. Every DDL statement
-- is guarded so the migration also applies to the drifted remote schema
-- (see supabase/archive/20261030141959_remote_schema.sql).
-- ============================================================

-- ── 1. Schema ────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists guest_access_token_hash text,
  add column if not exists guest_token_expires_at timestamptz,
  add column if not exists guest_access_revoked_at timestamptz;

alter table public.orders alter column profile_id drop not null;
alter table public.idempotency_keys alter column profile_id drop not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'idempotency_keys'
      and column_name = 'expires_at'
  ) then
    alter table public.idempotency_keys
      alter column expires_at set default (now() + interval '24 hours');
  end if;

  -- Every order belongs to a profile, or is a guest order with an access token.
  -- NOT VALID: enforced for new rows without rejecting legacy rows.
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_owner_or_guest_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_owner_or_guest_check check (
        profile_id is not null
        or (guest_access_token_hash is not null and guest_token_expires_at is not null)
      ) not valid;
  end if;
end
$$;

-- unique (profile_id, idempotency_key) does not cover profile_id = null.
create unique index if not exists idempotency_keys_guest_key_idx
  on public.idempotency_keys(idempotency_key)
  where profile_id is null;

create index if not exists orders_order_number_idx
  on public.orders(order_number);

-- ── 2. Internal order placement ──────────────────────────────────────────
create or replace function public.place_order_internal(
  p_profile_id              uuid,
  p_guest_access_token_hash text,
  p_guest_token_expires_at  timestamptz,
  p_idempotency_key         text,
  p_request_hash            text,
  p_items                   jsonb,
  p_customer_email          text,
  p_customer_phone          text,
  p_shipping_address        jsonb,
  p_shipping_cost_tnd       numeric(12,3)
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  existing       public.orders;
  created        public.orders;
  item           jsonb;
  line           record;
  variant_row    record;
  item_quantity  integer;
  subtotal       numeric(12,3) := 0;
  v_random_bytes bytea;
begin
  if p_idempotency_key is null
     or length(btrim(p_idempotency_key)) < 16
     or p_request_hash is null
     or nullif(btrim(coalesce(p_customer_email, '')), '') is null
     or nullif(btrim(coalesce(p_customer_phone, '')), '') is null
     or p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50
     or p_shipping_cost_tnd is null
     or p_shipping_cost_tnd < 0
     or p_shipping_address is null
     or jsonb_typeof(p_shipping_address) <> 'object' then
    raise exception 'Invalid order request';
  end if;

  if p_profile_id is null
     and (p_guest_access_token_hash is null or p_guest_token_expires_at is null
          or p_guest_token_expires_at <= now()) then
    raise exception 'Guest orders require an expiring access token';
  end if;

  -- Serialise concurrent requests that share an idempotency key.
  perform pg_advisory_xact_lock(hashtextextended(
    coalesce(p_profile_id::text, 'guest') || ':' || p_idempotency_key, 0
  ));

  select o.* into existing
  from public.idempotency_keys k
  join public.orders o on o.id = k.order_id
  where k.idempotency_key = p_idempotency_key
    and k.profile_id is not distinct from p_profile_id
  limit 1;

  if found then
    if not exists (
      select 1 from public.idempotency_keys
      where idempotency_key = p_idempotency_key
        and profile_id is not distinct from p_profile_id
        and request_hash = p_request_hash
    ) then
      raise exception 'Idempotency key was reused with a different request';
    end if;
    return existing;
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item->>'quantity')::integer;
    if item_quantity is null or item_quantity <= 0 or item_quantity > 999 then
      raise exception 'Invalid order quantity';
    end if;
    if coalesce(item->>'variant_id', item->>'variantId') is null then
      raise exception 'Missing or invalid variant_id in order items';
    end if;
  end loop;

  -- Pass 1: lock every inventory row (ordered by variant id) and check stock.
  for line in
    select coalesce(value->>'variant_id', value->>'variantId')::uuid as variant_id,
           sum((value->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items)
    group by 1
    order by 1
  loop
    select v.id, v.price_tnd, p.name as product_name, i.on_hand, i.reserved
      into variant_row
    from public.product_variants v
    join public.products p on p.id = v.product_id
    join public.inventory i on i.variant_id = v.id
    where v.id = line.variant_id
      and (to_jsonb(p)->>'status' = 'active'
           or coalesce((to_jsonb(p)->>'is_active')::boolean, false))
      and (to_jsonb(v)->>'status' = 'active'
           or coalesce((to_jsonb(v)->>'is_active')::boolean, false))
    for update of i;

    if not found then
      raise exception 'Produit introuvable ou inactif : variant_id=%', line.variant_id;
    end if;

    if variant_row.on_hand - variant_row.reserved < line.quantity then
      raise exception 'Stock insuffisant — Produit : % | Demandé : % | Disponible : %',
        variant_row.product_name, line.quantity,
        greatest(variant_row.on_hand - variant_row.reserved, 0);
    end if;

    subtotal := subtotal + round(variant_row.price_tnd * line.quantity, 3);
  end loop;

  begin
    v_random_bytes := extensions.gen_random_bytes(6);
  exception when others then
    v_random_bytes := gen_random_bytes(6);
  end;

  insert into public.orders (
    order_number, profile_id, guest_access_token_hash, guest_token_expires_at,
    customer_email, customer_phone, status,
    subtotal_tnd, shipping_cost_tnd, total_tnd, shipping_address_snapshot
  )
  values (
    'VM-' || upper(encode(v_random_bytes, 'hex')),
    p_profile_id,
    case when p_profile_id is null then p_guest_access_token_hash end,
    case when p_profile_id is null then p_guest_token_expires_at end,
    btrim(p_customer_email),
    btrim(p_customer_phone),
    'pending',
    subtotal,
    p_shipping_cost_tnd,
    subtotal + p_shipping_cost_tnd,
    p_shipping_address
  )
  returning * into created;

  -- Pass 2: rows are already locked by this transaction.
  for line in
    select coalesce(value->>'variant_id', value->>'variantId')::uuid as variant_id,
           sum((value->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items)
    group by 1
    order by 1
  loop
    select v.id, v.name as variant_name, v.sku, v.price_tnd,
           p.name as product_name, i.on_hand, i.reserved
      into variant_row
    from public.product_variants v
    join public.products p on p.id = v.product_id
    join public.inventory i on i.variant_id = v.id
    where v.id = line.variant_id;

    insert into public.order_items (
      order_id, variant_id, product_name_snapshot, variant_name_snapshot,
      sku_snapshot, unit_price_tnd, quantity, line_total_tnd
    )
    values (
      created.id, variant_row.id, variant_row.product_name, variant_row.variant_name,
      variant_row.sku, variant_row.price_tnd, line.quantity,
      round(variant_row.price_tnd * line.quantity, 3)
    );

    update public.inventory
    set reserved = reserved + line.quantity
    where variant_id = variant_row.id;

    insert into public.inventory_movements (
      variant_id, order_id, actor_id, movement_type,
      quantity_before, quantity_change, quantity_after,
      reserved_before, reserved_change, reserved_after, reason
    )
    values (
      variant_row.id, created.id, p_profile_id, 'reserve',
      variant_row.on_hand, 0, variant_row.on_hand,
      variant_row.reserved, line.quantity, variant_row.reserved + line.quantity,
      case when p_profile_id is null then 'Guest order reservation' else 'Order reservation' end
    );
  end loop;

  insert into public.idempotency_keys (idempotency_key, request_hash, order_id, profile_id)
  values (p_idempotency_key, p_request_hash, created.id, p_profile_id);

  return created;
end;
$$;

revoke all on function public.place_order_internal(
  uuid, text, timestamptz, text, text, jsonb, text, text, jsonb, numeric
) from public, anon, authenticated;

-- ── 3. Authenticated customers (legacy signature, prefer checkout()) ────
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
  current_profile uuid := auth.uid();
begin
  if current_profile is null
     or (p_profile_id is not null and p_profile_id <> current_profile) then
    raise exception 'Invalid order request';
  end if;

  return public.place_order_internal(
    current_profile, null, null,
    p_idempotency_key, p_request_hash, p_items,
    p_customer_email, p_customer_phone, p_shipping_address,
    -- p_shipping_cost_tnd is ignored: the browser can call this function
    -- directly, so the amount is fixed server-side (same as checkout()).
    0
  );
end;
$$;

revoke all on function public.create_order(
  text, text, jsonb, text, text, jsonb, numeric, uuid
) from public, anon;
grant execute on function public.create_order(
  text, text, jsonb, text, text, jsonb, numeric, uuid
) to authenticated;

-- ── 4. Public checkout (anon = guest, authenticated = account order) ────
-- Everything the browser sends is validated here; prices, totals, shipping
-- and the request hash are computed here. Returns the order plus, for a new
-- guest order, the one-time guest_access_token (never stored in clear).
create or replace function public.checkout(
  p_idempotency_key  text,
  p_items            jsonb,
  p_customer_email   text,
  p_customer_phone   text,
  p_shipping_address jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  -- Cash on delivery, free shipping for now: decided here, not by the client.
  shipping_cost   constant numeric(12,3) := 0;
  -- Guest abuse limit (orders reserve stock): per phone or e-mail per hour.
  guest_hourly_limit constant integer := 3;
  current_profile uuid := auth.uid();
  v_email   text := lower(btrim(coalesce(p_customer_email, '')));
  v_phone   text := regexp_replace(coalesce(p_customer_phone, ''), '[\s().-]', '', 'g');
  v_address jsonb;
  v_items   jsonb;
  v_hash    text;
  v_token   text;
  v_token_hash text;
  created   public.orders;
begin
  if current_profile is not null then
    -- Account orders always use the account e-mail.
    select lower(u.email) into v_email from auth.users u where u.id = current_profile;
  end if;

  if v_email is null or length(v_email) > 254
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail invalide' using errcode = '22023';
  end if;
  if v_phone ~ '^00216' then
    v_phone := '+216' || substr(v_phone, 6);
  end if;
  if v_phone !~ '^(\+216)?[0-9]{8}$' then
    raise exception 'Téléphone invalide (format tunisien attendu)' using errcode = '22023';
  end if;
  if p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object'
     or length(btrim(coalesce(p_shipping_address->>'recipient_name', ''))) not between 1 and 160
     or length(btrim(coalesce(p_shipping_address->>'address_line', ''))) not between 1 and 255
     or length(btrim(coalesce(p_shipping_address->>'governorate', ''))) > 100
     or length(btrim(coalesce(p_shipping_address->>'city', ''))) > 100
     or coalesce(nullif(btrim(p_shipping_address->>'postal_code'), ''), '0000') !~ '^[0-9]{4}$' then
    raise exception 'Adresse de livraison invalide' using errcode = '22023';
  end if;
  -- Keep only known keys.
  v_address := jsonb_strip_nulls(jsonb_build_object(
    'recipient_name', btrim(p_shipping_address->>'recipient_name'),
    'phone', v_phone,
    'address_line', btrim(p_shipping_address->>'address_line'),
    'governorate', nullif(btrim(p_shipping_address->>'governorate'), ''),
    'city', nullif(btrim(p_shipping_address->>'city'), ''),
    'postal_code', nullif(btrim(p_shipping_address->>'postal_code'), '')
  ));

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Le panier est vide ou trop grand' using errcode = '22023';
  end if;
  begin
    select jsonb_agg(jsonb_build_object(
             'variant_id', (value->>'variant_id')::uuid,
             'quantity', (value->>'quantity')::integer))
      into v_items
    from jsonb_array_elements(p_items);
  exception when others then
    raise exception 'Invalid order request' using errcode = '22023';
  end;

  v_hash := encode(extensions.digest(convert_to(jsonb_build_object(
    'items', v_items, 'email', v_email, 'phone', v_phone,
    'address', v_address, 'shipping', shipping_cost)::text, 'UTF8'), 'sha256'), 'hex');

  if current_profile is null then
    if (select count(*) from public.orders o
        where o.profile_id is null
          and o.created_at > now() - interval '1 hour'
          and (o.customer_phone = v_phone or o.customer_email = v_email)
          and not exists (
            select 1 from public.idempotency_keys k
            where k.order_id = o.id and k.profile_id is null
              and k.idempotency_key = p_idempotency_key)
       ) >= guest_hourly_limit then
      raise exception 'Trop de commandes récentes pour ce contact, réessayez plus tard'
        using errcode = '22023';
    end if;
    v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
    v_token_hash := encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex');
  end if;

  created := public.place_order_internal(
    current_profile,
    v_token_hash,
    case when current_profile is null then now() + interval '30 days' end,
    p_idempotency_key, v_hash, v_items, v_email, v_phone, v_address, shipping_cost
  );

  return (to_jsonb(created)
      - 'guest_access_token_hash' - 'guest_token_expires_at' - 'guest_access_revoked_at')
    || jsonb_build_object(
      'order_items', coalesce((select jsonb_agg(to_jsonb(i) order by i.product_name_snapshot)
                               from public.order_items i where i.order_id = created.id), '[]'::jsonb),
      -- An idempotent replay returns the first order, whose token is unknown here.
      'guest_access_token', case
        when current_profile is null and created.guest_access_token_hash = v_token_hash then v_token
      end
    );
end;
$$;

revoke all on function public.checkout(text, jsonb, text, text, jsonb) from public;
grant execute on function public.checkout(text, jsonb, text, text, jsonb) to anon, authenticated;

-- ── 5. Guest order lookup ────────────────────────────────────────────────
-- Same "not found" (null) for every mismatch so order numbers cannot be probed.
create or replace function public.lookup_guest_order(p_order_number text, p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target public.orders;
begin
  if p_order_number is null or p_access_token is null
     or length(p_access_token) not between 20 and 128 then
    return null;
  end if;

  select * into target
  from public.orders
  where order_number = upper(btrim(p_order_number))
    and profile_id is null
    and guest_access_token_hash = encode(extensions.digest(
          convert_to(btrim(p_access_token), 'UTF8'), 'sha256'), 'hex')
    and guest_token_expires_at > now()
    and guest_access_revoked_at is null;

  if not found then
    return null;
  end if;

  return (to_jsonb(target) - 'profile_id'
      - 'guest_access_token_hash' - 'guest_token_expires_at' - 'guest_access_revoked_at')
    || jsonb_build_object('order_items', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.product_name_snapshot)
      from public.order_items i where i.order_id = target.id), '[]'::jsonb));
end;
$$;

revoke all on function public.lookup_guest_order(text, text) from public;
grant execute on function public.lookup_guest_order(text, text) to anon, authenticated;

create index if not exists orders_guest_contact_recent_idx
  on public.orders(created_at desc)
  where profile_id is null;
