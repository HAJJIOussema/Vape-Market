const { z } = require('zod')
const {
  addressType, tunisianPhone, tunisianPostalCode, nonEmptyText,
} = require('./_common')

const createAddressSchema = z.object({
  address_type: addressType.default('other'),
  label: nonEmptyText(80, 'Le libellé'),
  recipient_name: nonEmptyText(160, 'Le nom du destinataire'),
  phone: tunisianPhone,
  governorate: nonEmptyText(100, 'Le gouvernorat'),
  city: nonEmptyText(100, 'La ville'),
  address_line: nonEmptyText(255, 'L’adresse'),
  postal_code: tunisianPostalCode.optional(),
  is_default: z.boolean().default(false),
}).strict()

module.exports = createAddressSchema
