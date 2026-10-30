const { adminSupabase } = require('../config/supabase')
const ForbiddenError = require('../errors/ForbiddenError')
const UnauthorizedError = require('../errors/UnauthorizedError')

function authorizeAdmin(allowedRoles = ['admin', 'super_admin']) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) throw new UnauthorizedError()
      const { data, error } = await adminSupabase.from('profiles')
        .select('role').eq('id', req.user.id).maybeSingle()
      if (error) throw error
      if (!data || !allowedRoles.includes(data.role)) throw new ForbiddenError()
      req.userRole = data.role
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

module.exports = authorizeAdmin
