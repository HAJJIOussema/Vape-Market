const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required')
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY is required')
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey)

/**
 * Create a Supabase client that forwards the caller JWT on every request.
 * PostgreSQL can then resolve auth.uid() for RLS and SECURITY DEFINER RPCs.
 * @param {string} accessToken Supabase access token.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createUserSupabase(accessToken) {
  if (!accessToken) {
    throw new TypeError('A Supabase access token is required')
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

module.exports = { adminSupabase, createUserSupabase }
