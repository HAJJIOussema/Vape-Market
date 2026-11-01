const createProductVariantSchema = require('./createProductVariant.schema')

const updateProductVariantSchema = createProductVariantSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Au moins un champ doit être fourni pour modifier la variante.' },
)

module.exports = updateProductVariantSchema
