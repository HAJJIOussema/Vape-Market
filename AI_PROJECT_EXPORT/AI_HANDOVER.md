# VAPE MARKET — AI Handover

This document is designed for an AI or developer taking over the project.

## Project Summary

VAPE MARKET is a full-stack e-commerce application for vape products in Tunisia.

Stack:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database/Auth/Storage: Supabase PostgreSQL

The public catalog is organized as:

```text
Brand -> Model -> Flavor -> Product detail
```

## Architecture Rules

1. Never trust frontend authorization.
2. Recalculate prices, totals, quantities and stock on the backend.
3. Do not expose Supabase service role key to frontend.
4. Keep RLS enabled.
5. Use fictitious data during development.
6. Do not perform destructive database changes without explicit approval.
7. Validate with lint and build before delivery.

## Catalog Architecture

### Brand

Examples:

- Vozol
- Nexpod
- Refillo
- Mazaya
- Al Fakher
- Wotofo

Hidden public brands:

- Deep Cloud
- Crown Bar

### Model

Stored in:

```text
product_variants.attributes.model
```

Examples:

- Gear
- Star
- 15K
- 20K
- 30K
- Classic
- Premium

### Flavor

Stored in:

```text
product_variants.name
```

Examples:

- Mango Ice
- Grape Ice
- Blue Razz Ice
- Watermelon Ice
- Super Mint

### Product Detail Title

Dynamic title format:

```text
Product Name + Selected Flavor
```

Example:

```text
Vozol Gear Mango Ice
```

If the product name already contains the flavor, do not duplicate it.

## Image System

Bucket:

```text
product-images
```

Frontend image priority:

1. `product_images.storage_path` where `variant_id` matches selected variant
2. `product_variants.image_path` if available
3. Local flavor artwork `/flavors/<product-slug>-<flavor-slug>.jpg`
4. Product-level `product_images.storage_path`
5. `product.image_paths[0]`

Recommended path format:

```text
products/<brand-slug>/<model-slug>/<flavor-slug>.jpg
brands/<brand-slug>.png
categories/<category-slug>.png
```

## Flavor Color System

Use `getFlavorColor(name)` from `frontend/src/utils/flavor.js`.

Examples:

- Grape -> violet
- Blue Razz Ice -> blue
- Mango Ice -> orange
- Watermelon Ice -> green
- Cherry Cola -> red
- Peach Mango Watermelon -> orange
- Super Mint -> mint green
- Double Apple -> apple green
- Pineapple Ice -> yellow

## Stock System

Inventory table:

```text
inventory(variant_id, on_hand, reserved)
```

Available stock:

```text
on_hand - reserved
```

Order confirmation:

1. Pending order becomes confirmed.
2. Stock is decremented.
3. A sale movement is inserted.

Do not allow negative stock.

## Variant Selection

On product detail page:

- Selecting a flavor updates:
  - image
  - price
  - stock
  - SKU
  - title
- No page reload is required.

## Admin Rules

- Admin routes require authentication and role checks.
- Staff can manage catalog and inventory.
- Admin/super admin can manage users.
- Super admin can read audit logs.
- Role changes are protected by database triggers.

## Frontend Notes

- Public navigation is brand-based.
- `/categories` now displays brands.
- Header does not show categories.
- Footer links to brands.
- Product cards use responsive 4:5 image containers.
- Product detail images use 1:1 ratio.

## Backend Notes

- API base: `/api/v1`
- Legacy `/api` paths are also mounted.
- Rate limiting is enabled.
- Swagger docs are available at `/docs`.

## Database Notes

- RLS is enabled.
- Active products must have an active default variant.
- Category depth is limited to 3.
- One default variant per product.
- One default address per profile.

## Known Current Issues

- Real payments are not implemented.
- Frontend has no automated tests.
- Image dimensions are inconsistent.
- Some categories have null image paths.
- Product bundle size is large.
- Debug endpoints should be removed before production.

## Best Practices for Future Changes

- Prefer React/CSS changes unless backend change is explicitly requested.
- Do not modify migrations without approval.
- Preserve the brand -> model -> flavor hierarchy.
- Use variant-specific images when available.
- Keep generated flavor artwork as fallback.
- Run lint and build after frontend changes.
- Test product detail flavor switching.
- Test cart and checkout after stock changes.

## Files to Read First

1. `README.md`
2. `PROJECT_BLUEPRINT.md`
3. `CLAUDE.md`
4. `frontend/src/App.jsx`
5. `frontend/src/pages/ProductDetailsPage.jsx`
6. `frontend/src/utils/flavor.js`
7. `backend/src/app.js`
8. `supabase/migrations/20261029193200_catalog.sql`
9. `supabase/migrations/20261029193600_permissions_rls.sql`

## Immediate Context

Recent work includes:

- Premium storefront redesign.
- Brand-based catalog navigation.
- Vozol Gear/Star variant separation.
- Per-flavor image system.
- Flavor color and label system.
- Stock badge improvements.
- Neon intensity reduction.
- Complete documentation export.