create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  image_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  brand_id uuid not null references public.brands(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  status public.product_status not null default 'draft'::public.product_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null unique check (length(btrim(sku)) between 1 and 100),
  name text not null check (length(btrim(name)) between 1 and 160),
  attributes jsonb not null default '{}'::jsonb
    check (jsonb_typeof(attributes) = 'object'),
  price_tnd numeric(12,3) not null check (price_tnd >= 0),
  is_default boolean not null default false,
  status public.product_status not null default 'active'::public.product_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_default or status = 'active'::public.product_status)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  storage_path text not null check (length(btrim(storage_path)) between 1 and 500),
  alt_text text not null check (length(btrim(alt_text)) between 1 and 255),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table public.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete restrict,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now(),
  check (reserved <= on_hand)
);

create or replace function public.validate_category_depth()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_id uuid := new.parent_id;
  depth integer := 1;
  visited uuid[] := array[new.id];
  parent_id_value uuid;
begin
  while current_id is not null loop
    if current_id = any(visited) then
      raise exception 'Category hierarchy cannot contain cycles';
    end if;

    visited := array_append(visited, current_id);
    select c.parent_id into parent_id_value
    from public.categories c
    where c.id = current_id;

    if not found then
      raise exception 'Category parent does not exist';
    end if;

    depth := depth + 1;
    if depth > 3 then
      raise exception 'Category hierarchy cannot exceed three levels';
    end if;

    current_id := parent_id_value;
  end loop;

  return new;
end;
$$;

create or replace function public.validate_product_variant_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  affected_product_id uuid;
begin
  if tg_table_name = 'products' then
    if tg_op = 'DELETE' then
      affected_product_id := old.id;
    else
      affected_product_id := new.id;
    end if;
  elsif tg_op = 'DELETE' then
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

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create unique index categories_one_parent_name_idx
  on public.categories(parent_id, lower(name));
create unique index product_variants_one_default_idx
  on public.product_variants(product_id)
  where is_default;
create index categories_parent_active_order_idx
  on public.categories(parent_id, is_active, sort_order);
create index brands_active_name_idx
  on public.brands(is_active, name);
create index products_category_active_idx
  on public.products(category_id, status);
create index products_brand_active_idx
  on public.products(brand_id, status);
create index products_active_created_idx
  on public.products(status, created_at desc);
create index product_variants_product_active_idx
  on public.product_variants(product_id, status);
create index product_images_product_order_idx
  on public.product_images(product_id, sort_order);
create index inventory_available_idx
  on public.inventory(variant_id, on_hand, reserved);

create trigger categories_validate_depth
before insert or update of parent_id on public.categories
for each row execute function public.validate_category_depth();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create trigger inventory_set_updated_at
before update on public.inventory
for each row execute function public.set_updated_at();

create constraint trigger products_variant_state_check
after insert or update or delete on public.products
deferrable initially deferred
for each row execute function public.validate_product_variant_state();

create constraint trigger product_variants_product_state_check
after insert or update or delete on public.product_variants
deferrable initially deferred
for each row execute function public.validate_product_variant_state();
