# VAPE MARKET — Project Structure

```text
VAPE-MARKET/
├── AI_PROJECT_EXPORT/
├── backend/
├── docs/
├── frontend/
├── supabase/
├── .github/
├── README.md
├── CLAUDE.md
└── PROJECT_BLUEPRINT.md
```

## Root

| Path | Purpose |
|---|---|
| `frontend/` | React/Vite application |
| `backend/` | Express REST API |
| `supabase/` | Database migrations, seed, config and tests |
| `docs/` | Additional project documentation |
| `.github/` | CI workflows and editor instructions |
| `README.md` | General project overview |
| `CLAUDE.md` | AI/engineering working rules |
| `PROJECT_BLUEPRINT.md` | Reference blueprint for the premium storefront transformation |

## Frontend

```text
frontend/
├── public/
│   ├── brands/
│   ├── flavors/
│   ├── logo-officiel.png
│   └── favicon.png
├── src/
│   ├── components/
│   ├── context/
│   ├── i18n/
│   ├── layouts/
│   ├── pages/
│   ├── services/
│   └── utils/
├── index.html
├── package.json
└── vite.config.js
```

### Frontend Key Areas

| Path | Purpose |
|---|---|
| `src/pages/` | Route-level pages |
| `src/components/` | Reusable UI components |
| `src/context/` | React context providers |
| `src/services/` | API and Supabase helpers |
| `src/utils/` | Utility functions, including flavor colors/artwork |
| `public/` | Static assets served by Vite |
| `public/flavors/` | Generated per-flavor product artwork |
| `public/brands/` | Brand logos |

## Backend

```text
backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── validators/
│   └── utils/
├── tests/
├── .env.example
└── package.json
```

### Backend Key Areas

| Path | Purpose |
|---|---|
| `src/app.js` | Express app configuration and route mounting |
| `src/server.js` | Server startup |
| `src/routes/` | HTTP route definitions |
| `src/controllers/` | Request handlers |
| `src/services/` | Business logic |
| `src/validators/` | Zod request validation schemas |
| `src/middleware/` | Auth, authorization, errors, audit, rate limiting |
| `tests/` | Unit, integration and RLS tests |

## Supabase

```text
supabase/
├── migrations/
├── seed.sql
├── config.toml
└── tests/
```

### Supabase Key Areas

| Path | Purpose |
|---|---|
| `migrations/` | Versioned SQL schema and RLS policies |
| `seed.sql` | Demo/fictitious data |
| `config.toml` | Supabase CLI configuration |
| `tests/` | Database and security tests |

## Important Files

| File | Purpose |
|---|---|
| `frontend/src/App.jsx` | Frontend routes |
| `frontend/src/index.css` | Global design system and component styles |
| `backend/src/app.js` | Backend route mounting |
| `supabase/migrations/20261029193200_catalog.sql` | Catalog schema |
| `supabase/migrations/20261029193300_profiles_addresses.sql` | Profiles and addresses |
| `supabase/migrations/20261029193400_carts.sql` | Carts |
| `supabase/migrations/20261029193500_orders_inventory.sql` | Orders and inventory |
| `supabase/migrations/20261029193600_permissions_rls.sql` | RLS policies |