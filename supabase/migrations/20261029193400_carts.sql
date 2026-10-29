create table public.carts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (cart_id, variant_id)
);

create trigger carts_set_updated_at
before update on public.carts
for each row execute function public.set_updated_at();

create trigger cart_items_set_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

create index cart_items_variant_idx on public.cart_items(variant_id);
