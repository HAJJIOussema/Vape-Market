SET local check_function_bodies = off;

DROP POLICY "addresses_admin_read" ON "public"."addresses";

DROP POLICY "addresses_owner_delete" ON "public"."addresses";

DROP POLICY "addresses_owner_read" ON "public"."addresses";

DROP POLICY "addresses_owner_update" ON "public"."addresses";

DROP POLICY "addresses_owner_write" ON "public"."addresses";

DROP POLICY "addresses_super_admin_manage" ON "public"."addresses";

DROP POLICY "audit_logs_super_admin_read" ON "public"."audit_logs";

DROP POLICY "cart_items_owner_manage" ON "public"."cart_items";

DROP POLICY "carts_owner_manage" ON "public"."carts";

DROP POLICY "categories_admin_read" ON "public"."categories";

DROP POLICY "categories_public_read" ON "public"."categories";

DROP POLICY "categories_staff_manage" ON "public"."categories";

DROP POLICY "inventory_staff_insert" ON "public"."inventory";

DROP POLICY "inventory_staff_read" ON "public"."inventory";

DROP POLICY "inventory_staff_update" ON "public"."inventory";

DROP POLICY "order_items_admin_read" ON "public"."order_items";

DROP POLICY "order_items_customer_read" ON "public"."order_items";

DROP POLICY "order_items_super_admin_manage" ON "public"."order_items";

DROP POLICY "orders_admin_read" ON "public"."orders";

DROP POLICY "orders_customer_read" ON "public"."orders";

DROP POLICY "orders_super_admin_manage" ON "public"."orders";

DROP POLICY "images_admin_read" ON "public"."product_images";

DROP POLICY "images_public_read" ON "public"."product_images";

DROP POLICY "images_staff_manage" ON "public"."product_images";

DROP POLICY "variants_admin_read" ON "public"."product_variants";

DROP POLICY "variants_public_read" ON "public"."product_variants";

DROP POLICY "variants_staff_manage" ON "public"."product_variants";

DROP POLICY "products_admin_read" ON "public"."products";

DROP POLICY "products_public_read" ON "public"."products";

DROP POLICY "products_staff_manage" ON "public"."products";

DROP POLICY "profiles_admin_read" ON "public"."profiles";

DROP POLICY "profiles_self_read" ON "public"."profiles";

DROP POLICY "profiles_self_update" ON "public"."profiles";

DROP POLICY "profiles_super_admin_manage" ON "public"."profiles";

DROP TRIGGER "categories_validate_depth" ON "public"."categories";

DROP INDEX "public"."categories_one_parent_name_idx";

DROP INDEX "public"."categories_parent_active_order_idx";

DROP INDEX "public"."idempotency_keys_expires_idx";

DROP INDEX "public"."orders_payment_status_created_idx";

DROP INDEX "public"."orders_status_created_idx";

DROP INDEX "public"."product_variants_product_active_idx";

DROP INDEX "public"."products_active_created_idx";

DROP INDEX "public"."products_brand_active_idx";

DROP INDEX "public"."products_category_active_idx";

DROP INDEX "public"."profiles_role_idx";

ALTER TABLE "public"."audit_logs"
  DROP CONSTRAINT "audit_logs_user_id_fkey";

ALTER TABLE "public"."categories"
  DROP CONSTRAINT "categories_check";

ALTER TABLE "public"."categories"
  DROP CONSTRAINT "categories_parent_id_fkey";

ALTER TABLE "public"."idempotency_keys"
  DROP CONSTRAINT "idempotency_keys_check";

ALTER TABLE "public"."idempotency_keys"
  DROP CONSTRAINT "idempotency_keys_idempotency_key_check";

ALTER TABLE "public"."idempotency_keys"
  DROP CONSTRAINT "idempotency_keys_profile_id_fkey";

ALTER TABLE "public"."idempotency_keys"
  DROP CONSTRAINT "idempotency_keys_profile_id_idempotency_key_key";

