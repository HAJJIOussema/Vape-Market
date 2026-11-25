import { run, supabase } from './db.js'

// in_stock is a computed field (public.in_stock): a boolean, quantities stay private.
const PRODUCT_SELECT = '*, brands(*), categories(*), product_images(*), product_variants(*, in_stock)'

function sortImages(images = []) {
  return (images || [])
    .map((image) => ({ ...image, storage_path: String(image.storage_path || image.secure_url || '').trim() }))
    .filter((image) => image.storage_path)
    .sort((left, right) => (Number(Boolean(left.variant_id)) - Number(Boolean(right.variant_id)))
      || (Number(left.sort_order || 0) - Number(right.sort_order || 0)))
}

/** Shape a product row like the former API did (variants, image_paths). */
export function toPublicProduct(product, { activeVariantsOnly = true } = {}) {
  const images = sortImages(product.product_images)
  const variants = (product.product_variants || [])
    .filter((variant) => !activeVariantsOnly || !variant.status || variant.status === 'active')
    .sort((left, right) => (Number(right.is_default) - Number(left.is_default))
      || String(left.created_at || '').localeCompare(String(right.created_at || '')))
    .map((variant) => ({ ...variant, price_tnd: Number(variant.price_tnd), in_stock: Boolean(variant.in_stock) }))
  return {
    ...product,
    product_images: images,
    image_paths: [...new Set(images.map((image) => image.storage_path))],
    variants,
  }
}

/**
 * Active products. Accepts the former query string for compatibility
 * (only category_id is used; the catalogue is small, so no pagination).
 */
export async function getProducts(params = '') {
  const search = new URLSearchParams(params)
  let query = supabase.from('products').select(PRODUCT_SELECT)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (search.get('category_id')) query = query.eq('category_id', search.get('category_id'))
  const rows = await run(query, 'Impossible de charger les produits.')
  return { data: (rows || []).map((product) => toPublicProduct(product)) }
}

export async function getProductBySlug(slug) {
  const row = await run(
    supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('status', 'active').maybeSingle(),
    'Impossible de charger ce produit.',
  )
  if (!row) throw Object.assign(new Error('Ce produit n’existe pas ou n’est plus disponible.'), { status: 404 })
  return { data: toPublicProduct(row) }
}
