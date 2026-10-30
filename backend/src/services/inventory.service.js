const AppError = require('../errors/AppError')
const { adminSupabase: supabase } = require('../config/supabase')
const ForbiddenError = require('../errors/ForbiddenError')
const NotFoundError = require('../errors/NotFoundError')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ValidationError = require('../errors/ValidationError')
const { parsePagination, buildPaginationMeta } = require('../utils/pagination')

const STOCK_ROLES = ['stock_manager', 'admin', 'super_admin']
const MOVEMENT_TYPES = ['restock', 'sale', 'adjustment', 'reserve', 'release', 'return']

/**
 * Inventory read and mutation boundary.
 * Stock mutations must use the validated PostgreSQL RPCs and append movements.
 */
class InventoryService {
  /**
   * @returns {Promise<{data: object[], meta: object}>} Inventory page.
   */
  async listInventory(profileId, filters = {}) {
    await this.requireRole(profileId, STOCK_ROLES)
    const pagination = parsePagination(filters)
    let query = supabase.from('inventory').select('*, product_variants(*)', { count: 'exact' })
    if (filters.variant_id) query = query.eq('variant_id', filters.variant_id)
    if (filters.in_stock !== undefined) {
      const inStock = filters.in_stock === true || filters.in_stock === 'true'
      query = inStock ? query.gt('on_hand', 0) : query.eq('on_hand', 0)
    }
    query = query.order('updated_at', { ascending: false }).range(pagination.from, pagination.to)
    const { data, count, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list inventory.')
    return { data: data || [], meta: buildPaginationMeta(pagination.page, pagination.pageSize, count || 0) }
  }

  /**
   * @returns {Promise<object>} Updated inventory row.
   */
  async adjustInventory(profileId, variantId, input = {}) {
    await this.requireRole(profileId, STOCK_ROLES)
    if (!variantId || !Number.isInteger(input.delta) || input.delta === 0
      || typeof input.reason !== 'string' || input.reason.trim() === '') {
      throw new ValidationError('Inventory adjustment is invalid.')
    }
    const { data, error } = await supabase.rpc('adjust_inventory', {
      p_variant_id: variantId,
      p_delta: input.delta,
      p_reason: input.reason.trim(),
    })
    if (error) throw AppError.fromSupabase(error, 'Unable to adjust inventory.')
    if (!data) throw new NotFoundError('Inventory')
    return data
  }

  /**
   * @returns {Promise<{data: object[], meta: object}>} Movement page.
   */
  async listMovements(profileId, filters = {}) {
    await this.requireRole(profileId, STOCK_ROLES)
    const pagination = parsePagination(filters)
    let query = supabase.from('inventory_movements').select('*', { count: 'exact' })
    if (filters.variant_id) query = query.eq('variant_id', filters.variant_id)
    if (filters.movement_type) {
      if (!MOVEMENT_TYPES.includes(filters.movement_type)) {
        throw new ValidationError('Inventory movement type is invalid.')
      }
      query = query.eq('movement_type', filters.movement_type)
    }
    query = query.order('created_at', { ascending: false }).range(pagination.from, pagination.to)
    const { data, count, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list inventory movements.')
    return { data: data || [], meta: buildPaginationMeta(pagination.page, pagination.pageSize, count || 0) }
  }

  /**
   * Resolve a role from the protected profile row.
   * @param {string} profileId Authenticated profile UUID.
   * @param {string[]} allowedRoles Allowed roles.
   * @returns {Promise<string>}
   */
  async requireRole(profileId, allowedRoles) {
    if (!profileId) throw new UnauthorizedError()
    const { data, error } = await supabase.from('profiles').select('role')
      .eq('id', profileId).maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to verify permissions.')
    if (!data || !allowedRoles.includes(data.role)) throw new ForbiddenError()
    return data.role
  }
}

module.exports = new InventoryService()
