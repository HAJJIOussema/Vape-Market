const AppError = require('./AppError')

/**
 * Error raised when request or business input is invalid.
 */
class ValidationError extends AppError {
  /**
   * @param {string} message Validation message.
   * @param {object} [details] Field-level validation details.
   */
  constructor(message = 'The request is invalid.', details = undefined) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

module.exports = ValidationError
