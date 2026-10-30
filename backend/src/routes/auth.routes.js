const express = require('express')
const authenticate = require('../middleware/authenticate')
const controller = require('../controllers/auth.controller')

const router = express.Router()

router.post('/signup', controller.signUp)
router.post('/login', controller.login)
router.post('/refresh', controller.refreshToken)
router.post('/logout', authenticate, controller.logout)

module.exports = router
