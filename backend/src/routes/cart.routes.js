const express = require('express')
const authenticate = require('../middleware/authenticate')
const validate = require('../middleware/zodValidate')
const controller = require('../controllers/cart.controller')
const addCartItemSchema = require('../validators/addCartItem.schema')
const updateCartItemSchema = require('../validators/updateCartItem.schema')

const router = express.Router()

router.use(authenticate)
router.get('/', controller.getCart)
router.delete('/', controller.clearCart)
router.post('/items', validate(addCartItemSchema), controller.addItem)
router.patch('/items/:variantId', validate(updateCartItemSchema), controller.updateItem)
router.delete('/items/:variantId', controller.removeItem)

module.exports = router
