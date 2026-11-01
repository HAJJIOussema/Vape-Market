const { z } = require('zod')
const {
  uuid, productStatus, nonEmptyText, money, nonNegativeInteger,
} = require('./_common')

const createProductVariantSchema = z.object({
  name: nonEmptyText(160, 'Le nom de la variante'),
  sku: nonEmptyText(100, 'Le SKU'),
  price_tnd: money,
  attributes: z.record(z.unknown()).optional().default({}),
  is_default: z.boolean().default(false),
  status: productStatus.default('active'),
  stock: nonNegativeInteger.default(0),
}).strict()

module.exports = createProductVariantSchema
