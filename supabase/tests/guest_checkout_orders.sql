-- Browser-facing order & catalogue functions (no backend).
-- Plain SQL with ASSERT, no pgTAP required. Everything is rolled back.
-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/guest_checkout_orders.sql
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'guest-test-customer@example.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'guest-test-admin@example.test');
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-0000000000c1', 'Test customer'),
  ('00000000-0000-0000-0000-0000000000c2', 'Test admin')
on conflict (id) do nothing;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c2';

insert into public.categories (id, name, slug)
values ('00000000-0000-0000-0000-0000000000a1', 'Guest test category', 'guest-test-category');
insert into public.brands (id, name, slug)
values ('00000000-0000-0000-0000-0000000000e1', 'Guest test brand', 'guest-test-brand');
insert into public.products (id, category_id, brand_id, name, slug, status) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000e1', 'Guest test puff', 'guest-test-puff', 'active'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000e1', 'Guest test draft', 'guest-test-draft', 'draft');
insert into public.product_variants (id, product_id, sku, name, price_tnd, is_default) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'GT-MINT', 'Mint', 12.500, true),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', 'GT-DRAFT', 'Draft flavour', 10, true),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b1', 'GT-EMPTY', 'Empty', 12.500, false);
insert into public.inventory (variant_id, on_hand, reserved) values
  ('00000000-0000-0000-0000-0000000000d1', 10, 0),
  ('00000000-0000-0000-0000-0000000000d2', 10, 0),
  ('00000000-0000-0000-0000-0000000000d3', 0, 0);

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
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;

create function pg_temp.reserved(variant uuid) returns integer
language sql security definer as $$ select reserved from public.inventory where variant_id = variant $$;
create function pg_temp.on_hand(variant uuid) returns integer
language sql security definer as $$ select on_hand from public.inventory where variant_id = variant $$;
grant execute on function pg_temp.reserved(uuid), pg_temp.on_hand(uuid) to anon, authenticated;
create temporary table results (name text primary key, value jsonb);
grant all on results to anon, authenticated;

-- ── 1. Guest (anon) ─────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

do $$
begin
  assert (select v.in_stock from public.product_variants v
          where id = '00000000-0000-0000-0000-0000000000d1'), 'anon sees in_stock = true';
  assert not (select v.in_stock from public.product_variants v
              where id = '00000000-0000-0000-0000-0000000000d3'), 'anon sees in_stock = false';
end;
$$;
select pg_temp.expect_error($q$ select on_hand from public.inventory $q$, '%permission denied%');
select pg_temp.expect_error($q$ select public.confirm_order('00000000-0000-0000-0000-000000000000') $q$, '%permission denied%');
select pg_temp.expect_error($q$
  select public.place_order_internal(null, 'h', now() + interval '1 day', 'guest-key-00000000000', 'h',
    '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]', 'a@example.test', '20123456', '{}', 0)
$q$, '%permission denied%');

do $$
declare
  result jsonb;
  replay jsonb;
