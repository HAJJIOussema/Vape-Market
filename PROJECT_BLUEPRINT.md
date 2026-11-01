# PROJECT_BLUEPRINT.md

> Reusable architecture and implementation blueprint for e-commerce and SaaS products.
>
> Derived from the VAPE MARKET project. This document is intentionally generic: it captures patterns, conventions and decisions that can be reused in future projects without copying project-specific data.

---

## Part 1 — Project Vision

### 1.1 Project type

VAPE MARKET is a full-stack commerce application with a customer storefront and an administrative back office. It is a strong reference pattern for:

- B2C e-commerce storefronts
- Admin-managed catalog applications
- Stock-aware order systems
- SaaS dashboards with role-based access
- Supabase-backed React applications

### 1.2 Business objective

The business goal is to let customers discover products, manage a cart, place orders, and track their order history, while administrators manage catalog, stock, orders and users from a protected dashboard.

The application is built around these business capabilities:

- Product catalog and search
- Category and brand management
- Product variants and stock availability
- Cart and checkout
- Order lifecycle management
- Customer account and address book
- Admin dashboard and operational tools
- Role-based administration

### 1.3 Users

The system supports several user profiles:

- **Anonymous visitor**: browses products and categories
- **Customer**: authenticates, manages profile/addresses, places orders, views order history
- **Stock manager**: manages inventory and stock movements
- **Admin**: manages catalog, brands, categories, orders, users
- **Super admin**: full administrative access, including audit and sensitive operations

### 1.4 Roles

Recommended role set:

| Role | Purpose |
|---|---|
| `customer` | Storefront user and order owner |
| `stock_manager` | Inventory operations |
| `admin` | Catalog, orders, users |
| `super_admin` | Full administrative control |

Rules:

- Roles are stored on `profiles.role`.
- Authorization is enforced both in backend middleware and database RLS.
- Frontend route guards mirror backend authorization.
- Never trust frontend role checks alone.
- Use the smallest role required for each capability.

---

## Part 2 — Technical Stack

### 2.1 Frontend

- React 19
- Vite
- React Router
- Framer Motion
- Supabase JavaScript client
- Oxlint for linting

Recommended frontend responsibilities:

- Rendering and interaction
- Route protection
- API communication
- Optimistic UI where safe
- Motion and responsive design
- Local cart persistence

### 2.2 Backend

- Node.js
- Express
- Pino / pino-http for logging
- Helmet, CORS, compression
- express-rate-limit
- Nodemon for development

Recommended backend responsibilities:

- Authentication extraction
- Authorization
- Request validation
- Business orchestration
- Supabase data access
- Error normalization
- API documentation

### 2.3 Database

- PostgreSQL
- Supabase

Use PostgreSQL as the source of truth. Use Supabase for:

- Auth
- Storage
- RLS
- RPC functions
- Managed database

### 2.4 Authentication

- Supabase Auth
- JWT access tokens
- Role stored in application profile table
- Backend verifies JWT and derives profile

### 2.5 Storage

- Supabase Storage
- Product images
- Brand images
- Category images
- Public or signed URLs depending on business needs

### 2.6 Validation

- Zod for request validation
- Shared validation patterns
- Strict schemas for create/update
- Partial schemas for PATCH operations

### 2.7 Testing

- Vitest
- Unit tests for services
- Integration tests for API routes
- RLS tests where Supabase is available

### 2.8 Documentation

- OpenAPI YAML
- Swagger UI
- Endpoint-level request/response schemas
- Reusable component schemas

---

## Part 3 — Architecture

### 3.1 Recommended repository structure

```text
project/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── App.css
│       ├── components/
│       ├── context/
│       ├── layouts/
│       ├── pages/
│       └── services/
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── rls/
├── supabase/
│   └── migrations/
├── docs/
│   └── openapi.yaml
└── PROJECT_BLUEPRINT.md
```

### 3.2 Frontend structure

```text
frontend/src/
├── App.jsx                 # Router and providers
├── main.jsx                 # React entry point
├── index.css                # Design system
├── components/              # Reusable UI
├── context/                 # Auth, cart, app state
├── layouts/                 # Main layout, admin layout
├── pages/                   # Route-level pages
└── services/                # API clients
```

