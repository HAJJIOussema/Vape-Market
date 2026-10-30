/**
 * Base error exposed by the application layer.
 */
class AppError extends Error {
  /**
   * @param {string} message Human-readable error message.
   * @param {string} code Stable API error code.
   * @param {number} statusCode HTTP status code.
   * @param {object} [details] Structured diagnostic details safe for clients.
   */
  constructor(message, code = 'APPLICATION_ERROR', statusCode = 500, details = undefined) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert an unexpected Supabase error without exposing provider internals.
   * @param {{message?: string, code?: string, details?: string, hint?: string}} error Supabase error.
   * @param {string} [message] Safe public message.
   * @returns {AppError}
   */
  static fromSupabase(error, message = 'Database operation failed') {
    return new AppError(message, 'DATABASE_ERROR', 500, {
      providerCode: error && error.code ? error.code : undefined,
    })
  }
}

module.exports = AppError
