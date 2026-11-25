-- Fix: guest orders always failed with "permission denied for table order_items".
--
-- order_items_totals_check is a DEFERRED constraint trigger, so it runs at
-- COMMIT, after public.checkout (SECURITY DEFINER) has returned, with the
-- caller's role. A guest (anon) has no SELECT on orders / order_items, so the
-- check failed and the whole order was rolled back.
--
-- Run the check with the owner's rights. It only reads the order being
-- written and raises if its totals are inconsistent; it changes no data.
alter function public.validate_order_totals() security definer;

revoke all on function public.validate_order_totals() from public, anon, authenticated;
