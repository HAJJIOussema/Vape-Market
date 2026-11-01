const { z } = require('zod')
const { uuid, slug, nonEmptyText } = require('./_common')

const updateCategorySchema = z.object({
  parent_id: uuid.nullable().optional(),
  name: nonEmptyText(120, 'Le nom de la catégorie').optional(),
  slug: slug.optional(),
  description: z.string().trim().max(5000, {
    message: 'La description ne doit pas dépasser 5000 caractères.',
  }).nullable().optional(),
  image_path: z.string().trim().min(1, {
    message: 'Le chemin de l’image ne peut pas être vide.',
  }).max(500, {
    message: 'Le chemin de l’image ne doit pas dépasser 500 caractères.',
  }).nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int({ message: 'L’ordre doit être un entier.' })
    .nonnegative({ message: 'L’ordre ne peut pas être négatif.' }).optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Au moins un champ doit être fourni pour modifier la catégorie.' },
)

module.exports = updateCategorySchema