Guidelines:

- Keep pages thin.
- Move business orchestration to services.
- Keep context focused and small.
- Reuse UI components.
- Keep styling centralized in a design system.

### 3.3 Backend structure

```text
backend/src/
├── server.js                # HTTP server bootstrap
├── app.js                   # Express app composition
├── config/                  # Supabase and environment config
├── controllers/             # HTTP handlers
├── errors/                  # Typed application errors
├── middleware/              # Auth, validation, error handling
├── routes/                  # Route declarations
├── services/                # Business logic
├── utils/                   # Pagination, filters, helpers
└── validators/              # Zod schemas
```

Guidelines:

- Controllers should be thin.
- Services own business rules.
- Validators are separate and reusable.
- Errors are normalized before reaching the client.
- Routes declare paths and middleware only.

### 3.4 Supabase structure

```text
supabase/
└── migrations/
    ├── timestamp_initial_schema.sql
    ├── timestamp_profiles_addresses.sql
    ├── timestamp_catalog.sql
    ├── timestamp_orders_inventory.sql
    ├── timestamp_permissions_rls.sql
    └── timestamp_fixes.sql
```

Rules:

- Migrations are immutable once deployed.
- New changes create new migration files.
- Seed data should be separate from schema.
- RLS is part of the security model, not an afterthought.

---

## Part 4 — Database Design Pattern

### 4.1 Core tables

| Table | Role |
|---|---|
| `profiles` | Application user profile and role |
| `addresses` | Customer delivery addresses |
| `categories` | Product categories |
| `brands` | Product brands |
| `products` | Catalog products |
| `product_variants` | Sellable variants |
| `product_images` | Product media |
| `inventory` | Stock per variant |
| `inventory_movements` | Immutable stock audit trail |
| `carts` | Customer cart |
| `cart_items` | Cart line items |
| `orders` | Customer orders |
| `order_items` | Order line snapshots |
| `audit_logs` | Administrative audit trail |

### 4.2 Relationship pattern

Recommended relationships:

- `profiles.id` → `auth.users.id`
- `addresses.profile_id` → `profiles.id`
- `products.category_id` → `categories.id`
- `products.brand_id` → `brands.id`
- `product_variants.product_id` → `products.id`
- `product_images.product_id` → `products.id`
- `product_images.variant_id` → `product_variants.id` (optional)
- `inventory.variant_id` → `product_variants.id`
- `inventory_movements.variant_id` → `product_variants.id`
- `inventory_movements.order_id` → `orders.id` (optional)
- `inventory_movements.actor_id` → `profiles.id` (optional)
- `carts.profile_id` → `profiles.id`
- `cart_items.cart_id` → `carts.id`
- `cart_items.variant_id` → `product_variants.id`
- `orders.profile_id` → `profiles.id`
- `order_items.order_id` → `orders.id`
- `order_items.variant_id` → `product_variants.id` (nullable for historical safety)

### 4.3 Design principles

- Use UUID primary keys.
- Use foreign keys with intentional delete behavior.
- Keep stock operations auditable.
- Snapshot order data at order time.
- Store monetary values with fixed precision.
- Use enums for lifecycle states.
- Avoid deleting historical records.
- Prefer soft status changes over hard deletes.
- Keep RLS policies explicit and testable.

### 4.4 Stock model

Core fields:

- `on_hand`: physical stock available
- `reserved`: stock reserved by pending orders
- `available`: `on_hand - reserved`

Rules:

- Customers can only see boolean availability.
- Exact stock numbers are admin-only.
- Pending orders reserve stock.
- Confirmed orders deduct stock and release reservation.
- Cancellations release reserved stock.
- Every stock mutation appends an inventory movement.

### 4.5 Order snapshot pattern

Orders should snapshot:

- customer email
- customer phone
- shipping address
- product name
- variant name
- SKU
- unit price
- quantity
- line total

This preserves historical correctness even if catalog data changes later.

---

## Part 5 — Authentication

### 5.1 Registration flow

