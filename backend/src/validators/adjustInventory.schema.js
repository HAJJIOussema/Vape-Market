const { z } = require('zod')
const { nonEmptyText } = require('./_common')

const adjustInventorySchema = z.object({
  delta: z.number()
    .int({ message: 'La variation doit être un entier.' })
    .refine((value) => value !== 0, {
      message: 'La variation de stock doit être différente de zéro.',
    }),
  reason: nonEmptyText(500, 'Le motif de l’ajustement'),
}).strict()

module.exports = adjustInventorySchema
