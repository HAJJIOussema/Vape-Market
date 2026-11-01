const adminService = require('../services/admin.service')
const brandService = require('../services/brand.service')
const categoryService = require('../services/category.service')
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
   * List categories with their product counts.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listAdminCategories(req, res, next) {
    try {
      const filters = { ...req.query }
      if (filters.active !== undefined) filters.active = filters.active !== 'false'
      const data = await categoryService.listAdminCategories(filters)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Create a category.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async createCategory(req, res, next) {
    try {
      const data = await categoryService.createCategory(bodyOf(req))
      return sendSuccess(res, data, 201)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Update a category.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async updateCategory(req, res, next) {
    try {
      const data = await categoryService.updateCategory(req.params.categoryId, bodyOf(req))
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Delete a category.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async deleteCategory(req, res, next) {
    try {
      await categoryService.deleteCategory(req.params.categoryId)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  },

  /**
   * List brands with their product counts.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listAdminBrands(req, res, next) {
    try {
      const filters = { ...req.query }
      if (filters.active !== undefined) filters.active = filters.active !== 'false'
      const data = await brandService.listAdminBrands(filters)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Create a brand.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async createBrand(req, res, next) {
    try {
      const data = await brandService.createBrand(bodyOf(req))
      return sendSuccess(res, data, 201)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Update a brand.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async updateBrand(req, res, next) {
    try {
      const data = await brandService.updateBrand(req.params.brandId, bodyOf(req))
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Delete a brand.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async deleteBrand(req, res, next) {
    try {
      await brandService.deleteBrand(req.params.brandId)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  },

  async confirmOrder(req, res, next) {
    try {
      const data = await adminService.confirmOrder(userIdOf(req), req.params.orderId)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  async cancelOrder(req, res, next) {
    try {
      const data = await adminService.cancelOrder(userIdOf(req), req.params.orderId, req.supabase)
      return sendSuccess(res, data)
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
        userIdOf(req), req.params.variantId, bodyOf(req), req.supabase,
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
   * List user profiles with order counts.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listUsers(req, res, next) {
    try {
      const result = await adminService.listUsers(userIdOf(req), req.query)
      return sendSuccess(res, result.data || result, 200, result.meta)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Retrieve one user with order history.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async getUser(req, res, next) {
    try {
      const data = await adminService.getUserById(userIdOf(req), req.params.userId)
      return sendSuccess(res, data)
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
