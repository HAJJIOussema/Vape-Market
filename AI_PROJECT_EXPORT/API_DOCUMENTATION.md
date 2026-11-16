# VAPE MARKET — API Documentation

Base URL:

```text
http://localhost:3101/api/v1
```

Legacy pre-versioned paths are also mounted under `/api/...`.

All responses use JSON. Successful responses use:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

## Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/signup` | Create account | Public |
| POST | `/auth/login` | Login | Public |
| POST | `/auth/refresh` | Refresh token | Public |
| POST | `/auth/logout` | Logout | Authenticated |

## Profile

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/profile` | Get current profile | Authenticated |
| PATCH | `/profile` | Update profile | Authenticated |

## Addresses

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/addresses` | List user addresses | Authenticated |
| POST | `/addresses` | Create address | Authenticated |
| GET | `/addresses/:addressId` | Get address | Authenticated |
| PATCH | `/addresses/:addressId` | Update address | Authenticated |
| DELETE | `/addresses/:addressId` | Delete address | Authenticated |

## Cart

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/cart` | Get current cart | Authenticated |
| DELETE | `/cart` | Clear cart | Authenticated |
| POST | `/cart/items` | Add item | Authenticated |
| PATCH | `/cart/items/:variantId` | Update quantity | Authenticated |
| DELETE | `/cart/items/:variantId` | Remove item | Authenticated |

## Catalog

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/products` | List products | Public |
| GET | `/products/slug/:slug` | Get product by slug | Public |
| GET | `/products/:productId` | Get product by UUID | Public |
| GET | `/categories` | List categories | Public |
| GET | `/categories/:categoryId` | Get category | Public |

Product list filters:

- `q`
- `category_id`
- `brand_id` (not used by current frontend brand filter, which filters client-side)
- `status`
- `in_stock`
- `sort`
- `page`
- `page_size`

## Orders

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/orders` | Create order | Authenticated |
| GET | `/orders` | List current user orders | Authenticated |
| GET | `/orders/:orderId` | Get order | Authenticated |
| POST | `/orders/:orderId/cancel` | Cancel order | Authenticated |

## Admin

All admin routes require authentication and one of:

- `admin`
- `stock_manager`
- `super_admin`

User and audit endpoints have stricter role requirements.

### Categories

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/admin/categories` | Staff |
| POST | `/admin/categories` | Staff |
| PATCH | `/admin/categories/:categoryId` | Staff |
| DELETE | `/admin/categories/:categoryId` | Staff |

### Brands

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/admin/brands` | Staff |
| POST | `/admin/brands` | Staff |
| PATCH | `/admin/brands/:brandId` | Staff |
| DELETE | `/admin/brands/:brandId` | Staff |

### Orders

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/admin/orders` | Staff |
| POST | `/admin/orders/:orderId/confirm` | Staff |
| POST | `/admin/orders/:orderId/cancel` | Staff |
| POST | `/admin/orders/:orderId/ship` | Staff |

### Inventory

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/admin/inventory` | Staff |
| POST | `/admin/inventory/:variantId/adjust` | Staff |
| GET | `/admin/inventory/movements` | Staff |

### Products

| Method | Endpoint | Permission |
|---|---|---|
| POST | `/admin/products` | Staff |
| PATCH | `/admin/products/:productId` | Staff |
| DELETE | `/admin/products/:productId` | Staff |
| GET | `/admin/products/:productId/variants` | Staff |
| POST | `/admin/products/:productId/variants` | Staff |
| PATCH | `/admin/variants/:variantId` | Staff |
| DELETE | `/admin/variants/:variantId` | Staff |

### Users

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/admin/users` | Admin or super admin |
| GET | `/admin/users/:userId` | Admin or super admin |

### Audit

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/admin/audit-logs` | Super admin only |

## Health and Debug

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/debug/stock` | Temporary stock diagnostic |
| POST | `/debug/stock-join` | Temporary stock join diagnostic |

Debug endpoints should be removed before production.

## Documentation

Swagger UI:

```text
http://localhost:3101/docs
```

OpenAPI YAML:

```text
http://localhost:3101/docs/openapi.yaml
```