const { adminSupabase: supabase } = require('../config/supabase')
const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')

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
}

module.exports = new CategoryService()
