# VAPE MARKET — Storage Structure

## Supabase Storage

Bucket:

```text
product-images
```

Public read URL:

```text
https://<SUPABASE_URL>/storage/v1/object/public/product-images/<storage_path>
```

## Recommended Structure

```text
product-images/
├── brands/
│   ├── vozol.png
│   ├── nexpod.png
│   ├── refillo.png
│   ├── mazaya.png
│   ├── al-fakher.png
│   └── wotofo.png
├── categories/
│   └── <category-slug>.png
├── products/
│   ├── vozol/
│   │   ├── gear/
│   │   │   ├── mango-ice.jpg
│   │   │   ├── grape-ice.jpg
│   │   │   ├── blue-razz-ice.jpg
│   │   │   ├── watermelon-ice.jpg
│   │   │   └── super-mint.jpg
│   │   └── star/
│   │       ├── peach-mango-watermelon.jpg
│   │       ├── cherry-cola.jpg
│   │       ├── blackberry-grape.jpg
│   │       └── super-mint.jpg
│   ├── nexpod/
│   │   ├── 15k/
│   │   ├── 20k/
│   │   └── 30k/
│   ├── refillo/
│   ├── mazaya/
│   ├── al-fakher/
│   └── wotofo/
└── pr/
    └── legacy product images
```

## Path Rules

- No leading slash in `storage_path`.
- Use lowercase slugs.
- Separate words with hyphens.
- No spaces or accents.
- Use `.jpg` for photos.
- Use `.png` for logos or transparent images.

## Image Linking

`product_images` can link an image to:

- a product: `variant_id = null`
- a variant: `variant_id = variant.id`

Frontend priority:

1. Variant-specific `product_images.storage_path`
2. `product_variants.image_path` if available
3. Local flavor artwork `/flavors/<product-slug>-<flavor-slug>.jpg`
4. Product-level `product_images.storage_path`
5. `products.image_paths[0]`

## Current Important Paths

Vozol Gear:

```text
products/vozol/gear/mango-ice.jpg
products/vozol/gear/grape-ice.jpg
products/vozol/gear/blue-razz-ice.jpg
products/vozol/gear/watermelon-ice.jpg
products/vozol/gear/super-mint.jpg
```

Vozol Star:

```text
products/vozol/star/peach-mango-watermelon.jpg
products/vozol/star/cherry-cola.jpg
products/vozol/star/blackberry-grape.jpg
products/vozol/star/super-mint.jpg
```

Legacy product images are stored under:

```text
pr/
```

## Recommended Dimensions

| Type | Ratio | Recommended |
|---|---:|---:|
| Products | 1:1 | 1200 × 1200 px minimum, 1500 × 1500 px retina |
| Brands | 1:1 | 512 × 512 px minimum, 1024 × 1024 px retina |
| Categories | 5:4 | 1280 × 1024 px minimum, 1600 × 1280 px retina |
| Flavor artwork | 1:1 | 768 × 768 px minimum, 1024 × 1024 px retina |

## Notes

- Brand images in the database may contain inconsistent dimensions; normalize future uploads.
- `brands/nexpod.png` previously had trailing whitespace in the database path; clean paths before upload.
- Active categories currently have `image_path = null` in many cases. Frontend falls back to product images.