1. User submits email and password.
2. Supabase Auth creates the auth user.
3. A profile row is created or linked.
4. Default role is `customer`.
5. Frontend redirects to account or email confirmation flow.

### 5.2 Login flow

1. User submits credentials.
2. Supabase Auth returns a session.
3. Frontend stores session through Supabase client.
4. Backend receives JWT in `Authorization: Bearer <token>`.
5. Backend extracts user ID and creates a JWT-scoped Supabase client.

### 5.3 Logout flow

1. Frontend calls Supabase sign-out.
2. Session is cleared.
3. User is redirected to home or login.

### 5.4 JWT pattern

Backend middleware should:

- Read `Authorization` header
- Verify Supabase JWT
- Extract `sub` as profile ID
- Create a user-scoped Supabase client
- Attach both to request

Recommended request properties:

```js
req.user
req.supabase
```

### 5.5 Role authorization

Backend:

- `authenticate` middleware protects routes.
- `authorizeAdmin(roles)` checks profile role.
- RLS policies enforce database-level access.

Frontend:

- `ProtectedRoute` requires authentication.
- `AdminRoute` requires admin role.
- UI hides admin links for non-admins.

### 5.6 Security rules

- Never trust frontend role checks.
- Always enforce RLS.
- Use service-role client only in backend.
- Never expose service-role key to frontend.
- Keep JWT validation server-side.

---

## Part 6 — API Design

### 6.1 Base convention

```text
/api/v1
```

Examples:

```text
GET    /api/v1/products
GET    /api/v1/products/:productId
GET    /api/v1/products/slug/:slug
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/:productId
DELETE /api/v1/admin/products/:productId
```

### 6.2 Layered backend pattern

```text
Route → Middleware → Controller → Service → Supabase
```

Responsibilities:

- Route: path and middleware
- Middleware: auth, validation, rate limiting
- Controller: HTTP request/response
- Service: business logic
- Supabase: data access

### 6.3 Controller pattern

Controllers should:

- Extract request data
- Call service
- Return normalized response
- Forward errors to error middleware

Avoid business logic in controllers.

### 6.4 Service pattern

Services should:

- Enforce business rules
- Validate state transitions
- Coordinate multiple data operations
- Throw typed errors
- Remain framework-agnostic

### 6.5 Validator pattern

Use Zod schemas for:

- Create payloads
- Update payloads
- Query filters
- Path parameters when needed

Rules:

- Use `.strict()` for create/update bodies.
- Use `.partial()` for PATCH.
- Reuse common validators.
- Keep error messages user-friendly.

### 6.6 Error handling

Use a typed error model:

- `AppError`
- `ValidationError`
- `NotFoundError`
- `UnauthorizedError`
- `ForbiddenError`

Response shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### 6.7 Success response

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### 6.8 Pagination

Query parameters:

```text
?page=1&page_size=20
```

Rules:

- Default page size
- Maximum page size
- Return pagination metadata
- Keep pagination logic centralized

### 6.9 Search and sorting

Search:

- Use allowlisted columns
- Escape `%` and `_`
- Case-insensitive matching

Sorting:

- Whitelist sortable fields
- Map API field names to database columns
- Default sort explicitly

### 6.10 Idempotency

For order creation:

- Require `Idempotency-Key`
- Hash request payload
- Prevent duplicate orders
- Return existing result when appropriate

---

## Part 7 — Admin Panel Pattern

### 7.1 Recommended sections

- Dashboard
- Products
- Categories
- Brands
- Stock
- Orders
- Users

Optional:

- Audit logs
- Settings
- Analytics

### 7.2 Admin frontend architecture

Recommended components:

- `AdminDashboardPage`
- `DashboardSection`
- `ProductsSection`
- `CatalogSection`
- `StockSection`
- `OrdersSection`
- `OrdersTable`
- `UsersSection`
- `RoleBadge`
- `StatusBadge`

### 7.3 Admin layout

```text
AdminLayout
├── AdminSidebar
├── AdminContent
└── Section Components
```

Guidelines:

