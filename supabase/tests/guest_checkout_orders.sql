-- Order placement tests (authenticated + guest checkout).
-- Plain SQL with ASSERT, no pgTAP required. Everything is rolled back.
-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/guest_checkout_orders.sql
begin;

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-0000000000c1', 'guest-test-customer@example.test');
insert into public.profiles (id, full_name)
values ('00000000-0000-0000-0000-0000000000c1', 'Guest test customer')
on conflict (id) do nothing;

insert into public.categories (id, name, slug)
values ('00000000-0000-0000-0000-0000000000a1', 'Guest test category', 'guest-test-category');
insert into public.brands (id, name, slug)
values ('00000000-0000-0000-0000-0000000000e1', 'Guest test brand', 'guest-test-brand');
insert into public.products (id, category_id, brand_id, name, slug, status)
values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000e1', 'Guest test puff', 'guest-test-puff', 'active'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000e1', 'Guest test draft', 'guest-test-draft', 'draft');
insert into public.product_variants (id, product_id, sku, name, price_tnd, is_default)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1',
   'GT-MINT', 'Mint', 12.500, true),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2',
   'GT-DRAFT', 'Draft flavour', 10, true);
insert into public.inventory (variant_id, on_hand, reserved)
values
  ('00000000-0000-0000-0000-0000000000d1', 10, 0),
  ('00000000-0000-0000-0000-0000000000d2', 10, 0);

-- Helper: expect a statement to fail with a message matching a pattern.
create function pg_temp.expect_error(statement text, pattern text) returns void
language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected failure matching "%" for: %', pattern, statement;
exception when others then
  if sqlerrm like 'Expected failure%' or sqlerrm not like pattern then
    raise exception 'Unexpected error "%" (wanted "%")', sqlerrm, pattern;
  end if;
end;
$$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated, service_role;

-- 1. Guests cannot call create_order or create_guest_order directly.
set local role anon;
select pg_temp.expect_error($q$
  select public.create_guest_order('guest-key-anon-000001', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'a@example.test', '20123456', '{"recipient_name":"A"}', 0, 'hash', now() + interval '1 day')
$q$, '%permission denied%');
select pg_temp.expect_error($q$
  select public.create_order('guest-key-anon-000002', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'a@example.test', '20123456', '{"recipient_name":"A"}', 0, null)
$q$, '%permission denied%');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select pg_temp.expect_error($q$
  select public.create_guest_order('guest-key-auth-000003', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'a@example.test', '20123456', '{"recipient_name":"A"}', 0, 'hash', now() + interval '1 day')
$q$, '%permission denied%');

-- 2. Authenticated order; duplicate lines for one variant are merged.
do $$
declare
  created public.orders;
  replay public.orders;
begin
  created := public.create_order(
    'auth-key-000000000001', 'hash-a',
    '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1},
      {"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":2}]',
    'customer@example.test', '+21620123456', '{"recipient_name":"Client"}', 0, null);
  assert created.profile_id = '00000000-0000-0000-0000-0000000000c1', 'order owned by caller';
  assert created.total_tnd = 37.500, format('server total, got %s', created.total_tnd);
  assert created.guest_access_token_hash is null, 'no guest token on account orders';
  assert (select count(*) from public.order_items where order_id = created.id) = 1, 'lines merged';
  assert (select quantity from public.order_items where order_id = created.id) = 3, 'merged quantity';

  replay := public.create_order(
    'auth-key-000000000001', 'hash-a',
    '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1},
      {"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":2}]',
    'customer@example.test', '+21620123456', '{"recipient_name":"Client"}', 0, null);
  assert replay.id = created.id, 'idempotent replay returns the same order';
end;
$$;

select pg_temp.expect_error($q$
  select public.create_order('auth-key-000000000001', 'hash-b', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'customer@example.test', '+21620123456', '{"recipient_name":"Client"}', 0, null)
$q$, 'Idempotency key was reused%');
select pg_temp.expect_error($q$
  select public.create_order('auth-key-000000000002', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'customer@example.test', '+21620123456', '{"recipient_name":"Client"}', 0, '00000000-0000-0000-0000-0000000000ff')
$q$, 'Invalid order request');
reset role;

-- 3. Guest orders through the backend role.
set local role service_role;
do $$
declare
  created public.orders;
  replay public.orders;
begin
  created := public.create_guest_order(
    'guest-key-00000000001', 'hash-g',
    '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":2}]',
    'guest@example.test', '20123456', '{"recipient_name":"Invité"}', 0,
    'sha256-of-token', now() + interval '30 days');
  assert created.profile_id is null, 'guest order has no profile';
  assert created.guest_access_token_hash = 'sha256-of-token', 'token hash stored';
  assert created.total_tnd = 25.000, format('guest total, got %s', created.total_tnd);
  assert created.status::text = 'pending', 'guest order pending';
  assert (select reserved from public.inventory
          where variant_id = '00000000-0000-0000-0000-0000000000d1') = 5, 'stock reserved (3 + 2)';
  assert (select actor_id from public.inventory_movements where order_id = created.id) is null,
    'guest movement has no actor';

  replay := public.create_guest_order(
    'guest-key-00000000001', 'hash-g',
    '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":2}]',
    'guest@example.test', '20123456', '{"recipient_name":"Invité"}', 0,
    'another-token-hash', now() + interval '30 days');
  assert replay.id = created.id, 'guest replay returns the same order';
  assert (select reserved from public.inventory
          where variant_id = '00000000-0000-0000-0000-0000000000d1') = 5, 'replay reserves nothing';
end;
$$;

-- Same key from an account and from a guest does not collide.
select pg_temp.expect_error($q$
  select public.create_guest_order('guest-key-00000000002', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":6}]',
    'guest@example.test', '20123456', '{"recipient_name":"A"}', 0, 'hash', now() + interval '1 day')
$q$, 'Stock insuffisant%Disponible : 5');
select pg_temp.expect_error($q$
  select public.create_guest_order('guest-key-00000000003', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":3},{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":3}]',
    'guest@example.test', '20123456', '{"recipient_name":"A"}', 0, 'hash', now() + interval '1 day')
$q$, 'Stock insuffisant%');
select pg_temp.expect_error($q$
  select public.create_guest_order('guest-key-00000000004', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d2","quantity":1}]',
    'guest@example.test', '20123456', '{"recipient_name":"A"}', 0, 'hash', now() + interval '1 day')
$q$, 'Produit introuvable ou inactif%');
select pg_temp.expect_error($q$
  select public.create_guest_order('guest-key-00000000005', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'guest@example.test', '20123456', '{"recipient_name":"A"}', 0, null, null)
$q$, 'Guest orders require an expiring access token');
select pg_temp.expect_error($q$
  select public.create_guest_order('guest-key-00000000006', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":0}]',
    'guest@example.test', '20123456', '{"recipient_name":"A"}', 0, 'hash', now() + interval '1 day')
$q$, 'Invalid order quantity');
select pg_temp.expect_error($q$
  select public.create_guest_order('guest-key-00000000007', 'h', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'guest@example.test', '20123456', '{"recipient_name":"A"}', -1, 'hash', now() + interval '1 day')
$q$, 'Invalid order request');
reset role;

-- 4. Customers cannot read guest orders.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
do $$
begin
  assert (select count(*) from public.orders where profile_id is null) = 0,
    'guest orders are not visible to customers';
end;
$$;
reset role;

select 'guest_checkout_orders: all assertions passed' as result;
rollback;
