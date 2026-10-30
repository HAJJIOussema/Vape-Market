const { z } = require('zod')
const {
  uuid, slug, productStatus, nonEmptyText, nullableText, money, nonNegativeInteger,
} = require('./_common')

const productVariant = z.object({
  sku: nonEmptyText(100, 'Le SKU'),
  name: nonEmptyText(160, 'Le nom de la variante'),
  attributes: z.record(z.string(), z.unknown()).default({}),
  price_tnd: money,
  stock: nonNegativeInteger,
  is_default: z.boolean().default(false),
  status: productStatus.default('active'),
}).strict()

const createProductSchema = z.object({
  category_id: uuid,
  brand_id: uuid,
  name: nonEmptyText(200, 'Le nom du produit'),
  slug,
  description: nullableText(5000, 'La description').optional(),
  status: productStatus.default('draft'),
  variants: z.array(productVariant)
    .min(1, { message: 'Le produit doit contenir au moins une variante.' }),
}).strict()

module.exports = createProductSchema
