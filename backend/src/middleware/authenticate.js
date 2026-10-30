const { adminSupabase, createUserSupabase } = require('../config/supabase')
const UnauthorizedError = require('../errors/UnauthorizedError')

/**
 * Verify a Supabase access token and attach user-scoped database access.
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @param {import('express').NextFunction} next Express next function.
 * @returns {Promise<void>}
 */
async function authenticate(req, res, next) {
  try {
    const authorization = req.get('Authorization') || ''
    const match = authorization.match(/^Bearer\s+(.+)$/i)
    if (!match) throw new UnauthorizedError()

    const accessToken = match[1].trim()
    const { data, error } = await adminSupabase.auth.getUser(accessToken)
    if (error || !data.user) throw new UnauthorizedError('Invalid or expired authentication token.')

    req.user = data.user
    req.supabase = createUserSupabase(accessToken)
    return next()
  } catch (error) {
    return next(error)
  }
}

module.exports = authenticate
