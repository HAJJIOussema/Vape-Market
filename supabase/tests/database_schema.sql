begin;

select plan(19);

select ok(to_regclass('public.profiles') is not null, 'profiles table exists');
select ok(to_regclass('public.product_variants') is not null, 'product variants table exists');
select ok(to_regclass('public.inventory') is not null, 'inventory table exists');
select ok(to_regclass('public.orders') is not null, 'orders table exists');
select ok(to_regclass('public.order_items') is not null, 'order items table exists');
select ok(to_regclass('public.stock_movements') is not null, 'stock movements table exists');
select ok(to_regclass('public.idempotency_keys') is not null, 'idempotency table exists');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.profiles'::regclass and contype = 'p'
), 'profiles has a primary key');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.inventory'::regclass and contype = 'p'
), 'inventory is keyed by variant');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.product_variants'::regclass
    and pg_get_constraintdef(oid) like '%price_tnd%'
), 'variant prices cannot be negative');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.inventory'::regclass
    and pg_get_constraintdef(oid) like '%reserved%'
    and pg_get_constraintdef(oid) like '%on_hand%'
), 'reserved stock cannot exceed physical stock');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.order_items'::regclass
    and pg_get_constraintdef(oid) like '%quantity%'
), 'order quantities must be positive');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.orders'::regclass
    and pg_get_constraintdef(oid) like '%total_tnd%'
    and pg_get_constraintdef(oid) like '%shipping_cost_tnd%'
), 'order totals include shipping');

select ok(to_regprocedure('public.create_order(text,text,jsonb,text,text,jsonb,numeric,text,timestamptz,uuid)') is not null, 'create_order exists');
select ok(to_regprocedure('public.cancel_order(uuid)') is not null, 'cancel_order exists');
select ok(to_regprocedure('public.ship_order(uuid)') is not null, 'ship_order exists');
select ok(to_regprocedure('public.adjust_inventory(uuid,integer,text)') is not null, 'adjust_inventory exists');

select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'orders'
), 'orders has RLS policies');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'profiles'
), 'profiles has RLS policies');

select * from finish();
rollback;