ALTER TABLE "public"."idempotency_keys"
  DROP CONSTRAINT "idempotency_keys_request_hash_check";

ALTER TABLE "public"."inventory_movements"
  DROP CONSTRAINT "inventory_movements_actor_id_fkey";

ALTER TABLE "public"."inventory_movements"
  DROP CONSTRAINT "inventory_movements_order_id_fkey";

ALTER TABLE "public"."inventory_movements"
  DROP CONSTRAINT "inventory_movements_variant_id_fkey";

ALTER TABLE "public"."orders"
  DROP CONSTRAINT "orders_check";

ALTER TABLE "public"."orders"
  DROP CONSTRAINT "orders_payment_method_check";

ALTER TABLE "public"."orders"
  DROP CONSTRAINT "orders_profile_id_fkey";

ALTER TABLE "public"."product_images"
  DROP CONSTRAINT "product_images_storage_path_check";

ALTER TABLE "public"."product_variants"
  DROP CONSTRAINT "product_variants_check";

ALTER TABLE "public"."products"
  DROP CONSTRAINT "products_brand_id_fkey";

ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_id_fkey";

DROP FUNCTION "public"."create_order"(text, text, jsonb, text, text, jsonb, numeric, uuid);

DROP FUNCTION "public"."current_user_role"();

DROP FUNCTION "public"."has_role"(public.user_role);

DROP FUNCTION "public"."is_super_admin"();

DROP FUNCTION "public"."validate_category_depth"();

ALTER TABLE "public"."orders"
  ALTER COLUMN "payment_status" DROP DEFAULT;

ALTER TABLE "public"."orders"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "public"."addresses"
  DROP COLUMN "address_type";

DROP TYPE "public"."address_type";

ALTER TABLE "public"."categories"
  DROP COLUMN "image_path";

ALTER TABLE "public"."categories"
  DROP COLUMN "parent_id";

ALTER TABLE "public"."idempotency_keys"
  DROP COLUMN "expires_at";

ALTER TABLE "public"."orders"
  DROP COLUMN "carrier";

ALTER TABLE "public"."orders"
  DROP COLUMN "payment_method";

ALTER TABLE "public"."orders"
  DROP COLUMN "tracking_number";

ALTER TABLE "public"."product_images"
  DROP COLUMN "storage_path";

ALTER TABLE "public"."product_variants"
  DROP COLUMN "status";

ALTER TABLE "public"."products"
  DROP COLUMN "brand_id";

ALTER TABLE "public"."products"
  DROP COLUMN "status";

DROP TYPE "public"."product_status";

ALTER TABLE "public"."profiles"
  DROP COLUMN "anonymized_at";

DROP TABLE "public"."audit_logs";

DROP TABLE "public"."brands";

DROP TABLE "public"."inventory_movements";

DROP TYPE "public"."inventory_movement_type";

CREATE TABLE "public"."payment_transactions" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "order_id"           uuid                     NOT NULL,
  "provider"           text,
  "provider_reference" text,
  "status"             text                     NOT NULL,
  "amount_tnd"         numeric(12,3)            NOT NULL,
  "currency"           character(3)             NOT NULL DEFAULT 'TND'::bpchar,
  "metadata"           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "payment_transactions_amount_tnd_check" CHECK ((amount_tnd >= (0)::numeric)),
  CONSTRAINT "payment_transactions_currency_check" CHECK ((currency = 'TND'::bpchar)),
  CONSTRAINT "payment_transactions_metadata_check" CHECK ((jsonb_typeof(metadata) = 'object'::text)),
  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY (id),
  CONSTRAINT "payment_transactions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])))
);

ALTER TABLE "public"."payment_transactions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."payment_transactions" FROM "anon", "authenticated";

