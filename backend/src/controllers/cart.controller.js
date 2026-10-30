const cartService = require('../services/cart.service')
const { bodyOf, userIdOf, sendSuccess } = require('./_controllerUtils')

/**
 * Authenticated cart HTTP handlers.
 */
module.exports = {
  /**
   * Get the current cart.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async getCart(req, res, next) {
    try {
      const data = await cartService.getCart(userIdOf(req), req.supabase)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Empty the current cart.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async clearCart(req, res, next) {
    try {
      const data = await cartService.clearCart(userIdOf(req), req.supabase)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Add a cart line.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async addItem(req, res, next) {
    try {
      const data = await cartService.addItem(userIdOf(req), bodyOf(req), req.supabase)
      return sendSuccess(res, data, 201)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Update a cart line.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async updateItem(req, res, next) {
    try {
      const data = await cartService.updateItem(
        userIdOf(req), req.params.variantId, bodyOf(req).quantity, req.supabase,
      )
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Remove a cart line.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async removeItem(req, res, next) {
    try {
      await cartService.removeItem(userIdOf(req), req.params.variantId, req.supabase)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
}
