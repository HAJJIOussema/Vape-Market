const { z } = require('zod')

const uuid = z.string().uuid({ message: 'Identifiant UUID invalide.' })
const slug = z.string()
  .min(1, { message: 'Le slug est obligatoire.' })
  .max(200, { message: 'Le slug ne doit pas dépasser 200 caractères.' })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Le slug doit contenir uniquement des minuscules, chiffres et tirets.',
  })
const tunisianPhone = z.string()
  .regex(/^(?:\+216\d{8}|\d{8})$/, {
    message: 'Le téléphone doit être au format tunisien (+216XXXXXXXX ou XXXXXXXX).',
  })
const tunisianPostalCode = z.string()
  .regex(/^\d{4}$/, { message: 'Le code postal doit contenir exactement 4 chiffres.' })
const productStatus = z.enum(['draft', 'active', 'inactive', 'archived'], {
  message: 'Statut produit invalide.',
})
const addressType = z.enum(['home', 'work', 'other'], {
  message: 'Type d’adresse invalide.',
})
const nonEmptyText = (max, label) => z.string()
  .trim()
  .min(1, { message: `${label} est obligatoire.` })
  .max(max, { message: `${label} ne doit pas dépasser ${max} caractères.` })
const nullableText = (max, label) => z.string()
  .trim()
  .max(max, { message: `${label} ne doit pas dépasser ${max} caractères.` })
  .nullable()
const money = z.number()
  .finite({ message: 'Le prix doit être un nombre valide.' })
  .positive({ message: 'Le prix doit être strictement supérieur à zéro.' })
  .refine((value) => Number(value.toFixed(3)) === value, {
    message: 'Le prix ne doit pas avoir plus de 3 décimales.',
  })
const nonNegativeInteger = z.number()
  .int({ message: 'La valeur doit être un entier.' })
  .nonnegative({ message: 'La valeur ne peut pas être négative.' })

module.exports = {
  uuid,
  slug,
  tunisianPhone,
  tunisianPostalCode,
  productStatus,
  addressType,
  nonEmptyText,
  nullableText,
  money,
  nonNegativeInteger,
}
