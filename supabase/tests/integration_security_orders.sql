begin;

select plan(38);

create temporary table test_ids (
  customer_id uuid not null,
  other_customer_id uuid not null,
  admin_id uuid not null,
  stock_manager_id uuid not null,
  category_id uuid not null,
  product_id uuid not null,
  variant_id uuid not null,
  second_variant_id uuid not null
) on commit drop;

insert into test_ids values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
select customer_id, 'authenticated', 'authenticated', 'integration-customer@example.test', 'not-a-password', now()
from test_ids
union all
select other_customer_id, 'authenticated', 'authenticated', 'integration-other@example.test', 'not-a-password', now()
from test_ids
union all
select admin_id, 'authenticated', 'authenticated', 'integration-admin@example.test', 'not-a-password', now()
from test_ids
union all
select stock_manager_id, 'authenticated', 'authenticated', 'integration-stock@example.test', 'not-a-password', now()
from test_ids;

delete from public.profiles
where id in (
  (select customer_id from test_ids),
  (select other_customer_id from test_ids),
  (select admin_id from test_ids),
  (select stock_manager_id from test_ids)
);

insert into public.profiles (id, role, full_name)
select customer_id, 'customer', 'Integration customer'
from test_ids
union all
select other_customer_id, 'customer', 'Integration other'
from test_ids
union all
select admin_id, 'admin', 'Integration administrator'
from test_ids
union all
select stock_manager_id, 'stock_manager', 'Integration stock manager'
from test_ids;

insert into public.categories (id, name, slug)
select category_id, 'Integration category', 'integration-category'
from test_ids;

insert into public.products (id, category_id, name, slug, is_active)
select product_id, category_id, 'Integration product', 'integration-product', false
from test_ids;

insert into public.product_variants (
  id, product_id, sku, name, price_tnd, is_default, is_active
)
select variant_id, product_id, 'INTEGRATION-001', 'Integration variant', 10.000, true, true
from test_ids
union all
select second_variant_id, product_id, 'INTEGRATION-002', 'Integration second variant', 12.000, false, true
from test_ids;

update public.products
set is_active = true
where id = (select product_id from test_ids);

insert into public.inventory (variant_id, on_hand, reserved)
select variant_id, 3, 0
from test_ids
union all
select second_variant_id, 1, 0
from test_ids;

insert into public.orders (
  id, order_number, profile_id, customer_email, customer_phone,
  status, subtotal_tnd, shipping_cost_tnd, total_tnd, shipping_address_snapshot
)
values (
  '00000000-0000-0000-0000-000000000021',
  'VM-INTEGRATION-OWNER',
  (select customer_id from test_ids),
  'integration-customer@example.test',
  '+21600000001',
  'confirmed',
  0,
  0,
  0,
  '{"city":"Tunis"}'::jsonb
), (
  '00000000-0000-0000-0000-000000000022',
  'VM-INTEGRATION-OTHER',
  (select other_customer_id from test_ids),
  'integration-other@example.test',
  '+21600000002',
  'confirmed',
  0,
  0,
  0,
  '{"city":"Sousse"}'::jsonb
), (
  '00000000-0000-0000-0000-000000000023',
  'VM-INTEGRATION-GUEST',
  null,
  'integration-guest@example.test',
  '+21600000003',
  'confirmed',
  0,
  0,
  0,
  '{"city":"Sfax"}'::jsonb
);

update public.orders
set guest_access_token_hash = 'integration-guest-hash',
    guest_token_expires_at = now() + interval '1 hour'
where id = '00000000-0000-0000-0000-000000000023';

set local role anon;
select is(
  (select count(*) from public.products where id = (select product_id from test_ids)),
  1::bigint,
  'anonymous users can read active public products'
);
select is(
  (select count(*) from public.profiles),
  0::bigint,
  'anonymous users cannot read profiles'
);
select is(
  (select count(*) from public.orders),
  0::bigint,
  'anonymous users cannot read protected orders'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select customer_id::text from test_ids),
  true
);
set local role authenticated;
select is(
  (select count(*) from public.orders where profile_id = (select customer_id from test_ids)),
  1::bigint,
  'an owner can read their own order'
);
select is(
  (select count(*) from public.orders where profile_id = (select other_customer_id from test_ids)),
  0::bigint,
  'an owner cannot read another customer order'
);
select lives_ok(
  $$ update public.profiles set full_name = 'Updated integration name'
     where id = '00000000-0000-0000-0000-000000000001' $$,
  'an owner can update an allowed profile field'
);
select throws_ok(
  $$ update public.profiles set role = 'admin'
     where id = '00000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'a customer cannot change their profile role'
);
select throws_ok(
  $$ select public.cancel_order('00000000-0000-0000-0000-000000000022') $$,
  'P0001',
  'Order not found',
  'a customer cannot cancel another customer order'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select other_customer_id::text from test_ids),
  true
);
set local role authenticated;
select is(
  (select count(*) from public.orders where id = '00000000-0000-0000-0000-000000000021'),
  0::bigint,
  'a non-owner cannot read the owner order'
);
select throws_ok(
  $$ select public.cancel_order('00000000-0000-0000-0000-000000000021') $$,
  'P0001',
  'Order not found',
  'a non-owner cannot cancel the owner order'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select admin_id::text from test_ids),
  true
);
set local role authenticated;
select is(
  (select count(*) from public.products where id = (select product_id from test_ids)),
  1::bigint,
  'an administrator can read catalog data'
);
select throws_ok(
  $$ select * from public.payment_transactions $$,
  '42501',
  null,
  'payment data is not exposed through the current administrator table grant'
);
select throws_ok(
  $$ update public.profiles set role = 'customer'
     where id = '00000000-0000-0000-0000-000000000004' $$,
  '42501',
  null,
  'role updates remain unavailable through the authenticated SQL grant'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  (select stock_manager_id::text from test_ids),
  true
);
set local role authenticated;
select is(
  (select count(*) from public.inventory),
  2::bigint,
  'a stock manager can read inventory'
);
select throws_ok(
  $$ select * from public.payment_transactions $$,
  '42501',
  null,
  'a stock manager cannot read payment transactions'
);
select lives_ok(
  $$ select public.adjust_inventory(
       '00000000-0000-0000-0000-000000000013', 1, 'integration restock'
     ) $$,
  'a stock manager can execute an inventory adjustment'
);
reset role;

