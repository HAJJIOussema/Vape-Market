const AppError = require('../errors/AppError')

/**
 * Authentication boundary reserved for Supabase Auth integration.
 * The HTTP controllers must call this service rather than the Supabase client.
 */
class AuthService {
  /**
   * @returns {Promise<never>} Not implemented until Auth controllers are introduced.
   */
  async signUp() { throw new AppError('Authentication service is not implemented.', 'NOT_IMPLEMENTED', 501) }

  /**
   * @returns {Promise<never>} Not implemented until Auth controllers are introduced.
   */
  async login() { throw new AppError('Authentication service is not implemented.', 'NOT_IMPLEMENTED', 501) }

  /**
   * @returns {Promise<never>} Not implemented until Auth controllers are introduced.
   */
  async refreshToken() { throw new AppError('Authentication service is not implemented.', 'NOT_IMPLEMENTED', 501) }

  /**
   * @returns {Promise<never>} Not implemented until Auth controllers are introduced.
   */
  async logout() { throw new AppError('Authentication service is not implemented.', 'NOT_IMPLEMENTED', 501) }
}

module.exports = new AuthService()
