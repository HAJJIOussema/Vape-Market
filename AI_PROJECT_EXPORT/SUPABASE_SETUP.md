# VAPE MARKET — Supabase Setup

## Authentication

Supabase Auth is used for user authentication.

- Frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Backend uses `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- A trigger creates a `profiles` row when a new auth user is created.
- Profile roles are protected: only admin or service role can change roles.

Supported flows:

- Sign up
- Login
- Refresh token
- Logout

## Database Access

The backend has two Supabase clients:

1. Anon client with user JWT:
   - Used for authenticated user requests.
   - Preserves `auth.uid()`.
   - Respects RLS.

2. Service role client:
   - Used for system/admin operations.
   - Must never be exposed to the frontend.

## Storage

Bucket:

```text
product-images
```

The bucket is public for read access. Images are referenced by `storage_path`.

Image URL construction:

```text
https://<SUPABASE_URL>/storage/v1/object/public/product-images/<storage_path>
```

If `VITE_IMAGE_BASE_URL` is set, the frontend uses that base instead.

## RLS Policies

Public read:

- Active categories
- Active brands
- Active products
- Active product variants
- Product images
- Inventory for staff

Staff/admin management:

- Categories: staff can manage
- Brands: staff can manage
- Products: staff can manage
- Variants: staff can manage
- Images: staff can manage
- Inventory: staff can read, insert, update
- Orders: admin can read and manage according to role

User data:

- Profiles: users can read/update their own profile
- Addresses: users can manage their own addresses
- Carts: users manage their own cart
- Orders: customers can read their own orders

Super admin:

- Full management of profiles, orders and audit logs

## RPC and Functions

Important database functions:

| Function | Purpose |
|---|---|
| `handle_new_user()` | Creates profile after signup |
| `prevent_client_role_change()` | Protects role changes |
| `validate_category_depth()` | Validates category hierarchy |
| `validate_product_variant_state()` | Ensures active product has active default variant |
| `create_order(...)` | Creates an order transactionally |
| `confirm_order(...)` | Confirms order and decrements stock |
| `cancel_order(...)` | Cancels order |
| `ship_order(...)` | Marks order as shipped |
| `adjust_inventory(...)` | Adjusts stock and creates movement |
| `current_user_role()` | Returns current user role |
| `is_admin()` | Checks admin/super admin |
| `is_super_admin()` | Checks super admin |
| `is_stock_manager()` | Checks stock manager/admin/super admin |

## Environment Variables

Frontend:

```env
VITE_API_URL=http://localhost:3101/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STORAGE_BUCKET=product-images
```

Backend:

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Notes

- Service role key must never be exposed to the frontend.
- RLS must remain enabled in production.
- Local `.env` files must not be committed.