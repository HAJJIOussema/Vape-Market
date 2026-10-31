const AppError = require('../errors/AppError')
const { adminSupabase: supabase } = require('../config/supabase')
const ForbiddenError = require('../errors/ForbiddenError')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ValidationError = require('../errors/ValidationError')
const { parsePagination, buildPaginationMeta } = require('../utils/pagination')

const ADMIN_ROLES = ['admin', 'super_admin']
const STAFF_ROLES = ['stock_manager', 'admin', 'super_admin']
const ORDER_STATUSES = [
  'pending', 'confirmed', 'processing', 'shipped',
  'delivered', 'cancelled', 'returned', 'refunded',
]

/**
 * Administration orchestration boundary.
 * Role checks remain enforced by Supabase RLS and PostgreSQL helpers.
 */
class AdminService {
  /**
   * @returns {Promise<{data: object[], meta: object}>} Administrative order page.
   */
  async listOrders(profileId, filters = {}) {
    await this.requireRole(profileId, ADMIN_ROLES)
    const pagination = parsePagination(filters)
    let query = supabase.from('orders').select('*, order_items(*)', { count: 'exact' })
    if (filters.status) {
      if (!ORDER_STATUSES.includes(filters.status)) {
        throw new ValidationError('Order status is invalid.')
      }
      query = query.eq('status', filters.status)
    }
    if (filters.profile_id) query = query.eq('profile_id', filters.profile_id)
    query = query.order('created_at', { ascending: false }).range(pagination.from, pagination.to)
    const { data, count, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list administrative orders.')
    return { data: data || [], meta: buildPaginationMeta(pagination.page, pagination.pageSize, count || 0) }
  }

  async confirmOrder(profileId, orderId) {
    await this.requireRole(profileId, ADMIN_ROLES)
    if (!orderId) throw new ValidationError('Order identifier is required.')
    const { data, error } = await supabase.from('orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select()
      .single()
    if (error) throw AppError.fromSupabase(error, 'Unable to confirm order.')
    return data
  }

  async cancelOrder(profileId, orderId, userSupabase) {
    await this.requireRole(profileId, ADMIN_ROLES)
    if (!orderId) throw new ValidationError('Order identifier is required.')
    if (!userSupabase || typeof userSupabase.rpc !== 'function') {
      throw new UnauthorizedError('Authenticated Supabase client is required for cancellation.')
    }
    const { data, error } = await userSupabase.rpc('cancel_order', { p_order_id: orderId })
    if (error) throw AppError.fromSupabase(error, 'Unable to cancel order.')
    return data
  }

  /**
   * @returns {Promise<object>} Shipped order.
   */
  async shipOrder(profileId, orderId, input = {}, userSupabase) {
    await this.requireRole(profileId, STAFF_ROLES)
    if (!orderId) throw new ValidationError('Order identifier is required.')
    if (input.carrier !== undefined && typeof input.carrier !== 'string') {
      throw new ValidationError('Carrier is invalid.')
    }
    if (input.tracking_number !== undefined && typeof input.tracking_number !== 'string') {
      throw new ValidationError('Tracking number is invalid.')
    }
    if (!userSupabase || typeof userSupabase.rpc !== 'function') {
      throw new UnauthorizedError('Authenticated Supabase client is required for shipment.')
    }
    const { data, error } = await userSupabase.rpc('ship_order', { p_order_id: orderId })
    if (error) throw AppError.fromSupabase(error, 'Unable to ship order.')
    if (input.carrier !== undefined || input.tracking_number !== undefined) {
      const update = await supabase.from('orders').update({
        ...(input.carrier !== undefined ? { carrier: input.carrier } : {}),
        ...(input.tracking_number !== undefined ? { tracking_number: input.tracking_number } : {}),
      }).eq('id', orderId).select().single()
      if (update.error) throw AppError.fromSupabase(update.error, 'Unable to save shipping details.')
      return update.data
    }
    return data
  }

  /**
   * Resolve the authenticated role from profiles.
   * @param {string} profileId Profile UUID.
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

module.exports = new AdminService()
