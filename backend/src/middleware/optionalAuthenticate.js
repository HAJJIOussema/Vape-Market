const authenticate = require('./authenticate')

/**
 * Authenticate the request when an Authorization header is present, otherwise
 * continue as a guest (req.user stays undefined).
 *
 * A present but invalid/expired token is still rejected with 401: a logged-in
 * customer whose session expired must not silently place a guest order.
 *
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @param {import('express').NextFunction} next Express next function.
 * @returns {Promise<void>|void}
 */
function optionalAuthenticate(req, res, next) {
  if (!req.get('Authorization')) return next()
  return authenticate(req, res, next)
}

module.exports = optionalAuthenticate
