const { z } = require('zod')
const {
  uuid, slug, productStatus, nonEmptyText,
} = require('./_common')

const createProductSchema = z.object({
  category_id: uuid,
  brand_id: uuid,
  name: nonEmptyText(200, 'Le nom'),
  slug,
  description: z.string().trim().max(5000).nullable().optional(),
  status: productStatus.default('draft'),
}).strict()

module.exports = createProductSchema
