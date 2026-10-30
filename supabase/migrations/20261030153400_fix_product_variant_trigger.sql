-- Fix the catalog trigger function restored from the remote snapshot.
-- Product rows expose id, while variant rows expose product_id.

create or replace function public.validate_product_variant_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  affected_product_id uuid;
begin
  if tg_table_name = 'products' then
    if tg_op = 'delete' then
      affected_product_id := old.id;
    else
      affected_product_id := new.id;
    end if;
  elsif tg_op = 'delete' then
    affected_product_id := old.product_id;
  else
    affected_product_id := new.product_id;
  end if;

  if exists (
    select 1
    from public.products p
    where p.id = affected_product_id
      and p.status = 'active'::public.product_status
  ) and not exists (
    select 1
    from public.product_variants v
    where v.product_id = affected_product_id
      and v.status = 'active'::public.product_status
      and v.is_default
  ) then
    raise exception 'An active product must have an active default variant';
  end if;

  if tg_op = 'delete' then
    return old;
  end if;
  return new;
end;
$$;
