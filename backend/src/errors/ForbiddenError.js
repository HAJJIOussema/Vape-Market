const AppError = require('./AppError')

/**
 * Error raised when an authenticated principal lacks permission.
 */
class ForbiddenError extends AppError {
  /**
   * @param {string} [message] Safe public message.
   */
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

module.exports = ForbiddenError
