import { AUTH_NOT_CONFIGURED_MESSAGE, authConfigured, supabase } from './supabase.js'

export { supabase }

// Messages raised by our SQL functions are already user-facing (French).
const PASSTHROUGH_PREFIXES = [
  'Stock insuffisant', 'Produit introuvable', 'Adresse', 'Téléphone', 'Le panier',
  'Trop de commandes', 'Seules les commandes', 'Le stock', 'Cette variante', 'Champ de variante',
  'Variante invalide', 'Produit requis',
]

/**
 * Convert a Supabase/PostgREST error into an Error with a readable message.
 * @param {{message?: string, code?: string, details?: string}} error
 * @param {string} fallback Message used for unexpected errors.
 */
export function toAppError(error, fallback = 'Une erreur est survenue.') {
  const message = String(error?.message || '')
  const code = error?.code
  let text = fallback

  if (PASSTHROUGH_PREFIXES.some((prefix) => message.startsWith(prefix))) text = message
  else if (message.startsWith('Idempotency key was reused')) {
    text = 'Cette commande a déjà été envoyée avec un contenu différent. Rechargez la page et réessayez.'
  } else if (message === 'Invalid order request' || message === 'Invalid order quantity') {
    text = 'La commande est invalide.'
  } else if (message.includes('An active product must have an active default variant')) {
    text = 'Un produit actif doit avoir une variante active par défaut.'
  } else if (message.includes('Only a super administrator')) {
    text = 'Seul un super administrateur peut modifier les rôles.'
  } else if (message.includes('Order cannot be cancelled')) {
    text = 'Cette commande ne peut plus être annulée.'
  } else if (message.includes('Inventory adjustment would make stock invalid')) {
    text = 'Ajustement impossible : le stock deviendrait inférieur à la quantité réservée.'
  } else if (message.includes('Invalid inventory adjustment')) {
    text = 'L’ajustement du stock est invalide.'
  } else if (code === '23505') {
    text = message.includes('sku') ? 'Ce SKU est déjà utilisé.' : 'Ce slug ou ce nom est déjà utilisé.'
  } else if (code === '23503') {
    text = 'Cet élément est utilisé ailleurs (produits, variantes ou commandes) et ne peut pas être supprimé.'
  } else if (code === '23514' || code === '22P02' || code === '22023') {
    text = 'Les données envoyées ont un format invalide.'
  } else if (code === '42501' || message.includes('permission')) {
    text = 'Vous n’avez pas les droits pour cette action.'
  } else if (code === 'PGRST116' || code === 'P0002' || message.includes('not found')) {
    text = 'Élément introuvable.'
  } else if (code === 'PGRST301' || code === 'PGRST302' || /JWT/i.test(message)) {
    return Object.assign(new Error('Votre session a expiré. Reconnectez-vous.'), { code, status: 401, cause: error })
  } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    text = 'Le serveur est injoignable. Vérifiez votre connexion et réessayez.'
  }

  return Object.assign(new Error(text), { code, cause: error })
}

/**
 * Await a supabase-js query and return its data, or throw a readable error.
 * @template T
 * @param {PromiseLike<{data: T, error: any}>} query
 * @param {string} [fallback]
 * @returns {Promise<T>}
 */
export async function run(query, fallback) {
  if (!authConfigured) throw new Error(AUTH_NOT_CONFIGURED_MESSAGE)
  let result
  try {
    result = await query
  } catch (error) {
    throw toAppError(error, fallback)
  }
  if (result.error) throw toAppError(result.error, fallback)
  return result.data
}

/** Current user id, or null for guests. */
export async function currentUserId() {
  if (!authConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id || null
}

/** Keep only the given keys, trimming strings and turning '' into null. */
export function pick(values = {}, keys) {
  return Object.fromEntries(keys
    .filter((key) => values[key] !== undefined)
    .map((key) => {
      const value = values[key]
      if (typeof value !== 'string') return [key, value]
      const trimmed = value.trim()
      return [key, trimmed === '' ? null : trimmed]
    }))
}
