const AppError = require('./AppError')

/**
 * Error raised when a requested resource does not exist or is not visible.
 */
class NotFoundError extends AppError {
  /**
   * @param {string} resource Resource label.
   */
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

module.exports = NotFoundError
