const { z } = require('zod')

const guestOrderLookupSchema = z.object({
  order_number: z.string().trim().toUpperCase()
    .regex(/^VM-[0-9A-F]{12}$/, { message: 'Le numéro de commande est invalide.' }),
  access_token: z.string().trim()
    .regex(/^[A-Za-z0-9_-]{20,128}$/, { message: 'Le code de suivi est invalide.' }),
}).strict()

module.exports = guestOrderLookupSchema
