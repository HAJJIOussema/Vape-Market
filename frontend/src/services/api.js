import { authConfigured, supabase } from './supabase.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3101/api/v1'

async function getAccessToken() {
  if (!authConfigured) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Unable to read the authentication session.', error)
    return null
  }
  return data.session?.access_token || null
}

function parseJson(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Call the backend API.
 * @param {string} path API path, e.g. "/products".
 * @param {RequestInit & {auth?: boolean}} [options] fetch options; auth: false
 *   never sends the session token.
 * @returns {Promise<any>} Parsed JSON payload (null for 204).
 * @throws {Error & {status?: number, code?: string, details?: object[]}}
 */
export async function apiRequest(path, options = {}) {
  const { auth = true, headers: extraHeaders, ...fetchOptions } = options
  const accessToken = auth ? await getAccessToken() : null
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extraHeaders,
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers })
  } catch (networkError) {
    const error = new Error('Le serveur est injoignable. Vérifiez votre connexion et réessayez.')
    error.cause = networkError
    error.status = 0
    error.code = 'NETWORK_ERROR'
    throw error
  }

  if (response.status === 204) return null
  const payload = parseJson(await response.text())

  if (!response.ok) {
    const details = Array.isArray(payload?.error?.details) ? payload.error.details : undefined
    const message = details?.length
      ? details.map((detail) => detail.message).join(' ')
      : payload?.error?.message || `La requête a échoué (${response.status}).`
    const error = new Error(message)
    error.status = response.status
    error.code = payload?.error?.code
    error.details = details
    throw error
  }
  return payload
}
