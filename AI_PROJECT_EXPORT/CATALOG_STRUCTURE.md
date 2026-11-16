# VAPE MARKET — Catalog Structure

## Final Catalog Hierarchy

```text
Brand
  -> Model
    -> Flavor
      -> Product detail
```

Example:

```text
Vozol
  -> Gear
    -> Mango Ice
    -> Grape Ice
    -> Blue Razz Ice
    -> Watermelon Ice
    -> Super Mint

Vozol
  -> Star
    -> Peach Mango Watermelon
    -> Cherry Cola
    -> Blackberry Grape
    -> Super Mint
```

## Visible Brands

- Vozol
- Nexpod
- Refillo
- Mazaya
- Al Fakher
- Wotofo

Hidden brands:

- Deep Cloud
- Crown Bar

## Model Storage

The model is stored in:

```text
product_variants.attributes.model
```

Examples:

- `Gear`
- `Star`
- `15K`
- `20K`
- `30K`
- `Classic`
- `Premium`

## Flavor Storage

The flavor is stored in:

```text
product_variants.name
```

Examples:

- `Mango Ice`
- `Grape Ice`
- `Blue Razz Ice`
- `Watermelon Ice`
- `Super Mint`

## Product Naming

Product names represent the brand and model:

- `Vozol Gear`
- `Vozol Star`
- `Nexpod 15K`
- `Refillo Classic`

The product detail title is dynamically composed as:

```text
Product Name + Selected Flavor
```

Example:

```text
Vozol Gear Mango Ice
```

If the product name already contains the flavor, no duplicate is added.

## Frontend Behavior

1. User opens `/categories` or `/marques`.
2. User selects a brand.
3. `/products?brand=<slug>` displays brand products.
4. User opens a product.
5. User selects a model if multiple models exist.
6. User selects a flavor.
7. Image, price, stock, SKU and title update dynamically.

## Important Notes

- Categories are still present in the database for admin use.
- Public frontend navigation is brand-based.
- Product variants are the source of flavors.
- Do not create one product per flavor unless required by a specific business rule. Prefer one product per model with multiple variants.