const createProductSchema = require('./createProduct.schema')

const updateProductSchema = createProductSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Au moins un champ doit être fourni pour modifier le produit.' },
)

module.exports = updateProductSchema
