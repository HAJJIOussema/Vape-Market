$ErrorActionPreference = 'Stop'

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    throw 'psql is required to run the concurrent integration test.'
}

$connection = $env:SUPABASE_DB_URL
if ([string]::IsNullOrWhiteSpace($connection)) {
    $connection = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
}

if ($connection -notmatch '127\.0\.0\.1:54322|localhost:54322') {
    throw 'Refusing to run: SUPABASE_DB_URL must point to the isolated local Supabase database on port 54322.'
}

$categoryId = [guid]::NewGuid().ToString()
$productId = [guid]::NewGuid().ToString()
$variantId = [guid]::NewGuid().ToString()
$suffix = [guid]::NewGuid().ToString('N').Substring(0, 12)
$slug = "integration-concurrency-$suffix"
$sku = "CONCURRENCY-$suffix"

function Invoke-Psql {
    param(
        [string]$Sql
    )

    & $psql.Source $connection -X -v ON_ERROR_STOP=1 -q -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed with exit code $LASTEXITCODE."
    }
}

Invoke-Psql @"
begin;
insert into public.categories (id, name, slug)
values ('$categoryId', 'Concurrency integration category', '$slug');
insert into public.products (id, category_id, name, slug, is_active)
values ('$productId', '$categoryId', 'Concurrency integration product', '$slug', false);
insert into public.product_variants (
  id, product_id, sku, name, price_tnd, is_default, is_active
)
values ('$variantId', '$productId', '$sku', 'Concurrency integration variant', 10.000, true, true);
update public.products set is_active = true where id = '$productId';
insert into public.inventory (variant_id, on_hand, reserved)
values ('$variantId', 1, 0);
commit;
"@

$orderSql = @"
begin;
select public.create_order(
  'integration-concurrency-' + '$suffix',
  'hash-' + '$suffix',
  '[{"variant_id":"$variantId","quantity":1}]'::jsonb,
  'concurrency@example.test',
  '+21600000000',
  '{"city":"Tunis"}'::jsonb,
  0,
  'concurrency-token-' + '$suffix',
  now() + interval '1 hour',
  null
);
commit;
"@

$secondOrderSql = $orderSql.Replace(
    "integration-concurrency-$suffix",
    "integration-concurrency-$suffix-2"
).Replace(
    "hash-$suffix",
    "hash-$suffix-2"
).Replace(
    "concurrency-token-$suffix",
    "concurrency-token-$suffix-2"
)

$first = Start-Process -FilePath $psql.Source -ArgumentList @(
    $connection, '-X', '-v', 'ON_ERROR_STOP=1', '-q', '-c', $orderSql
) -PassThru
$second = Start-Process -FilePath $psql.Source -ArgumentList @(
    $connection, '-X', '-v', 'ON_ERROR_STOP=1', '-q', '-c', $secondOrderSql
) -PassThru

$first.WaitForExit()
$second.WaitForExit()

$successfulOrders = & $psql.Source $connection -X -Atqc @"
select count(*)
from public.orders
where order_number like 'VM-%'
  and id in (
    select order_id
    from public.idempotency_keys
    where idempotency_key in (
      'integration-concurrency-$suffix',
      'integration-concurrency-$suffix-2'
    )
  );
"@
if ($LASTEXITCODE -ne 0) {
    throw 'Could not query concurrent order results.'
}

$inventoryState = & $psql.Source $connection -X -Atqc @"
select on_hand || ':' || reserved
from public.inventory
where variant_id = '$variantId';
"@
if ($LASTEXITCODE -ne 0) {
    throw 'Could not query concurrent inventory results.'
}

$movementCount = & $psql.Source $connection -X -Atqc @"
select count(*)
from public.stock_movements
where variant_id = '$variantId';
"@
if ($LASTEXITCODE -ne 0) {
    throw 'Could not query concurrent stock movements.'
}

if ($successfulOrders.Trim() -ne '1') {
    throw "Expected exactly one successful concurrent order, got '$successfulOrders'."
}
if ($inventoryState.Trim() -ne '1:1') {
    throw "Expected inventory state 1:1, got '$inventoryState'."
}
if ($movementCount.Trim() -ne '1') {
    throw "Expected one reservation movement, got '$movementCount'."
}

Invoke-Psql @"
begin;
delete from public.stock_movements where variant_id = '$variantId';
delete from public.order_items
where order_id in (
  select order_id
  from public.idempotency_keys
  where idempotency_key in (
    'integration-concurrency-$suffix',
    'integration-concurrency-$suffix-2'
  )
);
delete from public.orders
where id in (
  select order_id
  from public.idempotency_keys
  where idempotency_key in (
    'integration-concurrency-$suffix',
    'integration-concurrency-$suffix-2'
  )
);
delete from public.idempotency_keys
where idempotency_key in (
  'integration-concurrency-$suffix',
  'integration-concurrency-$suffix-2'
);
delete from public.inventory where variant_id = '$variantId';
delete from public.product_variants where id = '$variantId';
delete from public.products where id = '$productId';
delete from public.categories where id = '$categoryId';
commit;
"@

Write-Output 'Concurrent reservation test passed.'
