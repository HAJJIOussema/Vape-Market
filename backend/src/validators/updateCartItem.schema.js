const { z } = require('zod')

const updateCartItemSchema = z.object({
  quantity: z.number().int({ message: 'La quantité doit être un entier.' })
    .min(1, { message: 'La quantité doit être au moins égale à 1.' })
    .max(999, { message: 'La quantité ne peut pas dépasser 999.' }),
}).strict()

module.exports = updateCartItemSchema
