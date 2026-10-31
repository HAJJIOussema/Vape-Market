import { AUTH_NOT_CONFIGURED_MESSAGE, authConfigured, supabase } from './supabase.js'

function requireAuthConfig() {
  if (!authConfigured) {
    return { data: null, error: new Error(AUTH_NOT_CONFIGURED_MESSAGE) }
  }
  return null
}

function normalizeAuthError(error, fallbackMessage) {
  if (!error) return null
  return Object.assign(new Error(error.message || fallbackMessage), {
    status: error.status,
    code: error.code,
  })
}

export async function register(details) {
  const configError = requireAuthConfig()
  if (configError) return configError

  const fullName = String(details.full_name || '').trim()
  const { data, error } = await supabase.auth.signUp({
    email: String(details.email || '').trim(),
    password: details.password,
    options: {
      data: { full_name: fullName || null },
      emailRedirectTo: `${window.location.origin}/account`,
    },
  })

  return {
    data,
    error: normalizeAuthError(error, 'Impossible de créer le compte.'),
  }
}

export async function login(credentials) {
  const configError = requireAuthConfig()
  if (configError) return configError

  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(credentials.email || '').trim(),
    password: credentials.password,
  })

  return {
    data,
    error: normalizeAuthError(error, 'Impossible de se connecter.'),
  }
}

export async function logout() {
  if (!authConfigured) {
    return { error: new Error(AUTH_NOT_CONFIGURED_MESSAGE) }
  }

  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (!error) return { error: null }

  const localSignOut = await supabase.auth.signOut({ scope: 'local' })
  return { error: localSignOut.error }
}
