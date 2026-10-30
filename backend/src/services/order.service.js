const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ValidationError = require('../errors/ValidationError')
const { parsePagination, buildPaginationMeta } = require('../utils/pagination')
const { applySort } = require('../utils/filters')
const crypto = require('crypto')

/**
 * Authenticated order use cases.
 * Dependencies: create_order/cancel_order PostgreSQL RPCs and orders relation.
 */
class OrderService {
  /**
   * Create an order through the transactional PostgreSQL function.
   * @param {{profileId: string, idempotencyKey: string, requestHash: string, items: object[], customer_email: string, customer_phone: string, shipping_address: object, shipping_cost_tnd?: number}} input Order input.
   * @returns {Promise<object>}
   */
  async createOrder(input = {}) {
    this.requireProfile(input.profileId)
    const client = this.requireClient(input.userSupabase)
    const requestHash = input.requestHash || crypto.createHash('sha256')
      .update(JSON.stringify({
        items: input.items,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone,
        shipping_address: input.shipping_address,
        shipping_cost_tnd: input.shipping_cost_tnd || 0,
      })).digest('hex')
    if (!input.idempotencyKey || !Array.isArray(input.items) || input.items.length === 0
      || !input.customer_email || !input.customer_phone || !input.shipping_address
      || typeof input.shipping_address !== 'object') {
      throw new ValidationError('Order request is invalid.', { fields: ['idempotencyKey', 'items'] })
    }
    const { data, error } = await client.rpc('create_order', {
      p_idempotency_key: input.idempotencyKey,
      p_request_hash: requestHash,
      p_items: input.items,
      p_customer_email: input.customer_email,
      p_customer_phone: input.customer_phone,
      p_shipping_address: input.shipping_address,
      p_shipping_cost_tnd: input.shipping_cost_tnd || 0,
      p_profile_id: input.profileId,
    })
    if (error) throw AppError.fromSupabase(error, 'Unable to create order.')
    return data
  }

  /**
   * List orders owned by the authenticated profile.
   * @param {string} profileId Authenticated profile UUID.
   * @param {{status?: string, sort?: string, page?: number, page_size?: number}} [filters]
   * @returns {Promise<{data: object[], meta: object}>}
   */
  async listOrders(profileId, filters = {}, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    const pagination = parsePagination(filters)
    let query = client.from('orders').select('*, order_items(*)', { count: 'exact' })
      .eq('profile_id', profileId)
    if (filters.status) query = query.eq('status', filters.status)
    query = applySort(query, filters.sort, { created_at: 'created_at', total_tnd: 'total_tnd' }, '-created_at')
      .range(pagination.from, pagination.to)
    const { data, count, error } = await query
    if (error) throw AppError.fromSupabase(error, 'Unable to list orders.')
    return { data: data || [], meta: buildPaginationMeta(pagination.page, pagination.pageSize, count || 0) }
  }

  /**
   * Get one order owned by the authenticated profile.
   * @param {string} profileId Authenticated profile UUID.
   * @param {string} orderId Order UUID.
   * @returns {Promise<object>}
   */
  async getOrderById(profileId, orderId, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    const { data, error } = await client.from('orders').select('*, order_items(*)')
      .eq('id', orderId).eq('profile_id', profileId).maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve order.')
    if (!data) throw new NotFoundError('Order')
    return data
  }

  /**
   * Cancel an owned order through the transactional PostgreSQL function.
   * @param {string} profileId Authenticated profile UUID.
   * @param {string} orderId Order UUID.
   * @returns {Promise<object>} Cancelled order.
   */
  async cancelOrder(profileId, orderId, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    if (!orderId) throw new ValidationError('Order identifier is required.')
    const { data, error } = await client.rpc('cancel_order', { p_order_id: orderId })
    if (error) throw AppError.fromSupabase(error, 'Unable to cancel order.')
    return data
  }

  /**
   * Require an authenticated profile identifier.
   * @param {string} profileId Profile UUID.
   */
  requireProfile(profileId) {
    if (!profileId) throw new UnauthorizedError()
  }

  /**
   * @param {object} userSupabase JWT-scoped Supabase client.
   * @returns {object}
   */
  requireClient(userSupabase) {
    if (!userSupabase || typeof userSupabase.from !== 'function'
      || typeof userSupabase.rpc !== 'function') {
      throw new UnauthorizedError('Authenticated Supabase client is required.')
    }
    return userSupabase
  }
}

module.exports = new OrderService()
