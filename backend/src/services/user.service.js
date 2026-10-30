const AppError = require('../errors/AppError')
const NotFoundError = require('../errors/NotFoundError')
const UnauthorizedError = require('../errors/UnauthorizedError')
/**
 * Profile and account lifecycle boundary.
 * Profile anonymization must preserve historical orders.
 */
class UserService {
  /**
   * @param {string} profileId Profile UUID.
   * @param {object} userSupabase JWT-scoped Supabase client.
   * @returns {Promise<object>} Current profile.
   */
  async getProfile(profileId, userSupabase) {
    const client = this.requireClient(profileId, userSupabase)
    const { data, error } = await client.from('profiles').select('*').eq('id', profileId).maybeSingle()
    if (error) throw AppError.fromSupabase(error, 'Unable to retrieve profile.')
    if (!data) throw new NotFoundError('Profile')
    return data
  }

  /**
   * @param {string} profileId Profile UUID.
   * @param {object} input Profile fields.
   * @param {object} userSupabase JWT-scoped Supabase client.
   * @returns {Promise<object>} Updated profile.
   */
  async updateProfile(profileId, input = {}, userSupabase) {
    const client = this.requireClient(profileId, userSupabase)
    const allowed = ['full_name', 'phone']
    if (Object.keys(input).length === 0 || Object.keys(input).some((key) => !allowed.includes(key))) {
      throw new AppError('Profile update is invalid.', 'VALIDATION_ERROR', 400)
    }
    const { data, error } = await client.from('profiles').update(input)
      .eq('id', profileId).select().single()
    if (error) throw AppError.fromSupabase(error, 'Unable to update profile.')
    return data
  }

  /**
   * @returns {Promise<never>} Stub awaiting account anonymization workflow.
   */
  async anonymizeProfile() { throw new AppError('User service is not implemented.', 'NOT_IMPLEMENTED', 501) }

  /**
   * @param {string} profileId Profile UUID.
   * @param {object} userSupabase JWT-scoped Supabase client.
   * @returns {object}
   */
  requireClient(profileId, userSupabase) {
    if (!profileId) throw new UnauthorizedError()
    if (!userSupabase || typeof userSupabase.from !== 'function') {
      throw new UnauthorizedError('Authenticated Supabase client is required.')
    }
    return userSupabase
  }
}

module.exports = new UserService()
