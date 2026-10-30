const express = require('express')
const authenticate = require('../middleware/authenticate')
const validate = require('../middleware/zodValidate')
const controller = require('../controllers/order.controller')
const createOrderSchema = require('../validators/createOrder.schema')

const router = express.Router()

router.use(authenticate)
router.post('/', validate(createOrderSchema), controller.createOrder)
router.get('/', controller.listOrders)
router.get('/:orderId', controller.getOrderById)
router.post('/:orderId/cancel', controller.cancelOrder)

module.exports = router
