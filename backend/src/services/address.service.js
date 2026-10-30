const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')
const UnauthorizedError = require('../errors/UnauthorizedError')
const ValidationError = require('../errors/ValidationError')

/**
 * Customer address use-case boundary.
 * Address ownership must always be derived from the authenticated profile.
 */
class AddressService {
  /**
   * @returns {Promise<object[]>} Owned addresses.
   */
  async listAddresses(profileId, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    const { data, error } = await client.from('addresses').select('*')
      .eq('profile_id', profileId).order('is_default', { ascending: false }).order('created_at')
    if (error) throw AppError.fromSupabase(error, 'Unable to list addresses.')
    return data || []
  }

  /**
   * @returns {Promise<object>} Created address.
   */
  async createAddress(profileId, input = {}, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    this.validateInput(input)
    const { data, error } = await client.from('addresses')
      .insert({ ...input, profile_id: profileId }).select().single()
    if (error) throw AppError.fromSupabase(error, 'Unable to create address.')
    return data
  }

  /**
   * Retrieve one address owned by the authenticated profile.
   * @param {string} profileId Profile UUID.
   * @param {string} addressId Address UUID.
   * @returns {Promise<object>} Address.
   */
  async getAddress(profileId, addressId, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    if (!addressId) throw new ValidationError('Address identifier is required.')
    const { data, error } = await client.from('addresses').select('*')
      .eq('id', addressId).eq('profile_id', profileId).maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve address.')
    if (!data) throw new NotFoundError('Address')
    return data
  }

  /**
   * @returns {Promise<object>} Updated address.
   */
  async updateAddress(profileId, addressId, input = {}, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    this.validateInput(input, true)
    const { data, error } = await client.from('addresses').update(input)
      .eq('id', addressId).eq('profile_id', profileId).select().maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to update address.')
    if (!data) throw new NotFoundError('Address')
    return data
  }

  /**
   * @returns {Promise<void>}
   */
  async deleteAddress(profileId, addressId, userSupabase) {
    this.requireProfile(profileId)
    const client = this.requireClient(userSupabase)
    const { data, error } = await client.from('addresses').delete()
      .eq('id', addressId).eq('profile_id', profileId).select('id').maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to delete address.')
    if (!data) throw new NotFoundError('Address')
  }

  /**
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
    if (!userSupabase || typeof userSupabase.from !== 'function') {
      throw new UnauthorizedError('Authenticated Supabase client is required.')
    }
    return userSupabase
  }

  /**
   * @param {object} input Address data.
   * @param {boolean} [partial] Whether an update payload is allowed.
   */
  validateInput(input, partial = false) {
    const allowed = [
      'address_type', 'label', 'recipient_name', 'phone', 'governorate',
      'city', 'address_line', 'postal_code', 'is_default',
    ]
    if (!partial && !input.label) throw new ValidationError('Address label is required.')
    if (Object.keys(input).some((key) => !allowed.includes(key))) {
      throw new ValidationError('Address contains unsupported fields.')
    }
    if (partial && Object.keys(input).length === 0) {
      throw new ValidationError('At least one address field is required.')
    }
  }
}

module.exports = new AddressService()
