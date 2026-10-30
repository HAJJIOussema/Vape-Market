const AppError = require('./AppError')

/**
 * Error raised when authentication is required.
 */
class UnauthorizedError extends AppError {
  /**
   * @param {string} [message] Safe public message.
   */
  constructor(message = 'Authentication is required.') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

module.exports = UnauthorizedError
