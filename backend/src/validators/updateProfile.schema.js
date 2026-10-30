const { z } = require('zod')
const { nullableText, tunisianPhone } = require('./_common')

const updateProfileSchema = z.object({
  full_name: nullableText(160, 'Le nom complet').optional(),
  phone: tunisianPhone.nullable().optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Au moins un champ doit être fourni pour modifier le profil.' },
)

module.exports = updateProfileSchema
