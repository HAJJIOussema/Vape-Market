const adminService = require('../services/admin.service')
const inventoryService = require('../services/inventory.service')
const auditService = require('../services/audit.service')
const { bodyOf, userIdOf, sendSuccess } = require('./_controllerUtils')

/**
 * Administrative HTTP handlers.
 */
module.exports = {
  /**
   * List all orders.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listOrders(req, res, next) {
    try {
      const result = await adminService.listOrders(userIdOf(req), req.query)
      return sendSuccess(res, result.data || result, 200, result.meta)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Ship an order.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async shipOrder(req, res, next) {
    try {
      const data = await adminService.shipOrder(
        userIdOf(req), req.params.orderId, bodyOf(req), req.supabase,
      )
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * List inventory.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listInventory(req, res, next) {
    try {
      const result = await inventoryService.listInventory(userIdOf(req), req.query)
      return sendSuccess(res, result.data || result, 200, result.meta)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Adjust a variant inventory.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async adjustInventory(req, res, next) {
    try {
      const data = await inventoryService.adjustInventory(
        userIdOf(req), req.params.variantId, bodyOf(req),
      )
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * List inventory movements.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listInventoryMovements(req, res, next) {
    try {
      const result = await inventoryService.listMovements(userIdOf(req), req.query)
      return sendSuccess(res, result.data || result, 200, result.meta)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * List immutable audit logs.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listAuditLogs(req, res, next) {
    try {
      const result = await auditService.listLogs(userIdOf(req), req.query)
      return sendSuccess(res, result.data || result, 200, result.meta)
    } catch (error) {
      return next(error)
    }
  },
}