select skip(
  4,
  'no existing function or RLS policy consults guest_access_token_hash, expiry, or revocation'
);

set local role service_role;
select throws_ok(
  $$ select public.create_order(
       'integration-insufficient',
       'hash-insufficient',
       '[{"variant_id":"00000000-0000-0000-0000-000000000014","quantity":2}]'::jsonb,
       'integration-guest@example.test',
       '+21600000003',
       '{"city":"Tunis"}'::jsonb,
       0,
       'integration-insufficient-token',
       now() + interval '1 hour',
       null
     ) $$,
  'P0001',
  'Variant unavailable or insufficient stock',
  'an order exceeding available stock is rejected'
);
select is(
  (select on_hand from public.inventory
   where variant_id = '00000000-0000-0000-0000-000000000014'),
  1,
  'insufficient stock leaves on_hand unchanged'
);
select is(
  (select reserved from public.inventory
   where variant_id = '00000000-0000-0000-0000-000000000014'),
  0,
  'insufficient stock leaves reserved unchanged'
);
select is(
  (select count(*) from public.stock_movements
   where variant_id = '00000000-0000-0000-0000-000000000014'),
  0::bigint,
  'insufficient stock creates no movement'
);

select lives_ok(
  $$ select public.create_order(
       'integration-idempotency',
       'hash-original',
       '[{"variant_id":"00000000-0000-0000-0000-000000000013","quantity":1}]'::jsonb,
       'integration-guest@example.test',
       '+21600000003',
       '{"city":"Tunis"}'::jsonb,
       0,
       'integration-idempotency-token',
       now() + interval '1 hour',
       null
     ) $$,
  'the first idempotent order is created'
);
select throws_ok(
  $$ select public.create_order(
       'integration-idempotency',
       'hash-different',
       '[{"variant_id":"00000000-0000-0000-0000-000000000013","quantity":1}]'::jsonb,
       'integration-guest@example.test',
       '+21600000003',
       '{"city":"Tunis"}'::jsonb,
       0,
       'integration-idempotency-token',
       now() + interval '1 hour',
       null
     ) $$,
  'P0001',
  'Idempotency key was reused with a different request',
  'an idempotency key cannot be reused with a different request hash'
);
select is(
  (select count(*) from public.idempotency_keys
   where idempotency_key = 'integration-idempotency'),
  1::bigint,
  'a reused idempotency key has one key row'
);
select is(
  (select count(*) from public.stock_movements
   where variant_id = '00000000-0000-0000-0000-000000000013'),
  1::bigint,
  'a rejected idempotent retry creates no extra movement'
);

select set_config(
  'request.jwt.claim.sub',
  (select customer_id::text from test_ids),
  true
);
select lives_ok(
  $$ select public.create_order(
       'integration-cancel',
       'hash-cancel',
       '[{"variant_id":"00000000-0000-0000-0000-000000000013","quantity":1}]'::jsonb,
       'integration-customer@example.test',
       '+21600000001',
       '{"city":"Tunis"}'::jsonb,
       0,
       null,
       null,
       (select customer_id from test_ids)
     ) $$,
  'the cancellable order is created'
);
select lives_ok(
  $$ select public.cancel_order(
       (select order_id from public.idempotency_keys
        where idempotency_key = 'integration-cancel')
     ) $$,
  'an owner can cancel an order'
);
select lives_ok(
  $$ select public.cancel_order(
       (select order_id from public.idempotency_keys
        where idempotency_key = 'integration-cancel')
     ) $$,
  'repeating cancellation is idempotent'
);
select is(
  (select reserved from public.inventory
   where variant_id = '00000000-0000-0000-0000-000000000013'),
  1,
  'repeated cancellation releases a reservation only once'
);

select set_config(
  'request.jwt.claim.sub',
  (select stock_manager_id::text from test_ids),
  true
);
select lives_ok(
  $$ select public.create_order(
       'integration-ship',
       'hash-ship',
       '[{"variant_id":"00000000-0000-0000-0000-000000000013","quantity":1}]'::jsonb,
       'integration-stock@example.test',
       '+21600000004',
       '{"city":"Tunis"}'::jsonb,
       0,
       null,
       null,
       (select stock_manager_id from test_ids)
     ) $$,
  'the shippable order is created'
);
select lives_ok(
  $$ select public.ship_order(
       (select order_id from public.idempotency_keys
        where idempotency_key = 'integration-ship')
     ) $$,
  'a stock manager can ship an order'
);
select throws_ok(
  $$ select public.ship_order(
       (select order_id from public.idempotency_keys
        where idempotency_key = 'integration-ship')
     ) $$,
  'P0001',
  'Order is not ready for shipment',
  'repeated shipment is rejected'
);
select is(
  (select on_hand from public.inventory
   where variant_id = '00000000-0000-0000-0000-000000000013'),
  3,
  'repeated shipment decrements physical stock only once'
);
select is(
  (select reserved from public.inventory
   where variant_id = '00000000-0000-0000-0000-000000000013'),
  1,
  'shipment consumes its reservation exactly once'
);

select * from finish();
rollback;
