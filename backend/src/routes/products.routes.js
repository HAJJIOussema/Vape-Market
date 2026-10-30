const express = require('express')
const controller = require('../controllers/product.controller')

const router = express.Router()

router.get('/', controller.listProducts)
router.get('/slug/:slug', controller.getProductBySlug)
router.get('/:productId', controller.getProductById)

module.exports = router
