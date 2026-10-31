const express = require('express')
const authenticate = require('../middleware/authenticate')
const validate = require('../middleware/zodValidate')
const controller = require('../controllers/auth.controller')
const authSchemas = require('../validators/auth.schema')

const router = express.Router()

router.post('/signup', validate(authSchemas.signUp), controller.signUp)
router.post('/login', validate(authSchemas.credentials), controller.login)
router.post('/refresh', validate(authSchemas.refreshToken), controller.refreshToken)
router.post('/logout', authenticate, controller.logout)

module.exports = router
