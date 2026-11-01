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

  /**
   * Create a product.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async createProduct(req, res, next) {
    try {
      const data = await productService.createProduct(req.body)
      return sendSuccess(res, data, 201)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Update a product.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async updateProduct(req, res, next) {
    try {
      const data = await productService.updateProduct(req.params.productId, req.body)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Delete a product.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async deleteProduct(req, res, next) {
    try {
      await productService.deleteProduct(req.params.productId)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  },

  async listProductVariants(req, res, next) {
    try {
      const data = await productService.listProductVariants(req.params.productId)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  async createProductVariant(req, res, next) {
    try {
      const data = await productService.createProductVariant(req.params.productId, req.body)
      return sendSuccess(res, data, 201)
    } catch (error) {
      return next(error)
    }
  },

  async updateProductVariant(req, res, next) {
    try {
      const data = await productService.updateProductVariant(req.params.variantId, req.body)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  async deleteProductVariant(req, res, next) {
    try {
      await productService.deleteProductVariant(req.params.variantId)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
}
