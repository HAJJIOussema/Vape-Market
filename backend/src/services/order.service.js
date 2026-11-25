const AppError = require('../errors/AppError')
const { adminSupabase } = require('../config/supabase')
const NotFoundError = require('../errors/NotFoundError')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ValidationError = require('../errors/ValidationError')
const { parsePagination, buildPaginationMeta } = require('../utils/pagination')
const { applySort } = require('../utils/filters')
const crypto = require('crypto')

// Cash on delivery: shipping is currently free. The amount is decided here,
// never by the browser.
const SHIPPING_COST_TND = 0
const GUEST_TOKEN_TTL_DAYS = 30
const GUEST_ORDER_SELECT = 'id, order_number, status, customer_email, customer_phone, subtotal_tnd, '
  + 'shipping_cost_tnd, total_tnd, shipping_address_snapshot, created_at, updated_at, '
  + 'guest_access_token_hash, guest_token_expires_at, guest_access_revoked_at, profile_id, order_items(*)'

/**
 * Translate errors raised by the order PostgreSQL functions into API errors.
 * Unknown errors stay generic so database internals are not exposed.
 * @param {{message?: string, code?: string}} error Supabase error.
 * @returns {AppError}
 */
function toOrderError(error) {
  const message = (error && error.message) || ''
  if (message.startsWith('Stock insuffisant')) {
    return new AppError(message, 'INSUFFICIENT_STOCK', 409)
  }
  if (message.startsWith('Produit introuvable ou inactif')) {
    return new AppError('Un produit du panier n’est plus disponible.', 'PRODUCT_UNAVAILABLE', 409)
  }
  if (message.startsWith('Idempotency key was reused')) {
    return new AppError(
      'Cette commande a déjà été envoyée avec un contenu différent. Rechargez la page et réessayez.',
      'IDEMPOTENCY_CONFLICT',
      409,
    )
  }
  if (message === 'Invalid order request' || message === 'Invalid order quantity'
    || message.startsWith('Missing or invalid variant_id')) {
    return new ValidationError('La commande est invalide.')
  }
  return AppError.fromSupabase(error, 'Unable to create order.')
}

/**
 * Hash a guest access token. Only the hash is stored in the database.
 * @param {string} token Raw token.
 * @returns {string}
 */
function hashGuestToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Remove guest-token columns before sending an order to a client.
 * @param {object} order Order row.
 * @returns {object}
 */
function toPublicOrder(order) {
  if (!order) return order
  const {
    guest_access_token_hash: unusedHash,
    guest_token_expires_at: unusedExpiry,
    guest_access_revoked_at: unusedRevoked,
    ...publicOrder
  } = order
  void unusedHash
  void unusedExpiry
  void unusedRevoked
  return publicOrder
}

/**
 * Order use cases for customers and guests.
 * Dependencies: create_order / create_guest_order / cancel_order PostgreSQL
 * RPCs and the orders relation.
 */
class OrderService {
  /**
   * Create an order through the transactional PostgreSQL function.
   * With a profile the caller-scoped client runs create_order (auth.uid()).
   * Without a profile, the backend runs create_guest_order with the service
   * role and returns a one-time guest access token.
   * @param {{profileId?: string, userSupabase?: object, idempotencyKey: string, items: object[], customer_email: string, customer_phone: string, shipping_address: object}} input Order input.
   * @returns {Promise<object>}
   */
  async createOrder(input = {}) {
    const isGuest = !input.profileId
    if (!input.idempotencyKey || input.idempotencyKey.length < 16 || input.idempotencyKey.length > 255
      || !Array.isArray(input.items) || input.items.length === 0
      || !input.customer_email || !input.customer_phone || !input.shipping_address
      || typeof input.shipping_address !== 'object') {
      throw new ValidationError('Order request is invalid.', { fields: ['idempotencyKey', 'items'] })
    }

    const customerEmail = String(input.customer_email).trim().toLowerCase()
    const customerPhone = String(input.customer_phone).trim()
    // Computed server-side only: a client-supplied hash could hide a changed request.
    const requestHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        items: input.items,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: input.shipping_address,
        shipping_cost_tnd: SHIPPING_COST_TND,
      })).digest('hex')
    const params = {
      p_idempotency_key: input.idempotencyKey,
      p_request_hash: requestHash,
      p_items: input.items,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone,
      p_shipping_address: input.shipping_address,
      p_shipping_cost_tnd: SHIPPING_COST_TND,
    }

    let guestToken = null
    let result
    if (isGuest) {
      guestToken = crypto.randomBytes(24).toString('base64url')
      const expiresAt = new Date(Date.now() + GUEST_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
      result = await adminSupabase.rpc('create_guest_order', {
        ...params,
        p_guest_access_token_hash: hashGuestToken(guestToken),
        p_guest_token_expires_at: expiresAt.toISOString(),
      })
    } else {
      const client = this.requireClient(input.userSupabase)
      result = await client.rpc('create_order', { ...params, p_profile_id: input.profileId })
    }

    const { data, error } = result
    if (error) throw toOrderError(error)
    if (!data) throw new AppError('Unable to create order.', 'DATABASE_ERROR', 500)

    let order = data
    if (order.status !== 'pending') {
      const { data: pendingOrder, error: statusError } = await adminSupabase.from('orders')
        .update({ status: 'pending' })
        .eq('id', order.id)
        .eq('status', 'confirmed')
        .select()
        .maybeSingle()
      if (statusError) throw AppError.fromSupabase(statusError, 'Unable to set the order status.')
      if (pendingOrder) order = pendingOrder
    }

    if (!isGuest) return toPublicOrder(order)

    // On an idempotent replay the stored hash belongs to the first request's
    // token, which this response cannot know: no token is returned then.
    const tokenMatches = order.guest_access_token_hash === hashGuestToken(guestToken)
    return {
      ...toPublicOrder(order),
      guest_access_token: tokenMatches ? guestToken : null,
    }
  }

  /**
   * Retrieve a guest order from its public number and access token.
   * Every mismatch returns the same 404 so order numbers cannot be probed.
   * @param {{order_number: string, access_token: string}} input Lookup input.
   * @returns {Promise<object>}
   */
  async getGuestOrder(input = {}) {
    if (!input.order_number || !input.access_token) throw new NotFoundError('Order')
    const { data, error } = await adminSupabase.from('orders')
      .select(GUEST_ORDER_SELECT)
      .eq('order_number', input.order_number)
      .is('profile_id', null)
      .maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve order.')
    if (!data || !data.guest_access_token_hash) throw new NotFoundError('Order')

    const expected = Buffer.from(data.guest_access_token_hash, 'hex')
    const provided = Buffer.from(hashGuestToken(input.access_token), 'hex')
    const valid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided)
    const expired = !data.guest_token_expires_at || new Date(data.guest_token_expires_at) <= new Date()
    if (!valid || expired || data.guest_access_revoked_at) throw new NotFoundError('Order')

    const { profile_id: unusedProfile, ...order } = toPublicOrder(data)
    void unusedProfile
    return order
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
