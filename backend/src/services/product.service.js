const { adminSupabase: supabase } = require('../config/supabase')
const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')
const { parsePagination, buildPaginationMeta } = require('../utils/pagination')
const { applySearch, applySort } = require('../utils/filters')

const PRODUCT_SELECT = `
  *,
  brands(*),
  categories(*),
  product_images(*),
  product_variants(*, inventory(on_hand, reserved))
`

/**
 * Product catalogue use cases.
 * Dependencies: products, variants, images and inventory Supabase relations.
 */
class ProductService {
  /**
   * Remove exact inventory quantities from public product responses.
   * @param {object} product Product row with nested variants.
   * @returns {object} Public product representation.
   */
  toPublicProduct(product) {
    return {
      ...product,
      image_paths: (product.product_images || []).map((image) => image.storage_path),
      variants: (product.product_variants || []).map((variant) => {
        const inventory = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory
        const { inventory: unusedInventory, ...publicVariant } = variant
        void unusedInventory
        return {
          ...publicVariant,
          in_stock: Boolean(inventory && inventory.on_hand > inventory.reserved),
        }
      }),
    }
  }

  /**
   * List active products and expose only boolean stock availability.
   * @param {{q?: string, category_id?: string, brand_id?: string, status?: string, in_stock?: boolean, sort?: string, page?: number, page_size?: number}} [filters]
   * @returns {Promise<{data: object[], meta: object}>}
   */
  async listProducts(filters = {}) {
    const pagination = parsePagination(filters)
    let query = supabase.from('products').select(PRODUCT_SELECT, { count: 'exact' })
    query = filters.status ? query.eq('status', filters.status) : query.eq('status', 'active')
    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.brand_id) query = query.eq('brand_id', filters.brand_id)
    query = applySearch(query, filters.q)
    query = applySort(query, filters.sort, { name: 'name', created_at: 'created_at' }, '-created_at')
    if (filters.in_stock === undefined) query = query.range(pagination.from, pagination.to)
    const { data, count, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list products.')
    let products = (data || []).map((product) => this.toPublicProduct(product))
    const filtered = filters.in_stock === undefined
      ? products
      : products.filter((product) => product.variants.some((variant) => variant.in_stock === filters.in_stock))
    if (filters.in_stock !== undefined) {
      products = filtered.slice(pagination.from, pagination.to + 1)
    }
    return {
      data: filters.in_stock === undefined ? filtered : products,
      meta: buildPaginationMeta(
        pagination.page,
        pagination.pageSize,
        filters.in_stock === undefined ? count || 0 : filtered.length,
      ),
    }
  }

  /**
   * Get a product by its public slug.
   * @param {string} slug Product slug.
   * @returns {Promise<object>}
   */
  async getProductBySlug(slug) {
    const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug)
      .eq('status', 'active').maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve product.')
    if (!data) throw new NotFoundError('Product')
    return this.toPublicProduct(data)
  }

  /**
   * Get a product by UUID.
   * @param {string} productId Product UUID.
   * @returns {Promise<object>}
   */
  async getProductById(productId) {
    const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('id', productId)
      .eq('status', 'active').maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve product.')
    if (!data) throw new NotFoundError('Product')
    return this.toPublicProduct(data)
  }
}

module.exports = new ProductService()
