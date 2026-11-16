# VAPE MARKET — Deployment Guide

## Components

- Frontend: Vercel or static hosting
- Backend: Railway, Render or Node hosting
- Database/Auth/Storage: Supabase

## Frontend Deployment

```bash
cd frontend
npm install
npm run lint
npm run build
```

Deploy the `frontend/dist` directory.

Required environment variables:

```env
VITE_API_URL=https://api.example.com/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STORAGE_BUCKET=product-images
```

## Backend Deployment

```bash
cd backend
npm install
npm start
```

Required environment variables:

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=production
```

## Supabase

1. Create a Supabase project.
2. Apply migrations in `supabase/migrations/`.
3. Apply seed data only for development/demo.
4. Configure RLS policies.
5. Create and configure the `product-images` bucket.
6. Configure Auth providers.
7. Set storage policies.

## Pre-Production Checklist

- Run frontend lint and build.
- Run backend tests.
- Verify RLS policies.
- Verify no service role key is exposed.
- Verify stock and order flows.
- Verify image paths and bucket permissions.
- Verify legal/compliance requirements for vape products in Tunisia.
- Use only validated production data.

## Notes

- Debug endpoints must be removed before production.
- Real sales require explicit legal and security validation.
- Payment is currently cash on delivery only.