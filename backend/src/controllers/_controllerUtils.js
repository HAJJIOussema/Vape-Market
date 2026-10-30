/**
 * Return the validated body when the Zod middleware ran, otherwise the raw body.
 * @param {import('express').Request} req Express request.
 * @returns {object}
 */
function bodyOf(req) {
  return req.validatedBody || req.body || {}
}

/**
 * Extract the authenticated Supabase user identifier.
 * @param {import('express').Request} req Express request.
 * @returns {string|undefined}
 */
function userIdOf(req) {
  return req.user && (req.user.id || req.user.sub)
}

/**
 * Send a successful JSON response using the application contract.
 * @param {import('express').Response} res Express response.
 * @param {unknown} data Response data.
 * @param {number} [statusCode] HTTP status.
 * @param {object} [meta] Collection metadata.
 * @returns {import('express').Response}
 */
function sendSuccess(res, data, statusCode = 200, meta = undefined) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  })
}

module.exports = { bodyOf, userIdOf, sendSuccess }