CREATE TABLE "public"."stock_movements" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "variant_id"     uuid                     NOT NULL,
  "order_id"       uuid,
  "movement_type"  text                     NOT NULL,
  "quantity"       integer                  NOT NULL,
  "on_hand_after"  integer                  NOT NULL,
  "reserved_after" integer                  NOT NULL,
  "reason"         text                     NOT NULL,
  "actor_id"       uuid,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stock_movements_movement_type_check" CHECK ((movement_type = ANY (ARRAY['restock'::text, 'reserve'::text, 'release'::text, 'sale'::text, 'adjustment'::text]))),
  CONSTRAINT "stock_movements_on_hand_after_check" CHECK ((on_hand_after >= 0)),
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY (id),
  CONSTRAINT "stock_movements_quantity_check" CHECK ((quantity > 0)),
  CONSTRAINT "stock_movements_reserved_after_check" CHECK ((reserved_after >= 0))
);

ALTER TABLE "public"."stock_movements"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."stock_movements" FROM "anon";

ALTER TABLE "public"."orders"
  ADD COLUMN "guest_access_token_hash" text;

ALTER TABLE "public"."orders"
  ADD COLUMN "guest_token_expires_at" timestamp WITH time zone;

ALTER TABLE "public"."orders"
  ADD COLUMN "guest_access_revoked_at" timestamp WITH time zone;

ALTER TABLE "public"."product_images"
  ADD COLUMN "cloudinary_public_id" text NOT NULL;

ALTER TABLE "public"."product_images"
  ADD COLUMN "secure_url" text NOT NULL;

ALTER TABLE "public"."product_variants"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."products"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."idempotency_keys"
  ALTER COLUMN "profile_id" DROP NOT NULL;

ALTER TABLE "public"."orders"
  ALTER COLUMN "payment_status" DROP DEFAULT;

ALTER TABLE "public"."orders"
  ALTER COLUMN "payment_status" TYPE text USING "payment_status"::text;

ALTER TABLE "public"."orders"
  ALTER COLUMN "payment_status" SET DEFAULT 'not_required'::text;

DROP TYPE "public"."payment_status";

ALTER TABLE "public"."orders"
  ALTER COLUMN "profile_id" DROP NOT NULL;

ALTER TABLE "public"."orders"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "public"."orders"
  ALTER COLUMN "status" TYPE text USING "status"::text;

ALTER TABLE "public"."orders"
  ALTER COLUMN "status" SET DEFAULT 'pending'::text;

DROP TYPE "public"."order_status";

ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" TYPE text USING "role"::text;

ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" SET DEFAULT 'customer'::text;

DROP TYPE "public"."user_role";

ALTER TABLE "public"."orders"
  ALTER COLUMN "payment_status" SET DEFAULT 'not_required'::text;

ALTER TABLE "public"."orders"
  ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" SET DEFAULT 'customer'::text;

CREATE OR REPLACE FUNCTION public.adjust_inventory (
  p_variant_id uuid,
  p_delta      integer,
  p_reason     text
)
  RETURNS public.inventory
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.cancel_order (
  p_order_id uuid
)
  RETURNS public.orders
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_order (
  p_idempotency_key         text,
  p_request_hash            text,
  p_items                   jsonb,
  p_customer_email          text,
  p_customer_phone          text,
  p_shipping_address        jsonb,
  p_shipping_cost_tnd       numeric                  DEFAULT 0,
  p_guest_access_token_hash text                     DEFAULT NULL::text,
  p_guest_token_expires_at  timestamp with time zone DEFAULT NULL::timestamp WITH time zone,
  p_profile_id              uuid                     DEFAULT NULL::uuid
)
  RETURNS public.orders
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."create_order"(text, text, jsonb, text, text, jsonb, numeric, text, timestamp WITH time zone, uuid) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_stock_manager()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'stock_manager')
  );
$function$;

CREATE OR REPLACE FUNCTION public.prevent_client_role_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator can change profile roles';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ship_order (
  p_order_id uuid
)
  RETURNS public.orders
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_order_totals()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_product_variant_state()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
declare
  affected_product_id uuid;
