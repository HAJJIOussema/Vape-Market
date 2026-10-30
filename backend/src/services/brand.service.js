const { adminSupabase: supabase } = require('../config/supabase')
const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')
const { parsePagination, buildPaginationMeta } = require('../utils/pagination')
const { applySearch, applySort } = require('../utils/filters')

/**
 * Brand catalogue use cases.
 * Dependencies: Supabase `brands` table.
 */
class BrandService {
  /**
   * List active brands using the public pagination contract.
   * @param {{q?: string, active?: boolean, sort?: string, page?: number, page_size?: number}} [filters]
   * @returns {Promise<{data: object[], meta: object}>}
   */
  async listBrands(filters = {}) {
    const pagination = parsePagination(filters)
    let query = supabase.from('brands').select('*', { count: 'exact' })
    if (filters.active !== false) query = query.eq('is_active', true)
    query = applySearch(query, filters.q)
    query = applySort(query, filters.sort, { name: 'name', created_at: 'created_at' }, 'name')
      .range(pagination.from, pagination.to)
    const { data, count, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list brands.')
    return { data: data || [], meta: buildPaginationMeta(pagination.page, pagination.pageSize, count || 0) }
  }

  /**
   * Get one brand by UUID.
   * @param {string} brandId Brand UUID.
   * @returns {Promise<object>}
   */
  async getBrandById(brandId) {
    const { data, error } = await supabase.from('brands').select('*').eq('id', brandId).maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve brand.')
    if (!data) throw new NotFoundError('Brand')
    return data
  }
}

module.exports = new BrandService()
