import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const authConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!authConfigured) {
  console.warn('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for authentication.')
}

export const AUTH_NOT_CONFIGURED_MESSAGE =
  'L’authentification n’est pas configurée. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'

export const supabase = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseAnonKey || 'frontend-auth-not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window === 'undefined' ? undefined : window.localStorage,
      storageKey: 'vape-market.auth',
    },
  },
)
