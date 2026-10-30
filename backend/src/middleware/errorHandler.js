const AppError = require('../errors/AppError')

/**
 * Serialize application errors using the OpenAPI error contract.
 * @param {Error} error Error raised by a controller or service.
 * @param {import('express').Request} req Express request.
 * @param {import('express').Response} res Express response.
 * @param {import('express').NextFunction} next Express next function.
 * @returns {void}
 */
function errorHandler(error, req, res, next) {
  const userId = req.user && (req.user.id || req.user.sub)
  if (req.log) {
    req.log.error({
      err: error,
      requestId: req.requestId,
      userId,
      route: req.originalUrl,
      stack: error.stack,
    }, 'Unhandled request error')
  }

  if (res.headersSent) {
    return next(error)
  }

  const applicationError = error instanceof AppError
    ? error
    : new AppError('Internal server error', 'INTERNAL_SERVER_ERROR', 500)

  return res.status(applicationError.statusCode).json({
    success: false,
    error: {
      code: applicationError.code,
      message: applicationError.message,
      ...(applicationError.details ? { details: applicationError.details } : {}),
      ...(req.requestId ? { request_id: req.requestId } : {}),
    },
  })
}

module.exports = errorHandler
