const AppError = require('../errors/AppError')
const { adminSupabase: supabase } = require('../config/supabase')
const ForbiddenError = require('../errors/ForbiddenError')
const NotFoundError = require('../errors/NotFoundError')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ValidationError = require('../errors/ValidationError')
const { parsePagination, buildPaginationMeta } = require('../utils/pagination')
const { applySearch, applySort } = require('../utils/filters')

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

  /**
   * List user profiles with their order count.
   * Search applies to the full name and phone number.
   * @param {string} profileId Authenticated administrator profile UUID.
   * @param {{q?: string, sort?: string, page?: number|string, page_size?: number|string}} [filters]
   * @returns {Promise<{data: object[], meta: object}>} User page.
   */
  async listUsers(profileId, filters = {}) {
    await this.requireRole(profileId, ADMIN_ROLES)
    const pagination = parsePagination(filters)
    let query = supabase.from('profiles')
      .select('id, full_name, phone, role, created_at, orders(count)', { count: 'exact' })
    query = applySearch(query, filters.q, ['full_name', 'phone'])
    if (filters.sort) {
      query = applySort(query, filters.sort, {
        full_name: 'full_name',
        role: 'role',
        created_at: 'created_at',
      }, 'created_at')
    } else {
      query = query.order('created_at', { ascending: false })
    }
    query = query.range(pagination.from, pagination.to)
    const { data, count, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list users.')
    return {
      data: (data || []).map(({ orders, ...profile }) => ({
        ...profile,
        order_count: Number(orders?.[0]?.count || 0),
      })),
      meta: buildPaginationMeta(pagination.page, pagination.pageSize, count || 0),
    }
  }

  /**
   * Retrieve one user with order history and total ordered amount.
   * @param {string} profileId Authenticated administrator profile UUID.
   * @param {string} userId Target profile UUID.
   * @returns {Promise<object>} User detail.
   */
  async getUserById(profileId, userId) {
    await this.requireRole(profileId, ADMIN_ROLES)
    if (!userId) throw new ValidationError('User identifier is required.')
    const { data: profile, error } = await supabase.from('profiles')
      .select('id, full_name, phone, role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve user.')
    if (!profile) throw new NotFoundError('User')

    const [ordersResult, addressesResult] = await Promise.all([
      supabase.from('orders')
        .select('id, order_number, created_at, status, total_tnd')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('addresses')
        .select('id, label, recipient_name, phone, governorate, city, address_line, postal_code, is_default, created_at')
        .eq('profile_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false }),
    ])
    if (ordersResult.error) throw AppError.fromSupabase(ordersResult.error, 'Unable to retrieve user orders.')
    if (addressesResult.error) throw AppError.fromSupabase(addressesResult.error, 'Unable to retrieve user addresses.')

    const orderRows = ordersResult.data || []
    const addressRows = addressesResult.data || []
    return {
      ...profile,
      order_count: orderRows.length,
      total_ordered_tnd: orderRows.reduce(
        (total, order) => total + Number(order.total_tnd || 0),
        0,
      ),
      addresses: addressRows,
      orders: orderRows,
    }
  }

  async confirmOrder(profileId, orderId) {
    await this.requireRole(profileId, ADMIN_ROLES)
    if (!orderId) throw new ValidationError('Order identifier is required.')

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, order_items(variant_id, quantity)')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError) throw AppError.fromSupabase(orderError, 'Unable to retrieve order.')
    if (!order) throw new NotFoundError('Order')
    if (order.status !== 'pending') {
      throw new AppError('Seules les commandes en attente peuvent être confirmées.', 'CONFLICT', 409)
    }

    const { data, error } = await supabase.from('orders')
      .update({ status: 'confirmed' })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select()
      .single()
    if (error) throw AppError.fromSupabase(error, 'Unable to confirm order.')

    const items = order.order_items || []
    for (const item of items) {
      if (!item.variant_id) continue
      const quantity = Number(item.quantity)
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new ValidationError('Order item quantity is invalid.')
      }

      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('on_hand, reserved')
        .eq('variant_id', item.variant_id)
        .maybeSingle()
      if (inventoryError) throw AppError.fromSupabase(inventoryError, 'Unable to retrieve inventory.')
      if (!inventory) throw new NotFoundError('Inventory')

      const onHandBefore = Number(inventory.on_hand || 0)
      const reservedBefore = Number(inventory.reserved || 0)
      const onHandAfter = onHandBefore - quantity
      const reservedAfter = reservedBefore - quantity
      if (onHandAfter < 0 || reservedAfter < 0) {
        throw new AppError('Stock insuffisant pour confirmer cette commande.', 'CONFLICT', 409)
      }

      const { error: stockError } = await supabase
        .from('inventory')
        .update({ on_hand: onHandAfter, reserved: reservedAfter })
        .eq('variant_id', item.variant_id)
      if (stockError) throw AppError.fromSupabase(stockError, 'Unable to update inventory.')

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          variant_id: item.variant_id,
          order_id: orderId,
          actor_id: profileId,
          movement_type: 'sale',
          quantity_before: onHandBefore,
          quantity_change: -quantity,
          quantity_after: onHandAfter,
          reserved_before: reservedBefore,
          reserved_change: -quantity,
          reserved_after: reservedAfter,
          reason: 'Commande confirmée',
        })
      if (movementError) throw AppError.fromSupabase(movementError, 'Unable to record inventory movement.')
    }

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
