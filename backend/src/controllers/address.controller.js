const addressService = require('../services/address.service')
const { bodyOf, userIdOf, sendSuccess } = require('./_controllerUtils')

/**
 * Authenticated address HTTP handlers.
 */
module.exports = {
  /**
   * List owned addresses.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async listAddresses(req, res, next) {
    try {
      const data = await addressService.listAddresses(userIdOf(req), req.supabase)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Create an address for the authenticated profile.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async createAddress(req, res, next) {
    try {
      const data = await addressService.createAddress(userIdOf(req), bodyOf(req), req.supabase)
      return sendSuccess(res, data, 201)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Get an owned address.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async getAddress(req, res, next) {
    try {
      const data = await addressService.getAddress(userIdOf(req), req.params.addressId, req.supabase)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Update an owned address.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async updateAddress(req, res, next) {
    try {
      const data = await addressService.updateAddress(
        userIdOf(req), req.params.addressId, bodyOf(req), req.supabase,
      )
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Delete an owned address.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async deleteAddress(req, res, next) {
    try {
      await addressService.deleteAddress(userIdOf(req), req.params.addressId, req.supabase)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
}
