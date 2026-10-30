create extension if not exists pgcrypto;

-- Official V1 lifecycle and authorization enums.
create type public.user_role as enum (
  'customer',
  'stock_manager',
  'admin',
  'super_admin'
);

create type public.product_status as enum (
  'draft',
  'active',
  'inactive',
  'archived'
);

create type public.order_status as enum (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
  'refunded'
);

create type public.payment_status as enum (
  'pending',
  'paid',
  'failed',
  'refunded'
);

create type public.inventory_movement_type as enum (
  'restock',
  'sale',
  'adjustment',
  'reserve',
  'release',
  'return'
);

create type public.address_type as enum (
  'home',
  'work',
  'other'
);

comment on type public.user_role is
  'V1 application roles stored on public.profiles.role.';
comment on type public.product_status is
  'V1 lifecycle for products and product variants.';
comment on type public.order_status is
  'V1 order lifecycle, including returns and refunds.';
comment on type public.payment_status is
  'V1 payment state for cash on delivery and future payment methods.';
comment on type public.inventory_movement_type is
  'Immutable inventory event categories used for stock and reservation audit.';
comment on type public.address_type is
  'V1 classification of a customer delivery address.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
