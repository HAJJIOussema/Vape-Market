const userService = require('../services/user.service')
const { bodyOf, userIdOf, sendSuccess } = require('./_controllerUtils')

/**
 * Current profile HTTP handlers.
 */
module.exports = {
  /**
   * Get the authenticated profile.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async getProfile(req, res, next) {
    try {
      const data = await userService.getProfile(userIdOf(req), req.supabase)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Update the authenticated profile.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async updateProfile(req, res, next) {
    try {
      const data = await userService.updateProfile(userIdOf(req), bodyOf(req), req.supabase)
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },
}
