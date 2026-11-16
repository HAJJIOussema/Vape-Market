# VAPE MARKET — Admin Documentation

## Access

Admin interface:

```text
/admin
```

Protected by `AdminRoute` and backend role checks.

Supported roles:

- `stock_manager`
- `admin`
- `super_admin`

## Dashboard

The admin dashboard provides:

- Product count
- Brand count
- Category count
- Order count
- Quick navigation to management sections

## Products

Admin can:

- Create products
- Update products
- Delete products
- Manage variants
- Manage product images
- Manage inventory

Product fields include:

- name
- slug
- description
- category
- brand
- status

Variant fields include:

- SKU
- name
- price
- model
- attributes
- default flag
- status

## Brands

Admin can:

- Create brands
- Update brands
- Delete brands
- Set `image_path`

## Categories

Admin can:

- Create categories
- Update categories
- Delete categories
- Set parent category
- Set sort order
- Set `image_path`

Category hierarchy is limited to 3 levels.

## Inventory

Admin/staff can:

- View inventory
- Adjust stock
- View inventory movements

Inventory operations create `inventory_movements` records for audit.

Stock statuses:

- Available: `on_hand - reserved > 0`
- Out of stock: `on_hand - reserved <= 0`

## Orders

Admin/staff can:

- List orders
- Confirm orders
- Ship orders
- Cancel orders

Order confirmation decrements stock and creates a sale movement.

## Users

Admin/super admin can:

- List users
- View user details
- Manage roles according to permissions

Role changes are protected by database triggers.

## Audit Logs

Super admin can:

- Read audit logs

Audit logs include:

- user
- request ID
- IP address
- user agent
- action
- resource type
- resource ID
- metadata

## Important Admin Rules

- Do not trust frontend role checks alone.
- Backend must enforce authorization.
- Stock must be recalculated server-side.
- Do not expose service role key to frontend.
- Use fictitious data during development.