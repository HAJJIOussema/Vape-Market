const { z } = require('zod')

const credentials = z.object({
  email: z.string().trim().email('L’adresse e-mail est invalide.'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
}).strict()

const signUp = credentials.extend({
  full_name: z.string().trim().min(1).max(160).optional(),
})

const refreshToken = z.object({
  refresh_token: z.string().min(1, 'Le refresh token est obligatoire.'),
}).strict()

module.exports = { credentials, signUp, refreshToken }
