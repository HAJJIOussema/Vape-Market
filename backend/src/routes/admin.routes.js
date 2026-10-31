const express = require('express')
const authenticate = require('../middleware/authenticate')
const authorizeAdmin = require('../middleware/authorizeAdmin')
const controller = require('../controllers/admin.controller')

const router = express.Router()

router.use(authenticate)
router.use(authorizeAdmin(['admin', 'stock_manager', 'super_admin']))
router.get('/orders', controller.listOrders)
router.post('/orders/:orderId/confirm', controller.confirmOrder)
router.post('/orders/:orderId/cancel', controller.cancelOrder)
router.post('/orders/:orderId/ship', controller.shipOrder)
router.get('/inventory', controller.listInventory)
router.post('/inventory/:variantId/adjust', controller.adjustInventory)
router.get('/inventory/movements', controller.listInventoryMovements)
router.get('/audit-logs', authorizeAdmin(['super_admin']), controller.listAuditLogs)

module.exports = router
