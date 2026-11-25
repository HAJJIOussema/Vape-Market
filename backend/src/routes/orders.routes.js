const express = require('express')
const authenticate = require('../middleware/authenticate')
const optionalAuthenticate = require('../middleware/optionalAuthenticate')
const validate = require('../middleware/zodValidate')
const controller = require('../controllers/order.controller')
const createOrderSchema = require('../validators/createOrder.schema')
const guestOrderLookupSchema = require('../validators/guestOrderLookup.schema')

const router = express.Router()

// Checkout is open to guests; a valid token attaches the order to the account.
router.post('/', optionalAuthenticate, validate(createOrderSchema), controller.createOrder)
router.post('/guest/lookup', validate(guestOrderLookupSchema), controller.lookupGuestOrder)

router.get('/', authenticate, controller.listOrders)
router.get('/:orderId', authenticate, controller.getOrderById)
router.post('/:orderId/cancel', authenticate, controller.cancelOrder)

module.exports = router
