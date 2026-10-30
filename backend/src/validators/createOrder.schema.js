const { z } = require('zod')
const { uuid, tunisianPhone, tunisianPostalCode, nonEmptyText } = require('./_common')

const shippingAddress = z.object({
  recipient_name: nonEmptyText(160, 'Le nom du destinataire'),
  phone: tunisianPhone,
  governorate: nonEmptyText(100, 'Le gouvernorat'),
  city: nonEmptyText(100, 'La ville'),
  address_line: nonEmptyText(255, 'L’adresse'),
  postal_code: tunisianPostalCode.optional(),
}).strict()

const createOrderSchema = z.object({
  items: z.array(z.object({
    variant_id: uuid,
    quantity: z.number().int({ message: 'La quantité doit être un entier.' })
      .min(1, { message: 'La quantité doit être au moins égale à 1.' })
      .max(999, { message: 'La quantité ne peut pas dépasser 999.' }),
  }).strict()).min(1, { message: 'Le panier ne peut pas être vide.' }),
  customer_email: z.string().trim().email({ message: 'L’adresse e-mail est invalide.' }),
  customer_phone: tunisianPhone,
  shipping_address: shippingAddress,
  shipping_cost_tnd: z.number().finite().nonnegative({
    message: 'Les frais de livraison ne peuvent pas être négatifs.',
  }).default(0),
}).strict()

module.exports = createOrderSchema
