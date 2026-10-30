const createCategorySchema = require('./createCategory.schema')

const updateCategorySchema = createCategorySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Au moins un champ doit être fourni pour modifier la catégorie.' },
)

module.exports = updateCategorySchema
