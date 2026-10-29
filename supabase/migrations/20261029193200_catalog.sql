create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null unique check (length(btrim(sku)) between 1 and 100),
  name text not null check (length(btrim(name)) between 1 and 160),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  price_tnd numeric(12,3) not null check (price_tnd >= 0),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_default or is_active)
);

create unique index product_variants_one_default_idx
  on public.product_variants(product_id)
  where is_default;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  cloudinary_public_id text not null,
  secure_url text not null,
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

create or replace function public.validate_product_variant_state()
returns trigger
language plpgsql
set search_path = public
as $$
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
$$;

create constraint trigger products_variant_state_check
after insert or update or delete on public.products
deferrable initially deferred
for each row execute function public.validate_product_variant_state();

create constraint trigger product_variants_product_state_check
after insert or update or delete on public.product_variants
deferrable initially deferred
for each row execute function public.validate_product_variant_state();

create trigger categories_set_updated_at
before update on public.categories
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

create index categories_active_order_idx
  on public.categories(is_active, sort_order);
create index products_category_active_idx
  on public.products(category_id, is_active);
create index products_active_created_idx
  on public.products(is_active, created_at desc);
create index product_variants_product_active_idx
  on public.product_variants(product_id, is_active);
create index product_images_product_order_idx
  on public.product_images(product_id, sort_order);
create index inventory_available_idx
  on public.inventory(variant_id, on_hand, reserved);
