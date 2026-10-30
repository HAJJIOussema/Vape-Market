const express = require('express')
const authenticate = require('../middleware/authenticate')
const validate = require('../middleware/zodValidate')
const controller = require('../controllers/user.controller')
const updateProfileSchema = require('../validators/updateProfile.schema')

const router = express.Router()

router.use(authenticate)
router.get('/', controller.getProfile)
router.patch('/', validate(updateProfileSchema), controller.updateProfile)

module.exports = router
