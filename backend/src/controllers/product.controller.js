const productService = require('../services/product.service')
const { sendSuccess } = require('./_controllerUtils')

/**
 * Public product HTTP handlers.
 */
module.exports = {
  /**
   * List products.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listProducts(req, res, next) {
    try {
      const filters = { ...req.query }
      if (filters.in_stock !== undefined) filters.in_stock = filters.in_stock === 'true'
      const result = await productService.listProducts(filters)
      return sendSuccess(res, result.data, 200, result.meta)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Get a product by slug.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async getProductBySlug(req, res, next) {
    try {
      const data = await productService.getProductBySlug(req.params.slug)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Get a product by UUID.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async getProductById(req, res, next) {
    try {
      const data = await productService.getProductById(req.params.productId)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },
}
