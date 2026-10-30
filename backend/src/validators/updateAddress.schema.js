const createAddressSchema = require('./createAddress.schema')

const updateAddressSchema = createAddressSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Au moins un champ doit être fourni pour modifier l’adresse.' },
)

module.exports = updateAddressSchema
