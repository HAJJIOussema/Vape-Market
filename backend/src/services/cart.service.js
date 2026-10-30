const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ValidationError = require('../errors/ValidationError')

/**
 * Customer cart use cases.
 * Dependencies: carts, cart_items and product_variants Supabase relations.
 */
class CartService {
  /**
   * Require an authenticated profile identifier.
   * @param {string} profileId Authenticated profile UUID.
   */
  requireProfile(profileId) {
    if (!profileId) throw new UnauthorizedError()
  }

  /**
   * Fetch or create the current user's cart.
   * @param {string} profileId Authenticated profile UUID.
   * @returns {Promise<object>}
   */
  async getCart(profileId, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    let { data, error } = await client.from('carts').select('*, cart_items(*, product_variants(*))')
      .eq('profile_id', profileId).maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve cart.')
    if (!data) {
      const created = await client.from('carts').insert({ profile_id: profileId }).select('*, cart_items(*)').single()
      if (created.error) throw AppError.fromSupabase(created.error, 'Unable to create cart.')
      data = created.data
    }
    return { ...data, items: data.cart_items || [] }
  }

  /**
   * Add or replace a cart line.
   * @param {string} profileId Authenticated profile UUID.
   * @param {{variant_id: string, quantity: number}} item Cart line input.
   * @returns {Promise<object>}
   */
  async addItem(profileId, item, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    this.validateItem(item)
    const cart = await this.getCart(profileId, client)
    const { error } = await client.from('cart_items')
      .upsert({ cart_id: cart.id, variant_id: item.variant_id, quantity: item.quantity })
    if (error) throw AppError.fromSupabase(error, 'Unable to add cart item.')
    return this.getCart(profileId, client)
  }

  /**
   * Update a cart line quantity.
   * @param {string} profileId Authenticated profile UUID.
   * @param {string} variantId Variant UUID.
   * @param {number} quantity New quantity.
   * @returns {Promise<object>}
   */
  async updateItem(profileId, variantId, quantity, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    this.validateItem({ variant_id: variantId, quantity })
    const cart = await this.getCart(profileId, client)
    const { data, error } = await client.from('cart_items')
      .update({ quantity }).eq('cart_id', cart.id).eq('variant_id', variantId).select().maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to update cart item.')
    if (!data) throw new NotFoundError('Cart item')
    return this.getCart(profileId, client)
  }

  /**
   * Remove a cart line.
   * @param {string} profileId Authenticated profile UUID.
   * @param {string} variantId Variant UUID.
   * @returns {Promise<void>}
   */
  async removeItem(profileId, variantId, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    const cart = await this.getCart(profileId, client)
    const { data, error } = await client.from('cart_items').delete()
      .eq('cart_id', cart.id).eq('variant_id', variantId).select('variant_id').maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to remove cart item.')
    if (!data) throw new NotFoundError('Cart item')
  }

  /**
   * Remove every line from the authenticated user's cart.
   * @param {string} profileId Authenticated profile UUID.
   * @returns {Promise<object>} The emptied cart.
   */
  async clearCart(profileId, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    const cart = await this.getCart(profileId, client)
    const { error } = await client.from('cart_items').delete().eq('cart_id', cart.id)
    if (error) throw AppError.fromSupabase(error, 'Unable to clear cart.')
    return this.getCart(profileId, client)
  }

  /**
   * @param {object} userSupabase JWT-scoped Supabase client.
   * @returns {object}
   */
  requireClient(userSupabase) {
    if (!userSupabase || typeof userSupabase.from !== 'function') {
      throw new UnauthorizedError('Authenticated Supabase client is required.')
    }
    return userSupabase
  }

  /**
   * Validate a cart line before persistence.
   * @param {{variant_id?: string, quantity?: number}} item Cart line.
   */
  validateItem(item = {}) {
    if (!item.variant_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
      throw new ValidationError('Cart item is invalid.', { fields: ['variant_id', 'quantity'] })
    }
  }
}

module.exports = new CartService()
