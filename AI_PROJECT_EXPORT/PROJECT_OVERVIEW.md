# VAPE MARKET — Project Overview

## Objective

VAPE MARKET is a Tunisian e-commerce project for vape products. The application is a full-stack web app with a React/Vite frontend, an Express backend, and Supabase PostgreSQL/Auth/Storage.

The business domain is organized as:

```text
Brand -> Model -> Flavor -> Product detail
```

Examples:

```text
Vozol -> Gear -> Mango Ice
Vozol -> Star -> Cherry Cola
Nexpod -> 15K -> Mango Ice
```

## Business Purpose

The project provides:

- A public product catalog.
- Product detail pages with variant selection.
- Cart and checkout.
- User accounts and addresses.
- Order creation and order history.
- Admin management for products, brands, categories, inventory, users and orders.
- Stock tracking with inventory movements.

## User Roles

| Role | Description |
|---|---|
| `customer` | Browse products, manage cart, place orders, manage profile and addresses |
| `stock_manager` | Access stock and inventory operations |
| `admin` | Manage catalog, orders, users within admin permissions |
| `super_admin` | Full administrative access, including audit logs and role management |

## Core Concepts

### Product

A product represents a commercial item such as `Vozol Gear` or `Nexpod 30K`.

### Variant

A variant represents a flavor of a product, for example `Mango Ice` or `Grape Ice`.

Each variant has:

- SKU
- name
- price
- status
- attributes, including `model`
- default flag
- inventory

### Inventory

Inventory is stored separately from variants:

- `on_hand`
- `reserved`
- available stock is calculated as `on_hand - reserved`

### Images

Images are stored in Supabase Storage bucket `product-images`.

Product images can be linked to:

- a product only (`variant_id = null`)
- a specific variant (`variant_id = variant.id`)

The frontend prioritizes variant-specific images, then product-level images, then local fallback images.

## Main User Flows

### Customer

1. Browse `/products`.
2. Filter by brand using `/products?brand=<slug>`.
3. Open a product detail page.
4. Select a flavor/model.
5. Add to cart.
6. Checkout and create an order.
7. View orders in account.

### Admin

1. Log in.
2. Open `/admin`.
3. Manage products, variants, inventory, brands, categories, orders and users.
4. Confirm, ship or cancel orders.
5. Adjust inventory.

## Important Constraints

- No real sales should be activated before legal validation.
- Development data must remain fictitious.
- Backend prices, totals, quantities and stock must be recalculated server-side.
- Frontend must never be trusted for authorization or stock decisions.