- Sidebar navigation by section
- Sticky sidebar on desktop
- Responsive grid on mobile
- Section-level loading and error states
- Reusable table rows
- Data labels for mobile stacking

### 7.4 Admin data pattern

- Load section data on route change
- Reload after mutations
- Keep forms close to tables
- Confirm destructive actions
- Show counts and metrics
- Use badges for status and roles

### 7.5 Admin permissions

- Protect `/admin` routes
- Verify role on backend
- Verify role in frontend guard
- Hide links for unauthorized users
- Keep audit trail for sensitive actions

---

## Part 8 — Stock Management

### 8.1 Concepts

- `on_hand`: physical stock
- `reserved`: stock reserved by pending orders
- `available`: `on_hand - reserved`

### 8.2 Rules

- Never allow negative stock.
- Reserve stock when an order is created.
- Deduct stock when an order is confirmed.
- Release reservation when an order is cancelled.
- Record every mutation as an inventory movement.
- Show exact stock only to staff.
- Show boolean availability to customers.

### 8.3 Movement types

Recommended movement types:

- `restock`
- `sale`
- `adjustment`
- `reserve`
- `release`
- `return`

### 8.4 Adjustment pattern

Admin adjustment should require:

- Variant ID
- Delta
- Reason

The backend should:

- Validate delta
- Call a transactional RPC or safe update
- Append movement
- Return updated inventory

### 8.5 Movement audit fields

Each movement should store:

- Variant ID
- Order ID (optional)
- Actor ID (optional)
- Movement type
- Quantity before
- Quantity change
- Quantity after
- Reserved before
- Reserved change
- Reserved after
- Reason
- Created at

---

## Part 9 — Order Workflow

### 9.1 Lifecycle

```text
Client
  ↓
Cart
  ↓
Order created (pending)
  ↓
Reserved stock increases
  ↓
Admin confirms
  ↓
Confirmed
  ↓
Stock deducted
  ↓
Shipped
  ↓
Delivered
```

Additional states:

- Cancelled
- Returned
- Refunded

### 9.2 Creation

Order creation should:

- Validate items
- Reserve stock
- Create order and order items
- Snapshot product data
- Return pending order
- Support idempotency

### 9.3 Confirmation

When an admin confirms an order:

- Status becomes `confirmed`
- `on_hand` decreases by ordered quantity
- `reserved` decreases by ordered quantity
- Movement type `sale` is recorded

### 9.4 Cancellation

When an order is cancelled:

- Status becomes `cancelled`
- Reserved stock is released
- Movement type `release` is recorded

### 9.5 Shipment

When an order is shipped:

- Status becomes `shipped`
- Carrier and tracking number can be saved
- No stock change if already deducted

### 9.6 Delivery

When an order is delivered:

- Status becomes `delivered`
- Customer history is updated

### 9.7 Returns and refunds

- Track returned quantities
- Restore stock when appropriate
- Record movement type `return`
- Preserve financial history

---

## Part 10 — Supabase Pattern

### 10.1 Authentication

- Use Supabase Auth for user sessions.
- Store application role in `profiles`.
- Backend verifies JWT.
- Frontend uses Supabase client for session.

### 10.2 Storage

Recommended buckets:

- `product-images`
- `brand-images`
- `category-images`

Rules:

- Use clear folder naming.
- Validate file type and size.
- Store storage path in database.
- Resolve public URLs in a service.

### 10.3 RLS

Enable RLS on all tables.

Common policies:

- Customers can read/write their own data.
- Admins can read operational data.
- Super admins can manage sensitive data.
- Public can read active catalog data.

### 10.4 RPC functions

Use PostgreSQL RPC for transactional operations:

- `create_order`
- `cancel_order`
- `adjust_inventory`
- `ship_order`

Benefits:

- Atomicity
- Consistent validation
- Reduced race conditions

### 10.5 Policy design

- Keep policies explicit.
- Test policies with real users.
- Avoid overly broad policies.
- Separate read and write policies.
- Document role requirements.

### 10.6 Schema cache awareness

PostgREST caches schema. When a migration changes columns:

- Verify actual deployed schema.
- Avoid referencing missing columns.
- Keep backend and database aligned.
- Test real requests after schema changes.