begin
  result := public.checkout(
    'guest-key-00000000001',
    '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1},
      {"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    ' Guest@Example.test ', '00216 20 123 456',
    '{"recipient_name":" Invité ","address_line":"1 rue Test","city":"Sfax","governorate":"Sfax","evil":"x","phone":"99999999"}');
  assert result->>'profile_id' is null, 'guest order';
  assert (result->>'total_tnd')::numeric = 25.000, format('server total, got %s', result->>'total_tnd');
  assert (result->>'shipping_cost_tnd')::numeric = 0, 'server shipping';
  assert result->>'customer_email' = 'guest@example.test', 'email normalised';
  assert result->>'customer_phone' = '+21620123456', 'phone normalised';
  assert result->'shipping_address_snapshot' ? 'evil' = false, 'unknown address keys dropped';
  assert result->'shipping_address_snapshot'->>'phone' = '+21620123456', 'address phone is the customer phone';
  assert jsonb_array_length(result->'order_items') = 1, 'duplicate lines merged';
  assert length(result->>'guest_access_token') >= 32, 'token returned once';
  assert not (result ? 'guest_access_token_hash'), 'hash not returned';
  assert pg_temp.reserved('00000000-0000-0000-0000-0000000000d1') = 2, 'stock reserved';
  insert into results values ('guest', result);

  replay := public.checkout(
    'guest-key-00000000001',
    '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1},
      {"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    ' Guest@Example.test ', '00216 20 123 456',
    '{"recipient_name":" Invité ","address_line":"1 rue Test","city":"Sfax","governorate":"Sfax","evil":"x","phone":"99999999"}');
  assert replay->>'id' = result->>'id', 'replay returns the same order';
  assert replay->>'guest_access_token' is null, 'replay returns no token';
  assert pg_temp.reserved('00000000-0000-0000-0000-0000000000d1') = 2, 'replay reserves nothing';
end;
$$;

do $$
declare
  guest jsonb := (select value from results where name = 'guest');
  found jsonb;
begin
  found := public.lookup_guest_order(lower(guest->>'order_number'), guest->>'guest_access_token');
  assert found->>'id' = guest->>'id', 'lookup with the right token';
  assert not (found ? 'profile_id') and not (found ? 'guest_access_token_hash'), 'lookup hides internals';
  assert jsonb_array_length(found->'order_items') = 1, 'lookup returns items';
  assert public.lookup_guest_order(guest->>'order_number', 'wrong-token-wrong-token-wrong') is null, 'wrong token';
  assert public.lookup_guest_order('VM-000000000000', guest->>'guest_access_token') is null, 'wrong number';
end;
$$;

select pg_temp.expect_error($q$
  select public.checkout('guest-key-00000000002', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'not-an-email', '20123456', '{"recipient_name":"A","address_line":"B"}')
$q$, 'Adresse e-mail invalide');
select pg_temp.expect_error($q$
  select public.checkout('guest-key-00000000003', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'a@example.test', '123', '{"recipient_name":"A","address_line":"B"}')
$q$, 'Téléphone invalide%');
select pg_temp.expect_error($q$
  select public.checkout('guest-key-00000000004', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'a@example.test', '20123456', '{"recipient_name":"A"}')
$q$, 'Adresse de livraison invalide');
select pg_temp.expect_error($q$
  select public.checkout('guest-key-00000000005', '[]', 'a@example.test', '20123456', '{"recipient_name":"A","address_line":"B"}')
$q$, 'Le panier est vide%');
select pg_temp.expect_error($q$
  select public.checkout('guest-key-00000000006', '[{"variant_id":"nope","quantity":1}]', 'a@example.test', '20123456', '{"recipient_name":"A","address_line":"B"}')
$q$, 'Invalid order request');
select pg_temp.expect_error($q$
  select public.checkout('guest-key-00000000007', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":9}]',
    'other@example.test', '21123456', '{"recipient_name":"A","address_line":"B"}')
$q$, 'Stock insuffisant%Disponible : 8');
select pg_temp.expect_error($q$
  select public.checkout('guest-key-00000000008', '[{"variant_id":"00000000-0000-0000-0000-0000000000d2","quantity":1}]',
    'other@example.test', '21123456', '{"recipient_name":"A","address_line":"B"}')
$q$, 'Produit introuvable ou inactif%');
select pg_temp.expect_error($q$
  select public.checkout('short', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'other@example.test', '21123456', '{"recipient_name":"A","address_line":"B"}')
$q$, 'Invalid order request');

-- Throttle: 3 guest orders per contact per hour (1 already placed above).
select public.checkout('guest-key-00000000009', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
  'guest@example.test', '22123456', '{"recipient_name":"A","address_line":"B"}') is not null;
select public.checkout('guest-key-00000000010', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
  'guest@example.test', '22123456', '{"recipient_name":"A","address_line":"B"}') is not null;
select pg_temp.expect_error($q$
  select public.checkout('guest-key-00000000011', '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'guest@example.test', '23123456', '{"recipient_name":"A","address_line":"B"}')
$q$, 'Trop de commandes récentes%');
reset role;

-- ── 2. Customer (authenticated) ─────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
do $$
declare
  result jsonb;
begin
  result := public.checkout('auth-key-000000000001',
    '[{"variant_id":"00000000-0000-0000-0000-0000000000d1","quantity":1}]',
    'spoofed@example.test', '20123456', '{"recipient_name":"Client","address_line":"1 rue"}');
  assert (result->>'profile_id')::uuid = '00000000-0000-0000-0000-0000000000c1', 'account order';
  assert result->>'customer_email' = 'guest-test-customer@example.test', 'account e-mail enforced';
  assert result->>'guest_access_token' is null, 'no token for accounts';
  insert into results values ('account', result);
  assert (select count(*) from public.orders where profile_id is null) = 0, 'customers cannot read guest orders';
  assert (select count(*) from public.orders) = 1, 'customer reads own order';
end;
$$;
select pg_temp.expect_error($q$ select public.confirm_order((select (value->>'id')::uuid from results where name = 'account')) $q$,
  'Administrator permission required');
select pg_temp.expect_error($q$ select public.save_product_variant('00000000-0000-0000-0000-0000000000b1', null, '{"name":"X","sku":"X","price_tnd":1}', 1) $q$,
  'Stock manager permission required');
select pg_temp.expect_error($q$ update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1' $q$,
  'Only a super administrator can change profile roles');
select pg_temp.expect_error($q$
  insert into public.addresses (profile_id, label, recipient_name, phone, governorate, city, address_line)
  values ('00000000-0000-0000-0000-0000000000c1', 'Maison', 'A', 'abc', 'Tunis', 'Tunis', '1 rue')
$q$, '%addresses_phone_format_check%');
reset role;

-- ── 3. Admin ────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
do $$
declare
  account_id uuid := (select (value->>'id')::uuid from results where name = 'account');
  guest_id uuid := (select (value->>'id')::uuid from results where name = 'guest');
  variant jsonb;
  before_on_hand integer := pg_temp.on_hand('00000000-0000-0000-0000-0000000000d1');
  before_reserved integer := pg_temp.reserved('00000000-0000-0000-0000-0000000000d1');
begin
  assert (select count(*) from public.orders where profile_id is null) = 3, 'admin reads guest orders';

  perform public.confirm_order(guest_id);
  assert pg_temp.on_hand('00000000-0000-0000-0000-0000000000d1') = before_on_hand - 2, 'confirm consumes stock';
  assert pg_temp.reserved('00000000-0000-0000-0000-0000000000d1') = before_reserved - 2, 'confirm consumes reservation';

  perform public.cancel_order(guest_id);
  assert pg_temp.on_hand('00000000-0000-0000-0000-0000000000d1') = before_on_hand, 'cancel after confirm restocks';
  assert pg_temp.reserved('00000000-0000-0000-0000-0000000000d1') = before_reserved - 2, 'reservation untouched';

  perform public.cancel_order(account_id);
  assert pg_temp.reserved('00000000-0000-0000-0000-0000000000d1') = before_reserved - 3, 'cancel pending releases';

  variant := public.save_product_variant('00000000-0000-0000-0000-0000000000b1', null,
    '{"name":"Grape","sku":"GT-GRAPE","price_tnd":13,"is_default":true,"attributes":{"model":"Standard"}}', 7);
  assert (variant->>'on_hand')::integer = 7 and (variant->>'is_default')::boolean, 'variant created with stock';
  assert not (select is_default from public.product_variants where id = '00000000-0000-0000-0000-0000000000d1'), 'old default unset';

  variant := public.save_product_variant(null, (variant->>'id')::uuid, '{"price_tnd":14}', 3);
  assert (variant->>'price_tnd')::numeric = 14 and (variant->>'on_hand')::integer = 3, 'variant updated';
  assert (select count(*) from public.inventory_movements where variant_id = (variant->>'id')::uuid) = 2, 'movements logged';
end;
$$;
select pg_temp.expect_error($q$ select public.save_product_variant(null, '00000000-0000-0000-0000-0000000000d1', '{"role":"x"}', null) $q$,
  'Champ de variante non autorisé');
select pg_temp.expect_error($q$ select public.save_product_variant(null, '00000000-0000-0000-0000-0000000000d1', '{}', 0) $q$,
  'Le stock ne peut pas être inférieur%');
select pg_temp.expect_error($q$ update public.profiles set role = 'super_admin' where id = '00000000-0000-0000-0000-0000000000c2' $q$,
  'Only a super administrator can change profile roles');
select pg_temp.expect_error($q$ select public.delete_product_variant('00000000-0000-0000-0000-0000000000d1') $q$,
  '%réservé%');
do $$
begin
  perform public.delete_product_variant('00000000-0000-0000-0000-0000000000d3');
  assert not exists (select 1 from public.product_variants where id = '00000000-0000-0000-0000-0000000000d3'), 'variant deleted';
end;
$$;
reset role;

select 'guest_checkout_orders: all assertions passed' as result;
rollback;
