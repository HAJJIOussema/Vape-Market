-- Restore V1 compatibility objects without destructive DDL.
-- Existing divergent objects are preserved.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'user_role'
  ) then
    create type public.user_role as enum (
      'customer', 'stock_manager', 'admin', 'super_admin'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'product_status'
  ) then
    create type public.product_status as enum (
      'draft', 'active', 'inactive', 'archived'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'inventory_movement_type'
  ) then
    create type public.inventory_movement_type as enum (
      'restock', 'sale', 'adjustment', 'reserve', 'release', 'return'
    );
  end if;
end
$$;

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete restrict,
  add column if not exists image_path text;

alter table public.products
  add column if not exists brand_id uuid references public.brands(id) on delete restrict,
  add column if not exists status public.product_status not null default 'draft'::public.product_status;

alter table public.product_variants
  add column if not exists status public.product_status not null default 'active'::public.product_status;

alter table public.product_images
  add column if not exists storage_path text;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  request_id text,
  ip_address inet,
  user_agent text,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  movement_type public.inventory_movement_type not null,
  quantity_before integer not null check (quantity_before >= 0),
  quantity_change integer not null,
  quantity_after integer not null check (quantity_after >= 0),
  reserved_before integer not null check (reserved_before >= 0),
  reserved_change integer not null,
  reserved_after integer not null check (reserved_after >= 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists brands_active_name_idx
  on public.brands(is_active, name);

create index if not exists products_brand_active_idx
  on public.products(brand_id, status);

create index if not exists inventory_movements_variant_created_idx
  on public.inventory_movements(variant_id, created_at desc);
