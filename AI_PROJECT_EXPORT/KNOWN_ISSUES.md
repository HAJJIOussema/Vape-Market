# VAPE MARKET — Known Issues

## Current Limitations

- Real payments are not implemented; only cash on delivery is supported.
- Legal/compliance validation for vape sales in Tunisia is not complete.
- Some product and brand images have inconsistent dimensions.
- `brands/nexpod.png` had a database path with trailing whitespace; clean before production.
- Many active categories have `image_path = null`; frontend falls back to product images.
- No automated frontend tests are currently implemented.
- Backend tests exist but should be expanded for all critical flows.

## Catalog Notes

- Deep Cloud and Crown Bar are intentionally hidden from the public frontend.
- Categories remain in the database for admin use even though public navigation is brand-based.
- Product variants do not currently have an `image_path` column; images are linked via `product_images.variant_id`.
- All `product_images` rows currently have `variant_id = null` except those recently added for Vozol.

## UI/UX Notes

- The frontend bundle is larger than 500 kB; code splitting may be needed.
- Some legacy CSS still references old components or patterns.
- Product cards use responsive widths; source images should be normalized.

## Data Notes

- Development data is fictitious.
- Some seeded brands and categories are demo-only and inactive.
- Product status and `is_active` fields are not always aligned in demo data.

## Future Improvements

- Add real payment integration.
- Add frontend tests.
- Add image upload UI in admin.
- Normalize all image dimensions.
- Add product search indexing.
- Add inventory alerts.
- Add order tracking integration.
- Add multi-language completeness for all pages.
- Add accessibility audit.
- Add performance optimization and code splitting.