const AppError = require('../errors/AppError')
const { createAuthSupabase } = require('../config/supabase')

/**
 * Authentication boundary for Supabase Auth.
 */
class AuthService {
  async signUp(input) {
    const client = createAuthSupabase()
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.full_name || null } },
    })
    if (error) throw AppError.fromSupabase(error, 'Unable to create the account.')
    return data
  }

  async login(input) {
    const client = createAuthSupabase()
    const { data, error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })
    if (error) throw AppError.fromSupabase(error, 'Unable to sign in.')
    return data
  }

  async refreshToken(input) {
    const client = createAuthSupabase()
    const { data, error } = await client.auth.refreshSession({
      refresh_token: input.refresh_token,
    })
    if (error) throw AppError.fromSupabase(error, 'Unable to refresh the session.')
    return data
  }

  async logout() {
    return null
  }
}

module.exports = new AuthService()
