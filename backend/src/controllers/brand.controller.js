const brandService = require('../services/brand.service')
const { sendSuccess } = require('./_controllerUtils')

/**
 * Public brand HTTP handlers.
 */
module.exports = {
  /**
   * List brands.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listBrands(req, res, next) {
    try {
      const filters = { ...req.query }
      if (filters.active !== undefined) filters.active = filters.active !== 'false'
      const result = await brandService.listBrands(filters)
      return sendSuccess(res, result.data, 200, result.meta)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Get a brand by UUID.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async getBrandById(req, res, next) {
    try {
      const data = await brandService.getBrandById(req.params.brandId)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },
}
