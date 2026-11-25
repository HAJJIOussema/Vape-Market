import { getFlavorArtworkPath } from './flavor.js'

function pathOf(image) {
  return String(image?.storage_path || image?.secure_url || '').trim()
}

/**
 * Image for one variant (flavour): a product_images row linked to the
 * variant, then variant.image_path, then the local flavour artwork.
 * @returns {string} Unresolved path, '' when the variant has no own image.
 */
export function getVariantImagePath(product, variant) {
  if (!variant) return ''
  const images = product?.product_images || []
  const variantImage = images.find((image) => image.variant_id === variant.id && pathOf(image))
  return pathOf(variantImage)
    || String(variant.image_path || '').trim()
    || getFlavorArtworkPath(product, variant)
}

/**
 * Main product image: a product-level image (variant_id = null), then any
 * image returned by the API, then the first variant's image.
 * @returns {string} Unresolved path, '' when nothing is available.
 */
export function getProductImagePath(product) {
  const images = product?.product_images || []
  const productImage = images.find((image) => !image.variant_id && pathOf(image))
  return pathOf(productImage)
    || (product?.image_paths || []).map((path) => String(path || '').trim()).find(Boolean)
    || getVariantImagePath(product, product?.variants?.[0])
    || ''
}

/** Image for a variant, falling back to the product image. */
export function getDisplayImagePath(product, variant) {
  return getVariantImagePath(product, variant) || getProductImagePath(product)
}