begin
  affected_product_id := case
    when tg_table_name = 'products' then coalesce(new.id, old.id)
    else coalesce(new.product_id, old.product_id)
  end;

  if exists (
    select 1 from public.products p
    where p.id = affected_product_id and p.is_active
  ) and not exists (
    select 1
    from public.product_variants v
    where v.product_id = affected_product_id
      and v.is_active
      and v.is_default
  ) then
    raise exception 'An active product must have an active default variant';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

ALTER TABLE "public"."idempotency_keys"
  ADD CONSTRAINT "idempotency_keys_idempotency_key_key" UNIQUE (idempotency_key);

ALTER TABLE "public"."idempotency_keys"
  ADD CONSTRAINT "idempotency_keys_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_check1" CHECK ((total_tnd = (subtotal_tnd + shipping_cost_tnd)));

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_check" CHECK ((((profile_id IS NOT NULL) AND (guest_access_token_hash IS NULL)) OR ((profile_id IS NULL) AND (guest_access_token_hash IS
    NOT NULL) AND (guest_token_expires_at IS NOT NULL))));

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_payment_status_check" CHECK ((payment_status = ANY (ARRAY['not_required'::text, 'pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])));

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])));

ALTER TABLE "public"."payment_transactions"
  ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;

ALTER TABLE "public"."product_variants"
  ADD CONSTRAINT "product_variants_check" CHECK (((NOT is_default) OR is_active));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['customer'::text, 'admin'::text, 'stock_manager'::text])));

ALTER TABLE "public"."stock_movements"
  ADD CONSTRAINT "stock_movements_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."stock_movements"
  ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."stock_movements"
  ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;

CREATE INDEX categories_active_order_idx ON public.categories USING btree (is_active, sort_order);

CREATE INDEX orders_status_created_idx ON public.orders USING btree (status, created_at);

CREATE INDEX payment_transactions_order_idx ON public.payment_transactions USING btree (order_id);

CREATE INDEX product_variants_product_active_idx ON public.product_variants USING btree (product_id, is_active);

CREATE INDEX products_active_created_idx ON public.products USING btree (is_active, created_at DESC);

CREATE INDEX products_category_active_idx ON public.products USING btree (category_id, is_active);

CREATE INDEX stock_movements_order_idx ON public.stock_movements USING btree (order_id);

CREATE INDEX stock_movements_variant_created_idx ON public.stock_movements USING btree (variant_id, created_at DESC);

CREATE TRIGGER payment_transactions_set_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "addresses_owner_all" ON "public"."addresses"
  FOR ALL
  TO "authenticated"
  USING (((profile_id = auth.uid()) OR public.is_admin()))
  WITH CHECK (((profile_id = auth.uid()) OR public.is_admin()));

CREATE POLICY "cart_items_owner_all" ON "public"."cart_items"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND ((c.profile_id = auth.uid()) OR public.is_admin())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.carts c
  WHERE ((c.id = cart_items.cart_id) AND ((c.profile_id = auth.uid()) OR public.is_admin())))));

CREATE POLICY "carts_owner_all" ON "public"."carts"
  FOR ALL
  TO "authenticated"
  USING (((profile_id = auth.uid()) OR public.is_admin()))
  WITH CHECK (((profile_id = auth.uid()) OR public.is_admin()));

CREATE POLICY "categories_admin_manage" ON "public"."categories"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "categories_public_read" ON "public"."categories"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((is_active OR public.is_admin()));

CREATE POLICY "inventory_stock_read" ON "public"."inventory"
  FOR SELECT
  TO "authenticated"
  USING (public.is_stock_manager());

CREATE POLICY "order_items_owner_or_admin_read" ON "public"."order_items"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND ((o.profile_id = auth.uid()) OR public.is_admin())))));

