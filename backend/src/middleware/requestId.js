const crypto = require('node:crypto')

/**
 * Attach a stable correlation identifier to the request and response.
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @param {import('express').NextFunction} next Express next function.
 * @returns {void}
 */
function requestId(req, res, next) {
  const supplied = req.get('X-Request-Id')
  const id = supplied && supplied.trim() ? supplied.trim().slice(0, 128) : crypto.randomUUID()
  req.requestId = id
  res.setHeader('X-Request-Id', id)
  return next()
}

module.exports = requestId