---

## Part 11 — UI/UX Pattern

### 11.1 Design direction

Target style:

- Shopify clarity
- Apple spacing
- Vercel minimalism
- Premium but practical

### 11.2 Design tokens

Use CSS variables for:

- Colors
- Typography
- Radius
- Shadows
- Spacing
- Motion

Example:

```css
:root {
  --font-body: 'Inter', sans-serif;
  --font-display: 'Plus Jakarta Sans', sans-serif;
  --bg: #f4f6f2;
  --surface: #ffffff;
  --ink: #0b1f1c;
  --muted: #5b6f69;
  --accent: #d7ff5f;
  --radius-md: 18px;
  --shadow-sm: 0 10px 30px rgba(11, 31, 28, 0.08);
}
```

### 11.3 Buttons

Recommended variants:

- Primary
- Accent
- Secondary
- Ghost
- Danger
- Block
- Small

Rules:

- Rounded pill shape
- Clear hover state
- Active scale
- Disabled state
- Icon support
- Full width for form submit buttons

### 11.4 Cards

Product cards should include:

- Image
- Stock badge
- Brand
- Name
- Category
- Price
- Hover lift
- Image zoom

### 11.5 Badges

Status badges:

- Pending
- Confirmed
- Processing
- Shipped
- Delivered
- Cancelled
- Returned
- Refunded

Role badges:

- Customer
- Stock manager
- Admin
- Super admin

Each badge should have:

- Color
- Dot indicator
- Rounded shape
- Readable contrast

### 11.6 Forms

Rules:

- One field per row
- Label above input
- Full-width inputs
- Minimum height 48px
- Radius 12–14px
- Clear focus ring
- Helpful validation messages

### 11.7 Tables

Rules:

- Header row
- Hover state
- Mobile stacking with labels
- Action buttons grouped
- Empty states
- Loading states

### 11.8 Motion

Use Framer Motion for:

- Page transitions
- Card reveals
- Hover interactions
- Toasts
- Modals
- Mobile menus

Rules:

- Keep motion subtle
- Respect `prefers-reduced-motion`
- Avoid long animations
- Use consistent easing

### 11.9 Responsive

Breakpoints:

- Desktop: 1180px container
- Tablet: 960px
- Mobile: 760px
- Small mobile: 520px

Rules:

- Mobile-first where practical
- Avoid horizontal scroll
- Stack complex grids
- Keep touch targets large

---

## Part 12 — Testing Strategy

### 12.1 Test layers

- Unit tests: services and utilities
- Integration tests: API routes and middleware
- RLS tests: database permissions
- E2E tests: critical user flows

### 12.2 Unit tests

Test:

- Service methods
- Validation
- Pagination
- Filters
- Error mapping

### 12.3 Integration tests

Test:

- Authentication
- Authorization
- CRUD endpoints
- Error responses
- Pagination and filtering

### 12.4 RLS tests

Test:

- Customer isolation
- Admin access
- Super admin access
- Cross-user access denial

### 12.5 Recommended structure

```text
backend/tests/
├── unit/
├── integration/
└── rls/
```

### 12.6 Testing rules

- Mock Supabase in unit tests.
- Use real app in integration tests.
- Keep tests focused.
- Test behavior, not implementation details.
- Add regression tests for every bug fix.

---

## Part 13 — Deployment

### 13.1 Frontend

Recommended: Vercel

Steps:

1. Connect repository.
2. Set environment variables.
3. Build with Vite.
4. Deploy preview and production.

Environment variables:

```text
VITE_API_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### 13.2 Backend

Recommended: Railway or Render

Steps:

1. Deploy Node service.
2. Set environment variables.
3. Run migrations separately.
4. Configure health check.
5. Enable logging.

Environment variables:

```text
PORT
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### 13.3 Database

Recommended: Supabase

Steps:

1. Create project.
2. Run migrations.
3. Configure RLS.
4. Create storage buckets.
5. Seed initial data.

### 13.4 Deployment checklist

