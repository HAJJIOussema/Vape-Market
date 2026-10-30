const { z } = require('zod')
const { uuid, slug, nonEmptyText } = require('./_common')

const createCategorySchema = z.object({
  parent_id: uuid.nullable().optional(),
  name: nonEmptyText(120, 'Le nom de la catégorie'),
  slug,
  description: z.string().trim().max(5000, {
    message: 'La description ne doit pas dépasser 5000 caractères.',
  }).nullable().optional(),
  image_path: z.string().trim().min(1, {
    message: 'Le chemin de l’image ne peut pas être vide.',
  }).max(500, {
    message: 'Le chemin de l’image ne doit pas dépasser 500 caractères.',
  }).nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int({ message: 'L’ordre doit être un entier.' })
    .nonnegative({ message: 'L’ordre ne peut pas être négatif.' }).default(0),
}).strict()

module.exports = createCategorySchema
