const categoryService = require('../services/category.service')
const { sendSuccess } = require('./_controllerUtils')

/**
 * Public category HTTP handlers.
 */
module.exports = {
  /**
   * List categories.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listCategories(req, res, next) {
    try {
      const filters = { ...req.query }
      if (filters.active !== undefined) filters.active = filters.active !== 'false'
      const result = await categoryService.listCategories(filters)
      return sendSuccess(res, result.data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Get a category by UUID.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async getCategoryById(req, res, next) {
    try {
      const data = await categoryService.getCategoryById(req.params.categoryId)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },
}