- Environment variables configured
- Migrations applied
- RLS enabled
- Storage buckets created
- CORS configured
- Health endpoint verified
- Logs monitored
- Rollback plan available

---

## Part 14 — AI Rules

When an AI agent works on this project or a similar project, it must follow these rules.

### 14.1 Always read first

Before changing code:

- Read the relevant files.
- Understand existing patterns.
- Check routes, services, validators and tests.
- Preserve architecture.

### 14.2 Do not rebuild foundations

Never:

- Recreate the database
- Rewrite migrations
- Replace the auth system
- Remove existing routes
- Break API contracts

### 14.3 Prefer targeted fixes

- Fix the specific bug.
- Avoid unnecessary refactors.
- Keep changes minimal.
- Preserve business logic unless explicitly requested.

### 14.4 Respect boundaries

- Frontend changes should not alter backend contracts.
- Backend changes should not require database migrations unless requested.
- UI improvements should not change API behavior.
- Security rules must remain intact.

### 14.5 Validate changes

Always run:

```text
npm run lint
npm run build
npm test
```

When possible, test real API requests.

### 14.6 Document important changes

Update:

- OpenAPI documentation
- README or blueprint
- Tests
- Comments when logic is non-obvious

### 14.7 Use consistent patterns

Follow existing conventions for:

- Naming
- Folder structure
- Error handling
- Validation
- Response shapes
- CSS tokens
- Component organization

---

## Part 15 — Project Starter Template

### 15.1 Backend checklist

- [ ] Express app bootstrap
- [ ] Environment configuration
- [ ] Supabase client setup
- [ ] Auth middleware
- [ ] Authorization middleware
- [ ] Zod validation middleware
- [ ] Error middleware
- [ ] Health route
- [ ] Product routes
- [ ] Category routes
- [ ] Brand routes
- [ ] Order routes
- [ ] Address routes
- [ ] Inventory routes
- [ ] User routes
- [ ] OpenAPI documentation
- [ ] Unit tests
- [ ] Integration tests

### 15.2 Frontend checklist

- [ ] Vite + React setup
- [ ] Router setup
- [ ] Auth context
- [ ] Cart context
- [ ] Protected routes
- [ ] Admin routes
- [ ] API service layer
- [ ] Design system
- [ ] Responsive layout
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Motion system

### 15.3 Database checklist

- [ ] Profiles table
- [ ] Addresses table
- [ ] Categories table
- [ ] Brands table
- [ ] Products table
- [ ] Product variants table
- [ ] Product images table
- [ ] Inventory table
- [ ] Inventory movements table
- [ ] Carts table
- [ ] Cart items table
- [ ] Orders table
- [ ] Order items table
- [ ] Audit logs table
- [ ] RLS policies
- [ ] RPC functions
- [ ] Indexes

### 15.4 Auth checklist

- [ ] Supabase Auth configured
- [ ] Registration flow
- [ ] Login flow
- [ ] Logout flow
- [ ] JWT verification
- [ ] Role storage
- [ ] Protected routes
- [ ] Admin authorization

### 15.5 Storage checklist

- [ ] Storage buckets
- [ ] Upload flow
- [ ] Public URL resolution
- [ ] File validation
- [ ] Image fallback

### 15.6 Admin checklist

- [ ] Dashboard
- [ ] Products
- [ ] Categories
- [ ] Brands
- [ ] Stock
- [ ] Orders
- [ ] Users
- [ ] Badges
- [ ] Tables
- [ ] Forms
- [ ] Responsive layout

### 15.7 Testing checklist

- [ ] Unit tests
- [ ] Integration tests
- [ ] RLS tests
- [ ] Lint
- [ ] Build
- [ ] Manual smoke test

### 15.8 Deployment checklist

- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] Database migrated
- [ ] Environment variables set
- [ ] CORS configured
- [ ] Health check verified
- [ ] Logs monitored
- [ ] Backup strategy

---

## Final Note

This blueprint is designed to be a permanent reference for future e-commerce and SaaS projects. It captures the architecture, conventions and operational patterns that make VAPE MARKET maintainable, secure and scalable. Reuse the patterns, adapt the details, and keep the system consistent.
