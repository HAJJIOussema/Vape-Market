const createBrandSchema = require('./createBrand.schema')

const updateBrandSchema = createBrandSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Au moins un champ doit être fourni pour modifier la marque.' },
)

module.exports = updateBrandSchema
