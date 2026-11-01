const { adminSupabase: supabase } = require('../config/supabase')
const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')
const ValidationError = require('../errors/ValidationError')
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

  /**
   * List every brand for administration, including inactive rows and the
   * number of products attached to each brand.
   * @param {{active?: boolean}} [filters]
   * @returns {Promise<object[]>}
   */
  async listAdminBrands(filters = {}) {
    let query = supabase.from('brands').select('*, products(count)')
    if (filters.active !== undefined) query = query.eq('is_active', filters.active)
    query = query.order('name', { ascending: true })
    const { data, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list brands.')
    return (data || []).map(({ products, ...brand }) => ({
      ...brand,
      product_count: Number(products?.[0]?.count || 0),
    }))
  }

  /**
   * Create a brand from an administrative request.
   * @param {object} input Validated brand data.
   * @returns {Promise<object>}
   */
  async createBrand(input = {}) {
    const { data, error } = await supabase.from('brands')
      .insert(input).select().single()
    if (error) throw this.toWriteError(error, 'create')
    return data
  }

  /**
   * Update an existing brand.
   * @param {string} brandId Brand UUID.
   * @param {object} input Validated brand data.
   * @returns {Promise<object>}
   */
  async updateBrand(brandId, input = {}) {
    if (!brandId) throw new ValidationError('Brand identifier is required.')
    const { data, error } = await supabase.from('brands')
      .update(input).eq('id', brandId).select().maybeSingle()
    if (error) throw this.toWriteError(error, 'update')
    if (!data) throw new NotFoundError('Brand')
    return data
  }

  /**
   * Delete a brand when it is not referenced by any product.
   * @param {string} brandId Brand UUID.
   * @returns {Promise<void>}
   */
  async deleteBrand(brandId) {
    if (!brandId) throw new ValidationError('Brand identifier is required.')
    const { data, error } = await supabase.from('brands')
      .delete().eq('id', brandId).select('id').maybeSingle()
    if (error) {
      if (error.code === '23503') {
        throw new AppError(
          'Cette marque contient des produits et ne peut pas être supprimée.',
          'CONFLICT',
          409,
        )
      }
      throw AppError.fromSupabase(error, 'Unable to delete brand.')
    }
    if (!data) throw new NotFoundError('Brand')
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
        'Ce slug est déjà utilisé par une autre marque.',
        { field: 'slug' },
      )
    }
    return AppError.fromSupabase(
      error,
      action === 'create' ? 'Unable to create brand.' : 'Unable to update brand.',
    )
  }
}

module.exports = new BrandService()
