-- Restore the missing read policies on public.brands.
--
-- The remote database has RLS enabled on public.brands but no SELECT policy,
-- so every client (including administrators) received zero brands. As a
-- result the "Marque" list of the admin product editor stayed empty and
-- saving a product asked for the brand again.
--
-- These are the policies originally defined in
-- 20261029193600_permissions_rls.sql: everybody can read active brands,
-- administrators can read every brand (needed by the admin screens).

drop policy if exists brands_public_read on public.brands;
drop policy if exists brands_admin_read on public.brands;

create policy brands_public_read on public.brands
for select to anon, authenticated
using (is_active);

create policy brands_admin_read on public.brands
for select to authenticated
using (public.is_admin());
