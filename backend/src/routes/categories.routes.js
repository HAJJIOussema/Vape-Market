const express = require('express')
const controller = require('../controllers/category.controller')

const router = express.Router()

router.get('/', controller.listCategories)
router.get('/:categoryId', controller.getCategoryById)

module.exports = router
