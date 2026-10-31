const orderService = require('../services/order.service')
const { bodyOf, userIdOf, sendSuccess } = require('./_controllerUtils')

/**
 * Authenticated order HTTP handlers.
 */
module.exports = {
  /**
   * Create an order.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async createOrder(req, res, next) {
    try {
      // ── DEBUG JWT FLOW ────────────────────────────────────────────────────
      console.log('[createOrder] req.user          :', req.user)
      console.log('[createOrder] Authorization header:', req.headers.authorization)
      console.log('[createOrder] authenticated user id:', req.user?.id)
      console.log('[createOrder] req.supabase exists :', Boolean(req.supabase))
      // ─────────────────────────────────────────────────────────────────────
      const data = await orderService.createOrder({
        ...bodyOf(req),
        profileId: userIdOf(req),
        userSupabase: req.supabase,
        idempotencyKey: req.get('Idempotency-Key'),
        requestHash: req.get('X-Request-Hash'),
      })
      return sendSuccess(res, data, 201)
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
