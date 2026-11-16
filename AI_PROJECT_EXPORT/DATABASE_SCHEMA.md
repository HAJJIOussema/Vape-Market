# VAPE MARKET — Database Schema

Database: Supabase PostgreSQL.

## Enums

| Enum | Values |
|---|---|
| `user_role` | `customer`, `stock_manager`, `admin`, `super_admin` |
| `product_status` | `draft`, `active`, `inactive`, `archived` |
| `order_status` | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`, `refunded` |
| `payment_status` | `pending`, `paid`, `failed`, `refunded` |
| `inventory_movement_type` | `restock`, `sale`, `adjustment`, `reserve`, `release`, `return` |
| `address_type` | `home`, `work`, `other` |

## Core Tables

### `categories`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `parent_id` | uuid FK -> `categories.id` | nullable, max depth 3 |
| `name` | text | required |
| `slug` | text | unique |
| `description` | text | nullable |
| `image_path` | text | Supabase Storage path |
| `is_active` | boolean | default true |
| `sort_order` | integer | default 0 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `brands`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | required |
| `slug` | text | unique |
| `description` | text | nullable |
| `image_path` | text | Supabase Storage path |
| `is_active` | boolean | default true |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `category_id` | uuid FK -> `categories.id` | required, restrict delete |
| `brand_id` | uuid FK -> `brands.id` | required, restrict delete |
| `name` | text | required |
| `slug` | text | unique |
| `description` | text | nullable |
| `status` | `product_status` | default draft |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `product_variants`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `product_id` | uuid FK -> `products.id` | required |
| `sku` | text | unique |
| `name` | text | flavor name |
| `attributes` | jsonb | default `{}`; stores `model` |
| `price_tnd` | numeric(12,3) | required, >= 0 |
| `is_default` | boolean | default false |
| `status` | `product_status` | default active |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraint:
- An active product must have exactly one active default variant.

### `product_images`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `product_id` | uuid FK -> `products.id` | required |
| `variant_id` | uuid FK -> `product_variants.id` | nullable, set null on delete |
| `storage_path` | text | Supabase Storage path |
| `alt_text` | text | required |
| `sort_order` | integer | default 0 |
| `created_at` | timestamptz | |

### `inventory`

| Column | Type | Notes |
|---|---|---|
| `variant_id` | uuid PK FK -> `product_variants.id` | |
| `on_hand` | integer | default 0, >= 0 |
| `reserved` | integer | default 0, >= 0 |
| `updated_at` | timestamptz | |
| Constraint | `reserved <= on_hand` | |

## User and Address Tables

### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK FK -> `auth.users.id` | |
| `role` | `user_role` | default customer |
| `full_name` | text | nullable, 1-160 chars |
| `phone` | text | nullable |
| `anonymized_at` | timestamptz | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `addresses`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `profile_id` | uuid FK -> `profiles.id` | cascade delete |
| `address_type` | `address_type` | default other |
| `label` | text | required |
| `recipient_name` | text | required |
| `phone` | text | required |
| `governorate` | text | required |
| `city` | text | required |
| `address_line` | text | required |
| `postal_code` | text | nullable |
| `is_default` | boolean | default false |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraint:
- One default address per profile.

## Cart Tables

### `carts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `profile_id` | uuid FK -> `profiles.id` | unique |
| `status` | text | `active`, `converted`, `abandoned` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `cart_items`

| Column | Type | Notes |
|---|---|---|
| `cart_id` | uuid FK -> `carts.id` | cascade delete |
| `variant_id` | uuid FK -> `product_variants.id` | restrict delete |
| `quantity` | integer | > 0 |
| `updated_at` | timestamptz | |
| PK | `(cart_id, variant_id)` | |

## Order Tables

### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `order_number` | text | unique |
| `profile_id` | uuid FK -> `profiles.id` | restrict delete |
| `customer_email` | text | required |
| `customer_phone` | text | required |
| `status` | `order_status` | default pending |
| `payment_method` | text | currently `cash_on_delivery` |
| `payment_status` | `payment_status` | default pending |
| `subtotal_tnd` | numeric(12,3) | >= 0 |
| `shipping_cost_tnd` | numeric(12,3) | default 0 |
| `total_tnd` | numeric(12,3) | subtotal + shipping |
| `currency` | char(3) | default TND |
| `carrier` | text | nullable |
| `tracking_number` | text | nullable |
| `shipping_address_snapshot` | jsonb | required object |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid FK -> `orders.id` | restrict delete |
| `variant_id` | uuid FK -> `product_variants.id` | set null on delete |
| `product_name_snapshot` | text | required |
| `variant_name_snapshot` | text | required |
| `sku_snapshot` | text | required |
| `unit_price_tnd` | numeric(12,3) | >= 0 |
| `quantity` | integer | > 0 |
| `line_total_tnd` | numeric(12,3) | `unit_price * quantity` |

### `inventory_movements`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `variant_id` | uuid FK -> `product_variants.id` | restrict delete |
| `order_id` | uuid FK -> `orders.id` | nullable, restrict delete |
| `actor_id` | uuid FK -> `profiles.id` | nullable, set null |
| `movement_type` | `inventory_movement_type` | |
| `quantity_before` | integer | >= 0 |
| `quantity_change` | integer | |
| `quantity_after` | integer | >= 0 |
| `reserved_before` | integer | >= 0 |
| `reserved_change` | integer | |
| `reserved_after` | integer | >= 0 |
| `reason` | text | required |
| `created_at` | timestamptz | |

### `audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK -> `profiles.id` | nullable, set null |
| `request_id` | text | nullable |
| `ip_address` | inet | nullable |
| `user_agent` | text | nullable |
| `action` | text | required |
| `resource_type` | text | required |
| `resource_id` | uuid | nullable |
| `metadata` | jsonb | default `{}` |
| `created_at` | timestamptz | |

### `idempotency_keys`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `profile_id` | uuid FK -> `profiles.id` | restrict delete |
| `idempotency_key` | text | unique per profile |
| `request_hash` | text | required |
| `order_id` | uuid FK -> `orders.id` | unique, restrict delete |
| `expires_at` | timestamptz | must be after created_at |
| `created_at` | timestamptz | |

## Relations

```text
auth.users 1 -> 1 profiles
profiles 1 -> N addresses
profiles 1 -> 1 carts
carts 1 -> N cart_items
product_variants 1 -> 1 inventory
product_variants 1 -> N inventory_movements
products 1 -> N product_variants
products 1 -> N product_images
product_variants 1 -> N product_images (optional)
brands 1 -> N products
categories 1 -> N products
categories 1 -> N categories (parent, max depth 3)
orders 1 -> N order_items
orders 1 -> N inventory_movements
profiles 1 -> N orders
```

## Important Triggers

| Trigger | Purpose |
|---|---|
| `validate_category_depth` | Prevents category cycles and limits depth to 3 |
| `validate_product_variant_state` | Active product must have an active default variant |
| `prevent_client_role_change` | Only admin/service role can change profile roles |
| `handle_new_user` | Creates profile after Supabase Auth signup |
| `set_updated_at` | Updates `updated_at` automatically |

## Indexes

Important indexes include:

- `brands_active_name_idx`
- `products_category_active_idx`
- `products_brand_active_idx`
- `products_active_created_idx`
- `product_variants_product_active_idx`
- `product_images_product_order_idx`
- `inventory_available_idx`
- `addresses_profile_idx`
- `profiles_role_idx`
- `cart_items_variant_idx`
- `orders_profile_created_idx`
- `orders_status_created_idx`
- `order_items_order_idx`
- `inventory_movements_variant_created_idx`

## RLS

RLS is enabled. Public read is allowed for active catalog rows. Admin and staff policies restrict management operations. See `SUPABASE_SETUP.md`.