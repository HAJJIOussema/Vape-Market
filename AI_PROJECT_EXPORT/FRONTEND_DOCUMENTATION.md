# VAPE MARKET — Frontend Documentation

## Stack

- React
- Vite
- React Router
- Framer Motion
- CSS design system in `src/index.css`
- Supabase JS client for auth/storage helpers

## Main Routes

| Route | Page | Description |
|---|---|---|
| `/` | `HomePage` | Hero, brands, featured products, about, contact |
| `/products` | `ProductsPage` | Product catalog with search, category and brand filtering |
| `/products/:slug` | `ProductDetailsPage` | Product detail and flavor selection |
| `/categories` | `CategoriesPage` | Brand showcase, despite legacy route name |
| `/marques` | `BrandsPage` | Brand showcase |
| `/cart` | `CartPage` | Cart |
| `/login` | `LoginPage` | Login |
| `/register` | `RegisterPage` | Registration |
| `/account` | `AccountPage` | Profile and addresses |
| `/account/orders` | `OrdersPage` | Order history |
| `/admin` | `AdminDashboardPage` | Admin dashboard |
| `/admin/:section` | `AdminDashboardPage` | Admin sections |

## Layout

`MainLayout` provides:

- Header
- Main content
- Footer
- Age verification
- Cookie banner

## Context

| Context | Purpose |
|---|---|
| `AuthContext` | Authentication state |
| `CartContext` | Cart state and persistence |
| `LanguageContext` | FR/EN/AR language and RTL |

## Services

| Service | Purpose |
|---|---|
| `api.js` | HTTP requests to backend |
| `productService.js` | Product loading |
| `categoryService.js` | Category loading |
| `imageService.js` | Supabase/CDN image URL resolution |
| `authService.js` | Authentication |
| `cart` related services | Cart operations |
| `adminService.js` | Admin API calls |
| `orderService.js` | Orders |
| `accountService.js` | Profile and addresses |

## Utilities

| Utility | Purpose |
|---|---|
| `utils/flavor.js` | Flavor color, flavor theme, local artwork path |

Key functions:

- `getFlavorTheme(name)`
- `getFlavorColor(name)`
- `getFlavorArtworkPath(product, variant)`

## Important Components

| Component | Purpose |
|---|---|
| `Header` | Navigation, logo, search, cart, language |
| `Footer` | Footer links and logo |
| `BrandLogo` | Shared official logo |
| `ProductCard` | Product card in catalog |
| `ImageWithFallback` | Image with fallback placeholder |
| `LoadingSpinner` | Loading state |
| `ProtectedRoute` | Protected routes |
| `AdminRoute` | Admin-only routes |

## Product Detail Behavior

`ProductDetailsPage`:

- Loads product by slug.
- Selects model and flavor.
- Prioritizes variant-specific images.
- Falls back to product-level image.
- Falls back to local flavor artwork.
- Updates image, price, stock and SKU without reload.
- Displays stock badge, flavor badge and flavor label.
- Title becomes `Product Name Flavor` when the product name does not already include the flavor.

## Catalog Behavior

- `/products` lists products.
- `/products?brand=<slug>` filters by brand client-side.
- `/products?category_id=<uuid>` filters by category.
- Search uses `q`.

## Admin Frontend

`AdminDashboardPage` includes sections for:

- Dashboard
- Products
- Brands
- Categories
- Orders
- Inventory
- Users

## Styling

The design system is centralized in `src/index.css`.

Important tokens:

```css
--color-bg: #001107;
--color-bg-dark: #010C05;
--color-bg-section: #0D291B;
--color-bg-card: #16311F;
--color-primary: #9FE619;
--color-primary-hover: #8BD117;
--color-secondary: #8CCB76;
--color-green-dark: #164D2A;
--shadow-glow: 0 0 24px rgba(159, 230, 25, 0.12);
```

## Validation Commands

```bash
npm run lint
npm run build
```