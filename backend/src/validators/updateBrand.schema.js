const { z } = require('zod')
const { slug, nonEmptyText } = require('./_common')

const updateBrandSchema = z.object({
  name: nonEmptyText(120, 'Le nom de la marque').optional(),
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
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Au moins un champ doit être fourni pour modifier la marque.' },
)

module.exports = updateBrandSchema
