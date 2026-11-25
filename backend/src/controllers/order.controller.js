const orderService = require('../services/order.service')
const { bodyOf, userIdOf, sendSuccess } = require('./_controllerUtils')

/**
 * Order HTTP handlers (checkout is open to guests).
 */
module.exports = {
  /**
   * Create an order for the authenticated customer, or a guest order.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async createOrder(req, res, next) {
    try {
      const data = await orderService.createOrder({
        ...bodyOf(req),
        profileId: userIdOf(req),
        userSupabase: req.supabase,
        idempotencyKey: req.get('Idempotency-Key'),
      })
      return sendSuccess(res, data, 201)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Look up a guest order with its number and access token.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async lookupGuestOrder(req, res, next) {
    try {
      const data = await orderService.getGuestOrder(bodyOf(req))
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * List current user's orders.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listOrders(req, res, next) {
    try {
      const result = await orderService.listOrders(userIdOf(req), req.query, req.supabase)
      return sendSuccess(res, result.data, 200, result.meta)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Get one current user's order.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async getOrderById(req, res, next) {
    try {
      const data = await orderService.getOrderById(userIdOf(req), req.params.orderId, req.supabase)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Cancel an order.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async cancelOrder(req, res, next) {
    try {
      const data = await orderService.cancelOrder(userIdOf(req), req.params.orderId, req.supabase)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },
}
