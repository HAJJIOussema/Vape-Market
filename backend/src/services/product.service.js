const { adminSupabase: supabase } = require('../config/supabase')
const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')
const ValidationError = require('../errors/ValidationError')
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
    const images = this.toPublicImages(product.product_images)
    return {
      ...product,
      product_images: images,
      // Product-level images first (variant_id = null), each group by sort_order.
      image_paths: [...new Set(images.map((image) => image.storage_path))],
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
   * Normalise image rows: legacy rows may only have a Cloudinary secure_url,
   * and some storage paths contain stray whitespace. Rows without any usable
   * reference are dropped. Product-level images come before variant images.
   * @param {object[]} [images] product_images rows.
   * @returns {object[]}
   */
  toPublicImages(images = []) {
    return (images || [])
      .map((image) => ({
        ...image,
        storage_path: String(image.storage_path || image.secure_url || '').trim(),
      }))
      .filter((image) => image.storage_path)
      .sort((left, right) => {
        const leftVariant = left.variant_id ? 1 : 0
        const rightVariant = right.variant_id ? 1 : 0
        if (leftVariant !== rightVariant) return leftVariant - rightVariant
        return Number(left.sort_order || 0) - Number(right.sort_order || 0)
      })
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

  /**
   * Create a product from an administrative request.
   * @param {object} input Validated product data.
   * @returns {Promise<object>}
   */
  async createProduct(input = {}) {
    if (!input.category_id) throw new ValidationError('Category identifier is required.', { field: 'category_id' })
    if (!input.brand_id) throw new ValidationError('Brand identifier is required.', { field: 'brand_id' })
    const { data, error } = await supabase.from('products')
      .insert(input).select().single()
    if (error) throw this.toWriteError(error, 'create')
    return data
  }

  /**
   * Update an existing product.
   * @param {string} productId Product UUID.
   * @param {object} input Validated product data.
   * @returns {Promise<object>}
   */
  async updateProduct(productId, input = {}) {
    if (!productId) throw new ValidationError('Product identifier is required.')
    const { data, error } = await supabase.from('products')
      .update(input).eq('id', productId).select().maybeSingle()
    if (error) throw this.toWriteError(error, 'update')
    if (!data) throw new NotFoundError('Product')
    return data
  }

  /**
   * Delete a product when it is not referenced by variants or orders.
   * @param {string} productId Product UUID.
   * @returns {Promise<void>}
   */
  async deleteProduct(productId) {
    if (!productId) throw new ValidationError('Product identifier is required.')
    const { data, error } = await supabase.from('products')
      .delete().eq('id', productId).select('id').maybeSingle()
    if (error) {
      if (error.code === '23503') {
        throw new AppError(
          'Ce produit est utilisé par des variantes ou des commandes et ne peut pas être supprimé.',
          'CONFLICT',
          409,
        )
      }
      throw AppError.fromSupabase(error, 'Unable to delete product.')
    }
    if (!data) throw new NotFoundError('Product')
  }

  /**
   * Turn database integrity errors into actionable API errors.
   * @param {{code?: string}} error Supabase error.
   * @param {'create'|'update'} action Attempted operation.
   * @returns {AppError}
   */
  toWriteError(error, action) {
    if (error?.code === '23505') {
      return new ValidationError(
        'Ce slug est déjà utilisé par un autre produit.',
        { field: 'slug' },
      )
    }
    if (error?.code === '23503') {
      return new ValidationError(
        'La catégorie ou la marque est introuvable.',
        { field: 'category_id' },
      )
    }
    return AppError.fromSupabase(
      error,
      action === 'create' ? 'Unable to create product.' : 'Unable to update product.',
    )
  }

  async listProductVariants(productId) {
    if (!productId) throw new ValidationError('Product identifier is required.')
    const { data, error } = await supabase
      .from('product_variants')
      .select('*, inventory(on_hand, reserved)')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })
    if (error) throw AppError.fromSupabase(error, 'Unable to list product variants.')
    return (data || []).map((variant) => {
      const inventory = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory
      return {
        ...variant,
        on_hand: Number(inventory?.on_hand || 0),
        reserved: Number(inventory?.reserved || 0),
        available: Number(inventory?.on_hand || 0) - Number(inventory?.reserved || 0),
      }
    })
  }

  async createProductVariant(productId, input = {}) {
    if (!productId) throw new ValidationError('Product identifier is required.')
    if (!input.name) throw new ValidationError('Variant name is required.', { field: 'name' })
    if (!input.sku) throw new ValidationError('Variant SKU is required.', { field: 'sku' })
    if (input.price_tnd === undefined || input.price_tnd === null) {
      throw new ValidationError('Variant price is required.', { field: 'price_tnd' })
    }

    const { stock, ...variantInput } = input
    const { data: variant, error } = await supabase
      .from('product_variants')
      .insert({ ...variantInput, product_id: productId })
      .select()
      .single()
    if (error) throw this.toVariantWriteError(error, 'create')
    if (!variant) throw new NotFoundError('ProductVariant')

    const initialStock = Number(stock || 0)
    const { error: inventoryError } = await supabase
      .from('inventory')
      .insert({ variant_id: variant.id, on_hand: initialStock, reserved: 0 })
    if (inventoryError) throw AppError.fromSupabase(inventoryError, 'Unable to create variant inventory.')

    if (initialStock > 0) {
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          variant_id: variant.id,
          actor_id: null,
          movement_type: 'restock',
          quantity_before: 0,
          quantity_change: initialStock,
          quantity_after: initialStock,
          reserved_before: 0,
          reserved_change: 0,
          reserved_after: 0,
          reason: 'Création de variante',
        })
      if (movementError) throw AppError.fromSupabase(movementError, 'Unable to record variant stock movement.')
    }

    return { ...variant, on_hand: initialStock, reserved: 0, available: initialStock }
  }

  async updateProductVariant(variantId, input = {}) {
    if (!variantId) throw new ValidationError('Variant identifier is required.')

    const { stock, ...variantInput } = input
    if (Object.keys(variantInput).length > 0) {
      if (variantInput.is_default === true) {
        const { data: current } = await supabase
          .from('product_variants')
          .select('product_id')
          .eq('id', variantId)
          .maybeSingle()
        if (current?.product_id) {
          await supabase
            .from('product_variants')
            .update({ is_default: false })
            .eq('product_id', current.product_id)
            .neq('id', variantId)
        }
      }
      const { error } = await supabase
        .from('product_variants')
        .update(variantInput)
        .eq('id', variantId)
      if (error) throw this.toVariantWriteError(error, 'update')
    }

    if (stock !== undefined) {
      const desiredStock = Number(stock)
      if (!Number.isInteger(desiredStock) || desiredStock < 0) {
        throw new ValidationError('Stock is invalid.', { field: 'stock' })
      }
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('on_hand, reserved')
        .eq('variant_id', variantId)
        .maybeSingle()
      if (inventoryError) throw AppError.fromSupabase(inventoryError, 'Unable to retrieve variant inventory.')
      if (!inventory) throw new NotFoundError('Inventory')

      const reserved = Number(inventory.reserved || 0)
      if (desiredStock < reserved) {
        throw new AppError('Le stock ne peut pas être inférieur à la quantité réservée.', 'CONFLICT', 409)
      }
      const before = Number(inventory.on_hand || 0)
      const delta = desiredStock - before
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ on_hand: desiredStock })
        .eq('variant_id', variantId)
      if (updateError) throw AppError.fromSupabase(updateError, 'Unable to update variant stock.')

      if (delta !== 0) {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            variant_id: variantId,
            actor_id: null,
            movement_type: delta > 0 ? 'restock' : 'adjustment',
            quantity_before: before,
            quantity_change: delta,
            quantity_after: desiredStock,
            reserved_before: reserved,
            reserved_change: 0,
            reserved_after: reserved,
            reason: 'Modification admin du stock',
          })
        if (movementError) throw AppError.fromSupabase(movementError, 'Unable to record variant stock movement.')
      }
    }

    const { data, error } = await supabase
      .from('product_variants')
      .select('*, inventory(on_hand, reserved)')
      .eq('id', variantId)
      .maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve updated variant.')
    if (!data) throw new NotFoundError('ProductVariant')
    const inventory = Array.isArray(data.inventory) ? data.inventory[0] : data.inventory
    return {
      ...data,
      on_hand: Number(inventory?.on_hand || 0),
      reserved: Number(inventory?.reserved || 0),
      available: Number(inventory?.on_hand || 0) - Number(inventory?.reserved || 0),
    }
  }

  async deleteProductVariant(variantId) {
    if (!variantId) throw new ValidationError('Variant identifier is required.')
    const { error: inventoryError } = await supabase
      .from('inventory')
      .delete()
      .eq('variant_id', variantId)
    if (inventoryError) throw AppError.fromSupabase(inventoryError, 'Unable to delete variant inventory.')

    const { data, error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId)
      .select('id')
      .maybeSingle()
    if (error) {
      if (error.code === '23503') {
        throw new AppError('Cette variante est utilisée par des commandes et ne peut pas être supprimée.', 'CONFLICT', 409)
      }
      throw AppError.fromSupabase(error, 'Unable to delete variant.')
    }
    if (!data) throw new NotFoundError('ProductVariant')
  }

  toVariantWriteError(error, action) {
    if (error?.code === '23505') {
      return new ValidationError('Ce SKU est déjà utilisé par une autre variante.', { field: 'sku' })
    }
    if (error?.code === '23503') {
      return new ValidationError('Le produit est introuvable.', { field: 'product_id' })
    }
    return AppError.fromSupabase(error, action === 'create' ? 'Unable to create variant.' : 'Unable to update variant.')
  }
}

module.exports = new ProductService()
