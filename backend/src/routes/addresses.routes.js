const express = require('express')
const authenticate = require('../middleware/authenticate')
const validate = require('../middleware/zodValidate')
const controller = require('../controllers/address.controller')
const createAddressSchema = require('../validators/createAddress.schema')
const updateAddressSchema = require('../validators/updateAddress.schema')

const router = express.Router()

router.use(authenticate)
router.get('/', controller.listAddresses)
router.post('/', validate(createAddressSchema), controller.createAddress)
router.get('/:addressId', controller.getAddress)
router.patch('/:addressId', validate(updateAddressSchema), controller.updateAddress)
router.delete('/:addressId', controller.deleteAddress)

module.exports = router
