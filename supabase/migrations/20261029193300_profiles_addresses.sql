create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role public.user_role not null default 'customer'::public.user_role,
  full_name text
    check (full_name is null or length(btrim(full_name)) between 1 and 160),
  phone text,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  address_type public.address_type not null default 'other'::public.address_type,
  label text not null check (length(btrim(label)) between 1 and 80),
  recipient_name text not null
    check (length(btrim(recipient_name)) between 1 and 160),
  phone text not null,
  governorate text not null check (length(btrim(governorate)) between 1 and 100),
  city text not null check (length(btrim(city)) between 1 and 100),
  address_line text not null check (length(btrim(address_line)) between 1 and 255),
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create or replace function public.has_role(required_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = required_role, false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin'::public.user_role)
      or public.has_role('super_admin'::public.user_role);
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('super_admin'::public.user_role);
$$;

create or replace function public.is_stock_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('stock_manager'::public.user_role)
      or public.has_role('admin'::public.user_role)
      or public.has_role('super_admin'::public.user_role);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.prevent_client_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and auth.role() <> 'service_role'
    and not public.is_admin() then
    raise exception 'Only an administrator can change profile roles';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger profiles_role_protection
before update on public.profiles
for each row execute function public.prevent_client_role_change();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger addresses_set_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

create unique index addresses_one_default_idx
  on public.addresses(profile_id)
  where is_default;
create index addresses_profile_idx on public.addresses(profile_id);
create index profiles_role_idx on public.profiles(role);
