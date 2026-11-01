const { adminSupabase: supabase } = require('../config/supabase')
const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')
const ValidationError = require('../errors/ValidationError')

/**
 * Category catalogue use cases.
 * Dependencies: Supabase `categories` table and its RLS policy.
 */
class CategoryService {
  /**
   * List active categories, optionally scoped to a parent.
   * @param {{parent_id?: string, active?: boolean}} [filters]
   * @returns {Promise<{data: object[]}>}
   */
  async listCategories(filters = {}) {
    let query = supabase.from('categories').select('*', { count: 'exact' })
    if (filters.parent_id) query = query.eq('parent_id', filters.parent_id)
    if (filters.active !== false) query = query.eq('is_active', true)
    query = query.order('sort_order', { ascending: true }).order('name', { ascending: true })
    const { data, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list categories.')
    return { data: data || [] }
  }

  /**
   * Get one category by UUID.
   * @param {string} categoryId Category UUID.
   * @returns {Promise<object>}
   */
  async getCategoryById(categoryId) {
    const { data, error } = await supabase.from('categories').select('*').eq('id', categoryId).maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve category.')
    if (!data) throw new NotFoundError('Category')
    return data
  }

  /**
   * List every category for administration, including inactive rows and the
   * number of products attached to each category.
   * @param {{active?: boolean}} [filters]
   * @returns {Promise<object[]>}
   */
  async listAdminCategories(filters = {}) {
    let query = supabase.from('categories').select('*, products(count)')
    if (filters.active !== undefined) query = query.eq('is_active', filters.active)
    query = query.order('sort_order', { ascending: true }).order('name', { ascending: true })
    const { data, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list categories.')
    return (data || []).map(({ products, ...category }) => ({
      ...category,
      product_count: Number(products?.[0]?.count || 0),
    }))
  }

  /**
   * Create a category from an administrative request.
   * @param {object} input Validated category data.
   * @returns {Promise<object>}
   */
  async createCategory(input = {}) {
    const { data, error } = await supabase.from('categories')
      .insert(input).select().single()
    if (error) throw this.toWriteError(error, 'create')
    return data
  }

  /**
   * Update an existing category.
   * @param {string} categoryId Category UUID.
   * @param {object} input Validated category data.
   * @returns {Promise<object>}
   */
  async updateCategory(categoryId, input = {}) {
    if (!categoryId) throw new ValidationError('Category identifier is required.')
    const { data, error } = await supabase.from('categories')
      .update(input).eq('id', categoryId).select().maybeSingle()
    if (error) throw this.toWriteError(error, 'update')
    if (!data) throw new NotFoundError('Category')
    return data
  }

  /**
   * Delete a category when it is not referenced by any product.
   * @param {string} categoryId Category UUID.
   * @returns {Promise<void>}
   */
  async deleteCategory(categoryId) {
    if (!categoryId) throw new ValidationError('Category identifier is required.')
    const { data, error } = await supabase.from('categories')
      .delete().eq('id', categoryId).select('id').maybeSingle()
    if (error) {
      if (error.code === '23503') {
        throw new AppError(
          'Cette catégorie contient des produits et ne peut pas être supprimée.',
          'CONFLICT',
          409,
        )
      }
      throw AppError.fromSupabase(error, 'Unable to delete category.')
    }
    if (!data) throw new NotFoundError('Category')
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
        'Ce slug est déjà utilisé par une autre catégorie.',
        { field: 'slug' },
      )
    }
    if (error?.code === '23503') {
      return new ValidationError(
        'La catégorie parente est introuvable.',
        { field: 'parent_id' },
      )
    }
    return AppError.fromSupabase(
      error,
      action === 'create' ? 'Unable to create category.' : 'Unable to update category.',
    )
  }
}

module.exports = new CategoryService()
