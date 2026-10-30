const authService = require('../services/auth.service')
const { bodyOf, sendSuccess } = require('./_controllerUtils')

/**
 * Authentication HTTP handlers.
 */
module.exports = {
  /**
   * Create an account.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async signUp(req, res, next) {
    try {
      const data = await authService.signUp(bodyOf(req))
      return sendSuccess(res, data, 201)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Authenticate a user.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async login(req, res, next) {
    try {
      const data = await authService.login(bodyOf(req))
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * Refresh a session.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async refreshToken(req, res, next) {
    try {
      const data = await authService.refreshToken(bodyOf(req))
      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  },

  /**
   * End the current session.
   * @param {import('express').Request} req Express request.
   * @param {import('express').Response} res Express response.
   * @param {import('express').NextFunction} next Express next function.
   */
  async logout(req, res, next) {
    try {
      await authService.logout(req.user)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  },
}