CREATE POLICY "orders_owner_or_admin_read" ON "public"."orders"
  FOR SELECT
  TO "authenticated"
  USING (((profile_id = auth.uid()) OR public.is_admin()));

CREATE POLICY "payment_transactions_admin_read" ON "public"."payment_transactions"
  FOR SELECT
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "images_admin_manage" ON "public"."product_images"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "images_public_read" ON "public"."product_images"
  FOR SELECT
  TO "anon", "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND p.is_active))) OR public.is_admin()));

CREATE POLICY "variants_admin_manage" ON "public"."product_variants"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "variants_public_read" ON "public"."product_variants"
  FOR SELECT
  TO "anon", "authenticated"
  USING (((is_active AND (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND p.is_active)))) OR public.is_admin()));

CREATE POLICY "products_admin_manage" ON "public"."products"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "products_public_read" ON "public"."products"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((is_active OR public.is_admin()));

CREATE POLICY "profiles_self_read" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY "profiles_self_update" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING (((id = auth.uid()) OR public.is_admin()))
  WITH CHECK (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY "stock_movements_stock_read" ON "public"."stock_movements"
  FOR SELECT
  TO "authenticated"
  USING (public.is_stock_manager());

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

REVOKE ALL ON FUNCTION "public"."create_order"(text, text, jsonb, text, text, jsonb, numeric, text, timestamp WITH time zone, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_order"(text, text, jsonb, text, text, jsonb, numeric, text, timestamp WITH time zone, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_order"(text, text, jsonb, text, text, jsonb, numeric, text, timestamp WITH time zone, uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM "anon";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "anon";

REVOKE ALL ON FUNCTION "public"."is_stock_manager"() FROM "anon";

GRANT EXECUTE ON FUNCTION "public"."is_stock_manager"() TO "anon";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

REVOKE ALL ON TABLE "public"."addresses" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."addresses" TO "anon";

REVOKE ALL ON TABLE "public"."addresses" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."addresses" TO "authenticated";

REVOKE ALL ON TABLE "public"."cart_items" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cart_items" TO "anon";

REVOKE ALL ON TABLE "public"."cart_items" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cart_items" TO "authenticated";

REVOKE ALL ON TABLE "public"."carts" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."carts" TO "anon";

REVOKE ALL ON TABLE "public"."carts" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."carts" TO "authenticated";

REVOKE ALL ON TABLE "public"."categories" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "anon";

REVOKE ALL ON TABLE "public"."categories" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "authenticated";

REVOKE ALL ON TABLE "public"."inventory" FROM "authenticated";

GRANT SELECT ON TABLE "public"."inventory" TO "authenticated";

REVOKE ALL ON TABLE "public"."order_items" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."order_items" TO "anon";

REVOKE ALL ON TABLE "public"."order_items" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."order_items" TO "authenticated";

REVOKE ALL ON TABLE "public"."orders" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."orders" TO "anon";

REVOKE ALL ON TABLE "public"."orders" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."orders" TO "authenticated";

REVOKE ALL ON TABLE "public"."payment_transactions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_transactions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_transactions" TO "service_role";

REVOKE ALL ON TABLE "public"."product_images" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_images" TO "anon";

REVOKE ALL ON TABLE "public"."product_images" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_images" TO "authenticated";

REVOKE ALL ON TABLE "public"."product_variants" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_variants" TO "anon";

REVOKE ALL ON TABLE "public"."product_variants" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_variants" TO "authenticated";

REVOKE ALL ON TABLE "public"."products" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products" TO "anon";

REVOKE ALL ON TABLE "public"."products" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products" TO "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon";

REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ON TABLE "public"."stock_movements" FROM "authenticated";

GRANT SELECT ON TABLE "public"."stock_movements" TO "authenticated";

REVOKE ALL ON TABLE "public"."stock_movements" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stock_movements" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stock_movements" TO "service_role";

