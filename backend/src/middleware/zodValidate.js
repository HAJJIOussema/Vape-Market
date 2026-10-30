const { ZodError } = require('zod')

/**
 * Validate and sanitize an Express request body with a Zod schema.
 * The parsed value is exposed as `req.validatedBody`.
 *
 * @param {import('zod').ZodType} schema Zod schema for the request body.
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  if (!schema || typeof schema.safeParse !== 'function') {
    throw new TypeError('A valid Zod schema is required.')
  }

  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (result.success) {
      req.validatedBody = result.data
      return next()
    }

    const details = result.error instanceof ZodError
      ? result.error.issues.map((issue) => ({
        path: issue.path.join('.') || 'body',
        message: issue.message,
      }))
      : [{ path: 'body', message: 'Les données sont invalides.' }]

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Les données envoyées sont invalides.',
        details,
      },
    })
  }
}

module.exports = validate
