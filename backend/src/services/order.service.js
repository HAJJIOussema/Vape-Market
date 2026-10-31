const AppError = require('../errors/AppError')
const { adminSupabase } = require('../config/supabase')
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
    // ══════════════════════════════════════════════════════════════════════
    // DEBUG BLOC — à retirer après résolution
    // ══════════════════════════════════════════════════════════════════════

    // 1. Log brut du JSON qui sera envoyé à PostgreSQL via RPC
    const itemsJson = JSON.stringify(input.items)
    console.log('\n━━━ [create_order DEBUG] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[RPC] p_items (JSON brut envoyé) :', itemsJson)
    console.log('[RPC] p_items parsed             :', JSON.parse(itemsJson))
    console.log('[RPC] p_profile_id               :', input.profileId)

    // 2. Simuler EXACTEMENT la jointure de create_order() pour chaque item
    //    SELECT v.id, i.on_hand, i.reserved
    //    FROM product_variants v
    //    JOIN products p ON p.id = v.product_id AND p.status = 'active'
    //    JOIN inventory i ON i.variant_id = v.id
    //    WHERE v.id = <variant_id>::uuid
    //      AND v.status = 'active'
    console.log('\n[DEBUG] Simulation de la jointure SQL de create_order() :')
    for (const item of input.items) {
      const vid = item.variant_id
      const qty  = Number(item.quantity)
      console.log(`\n  ▶ variant_id="${vid}"  quantity=${qty}`)
      console.log(`    typeof variant_id : ${typeof vid}`)
      console.log(`    longueur          : ${String(vid).length} (UUID attendu: 36)`)

      // Jointure triple identique à create_order()
      const { data: joinRow, error: joinErr } = await adminSupabase
        .from('product_variants')
        .select(`
          id,
          sku,
          name,
          status,
          price_tnd,
          products!inner ( id, name, status ),
          inventory!inner ( variant_id, on_hand, reserved )
        `)
        .eq('id', vid)
        .eq('status', 'active')
        .eq('products.status', 'active')
        .maybeSingle()

      if (joinErr) {
        console.error(`    ❌ ERREUR jointure : ${joinErr.message}`, joinErr)
        continue
      }

      if (!joinRow) {
        // Décomposer pour trouver où ça casse
        console.warn(`    ❌ JOINTURE NULLE — la condition create_order() échoue ici`)

        const { data: v } = await adminSupabase
          .from('product_variants')
          .select('id, status, product_id')
          .eq('id', vid)
          .maybeSingle()
        console.log(`    • product_variants.id trouvé   : ${v ? 'OUI' : 'NON'} | status=${v?.status}`)

        if (v) {
          const { data: p } = await adminSupabase
            .from('products')
            .select('id, status')
            .eq('id', v.product_id)
            .maybeSingle()
          console.log(`    • products.status              : ${p?.status ?? 'INTROUVABLE'}`)

          const { data: inv } = await adminSupabase
            .from('inventory')
            .select('variant_id, on_hand, reserved')
            .eq('variant_id', vid)
            .maybeSingle()
          console.log(`    • inventory trouvé             : ${inv ? 'OUI' : 'NON'}`)
          if (inv) console.log(`      on_hand=${inv.on_hand}  reserved=${inv.reserved}  available=${inv.on_hand - inv.reserved}`)
          
          if (v.status !== 'active') console.error(`    ══▶ CAUSE : variant.status="${v.status}" ≠ active`)
          else if (p?.status !== 'active') console.error(`    ══▶ CAUSE : product.status="${p?.status}" ≠ active`)
          else if (!inv) console.error(`    ══▶ CAUSE : AUCUNE ligne dans inventory pour ce variant_id`)
          else console.error(`    ══▶ CAUSE INCONNUE — toutes les tables OK mais la jointure échoue`)
        } else {
          console.error(`    ══▶ CAUSE : variant_id "${vid}" INTROUVABLE dans product_variants`)
          console.error(`                Vérifiez que le localStorage n'est pas un ancien seed.`)
        }
      } else {
        const inv = joinRow.inventory
        const available = inv.on_hand - inv.reserved
        const ok = available >= qty
        console.log(`    ✅ Jointure OK`)
        console.log(`    • sku="${joinRow.sku}"  variant="${joinRow.name}"  status=${joinRow.status}`)
        console.log(`    • product="${joinRow.products?.name}"  status=${joinRow.products?.status}`)
        console.log(`    • on_hand=${inv.on_hand}  reserved=${inv.reserved}  available=${available}  qty_demandée=${qty}  ${ok ? '✅ STOCK OK' : '❌ STOCK INSUFFISANT'}`)
        if (!ok) console.error(`    ══▶ CAUSE : stock insuffisant (available=${available} < qty=${qty})`)
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    // ══════════════════════════════════════════════════════════════════════

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
    if (error) {
      console.error('create_order RPC error', error)
      throw AppError.fromSupabase(error, error.message || 'Unable to create order.')
    }
    if (data.status === 'pending') return data
    const { data: pendingOrder, error: statusError } = await adminSupabase.from('orders')
      .update({ status: 'pending' })
      .eq('id', data.id)
      .eq('status', 'confirmed')
      .select()
      .single()
    if (statusError) throw AppError.fromSupabase(statusError, 'Unable to set the order status.')
    return pendingOrder
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
