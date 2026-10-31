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
const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function createAuthSupabase() {
  return authSupabase
}

/**
 * Create a Supabase client that forwards the caller JWT on every request.
 * PostgreSQL can then resolve auth.uid() for RLS and SECURITY DEFINER RPCs.
 *
 * Fix: @supabase/supabase-js v2 can bypass global.headers for auth-scoped
 * requests (including RPC calls) when no session is set in memory. Without
 * setSession the Authorization header is NOT sent and PostgreSQL receives no
 * JWT → auth.uid() returns NULL → "permission denied for function create_order".
 *
 * Solution: call setSession() after creating the client so the SDK always
 * attaches the Bearer token on every network request (including RPCs).
 * persistSession: false ensures nothing is written to localStorage/disk.
 *
 * @param {string} accessToken Supabase JWT access token.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createUserSupabase(accessToken) {
  if (!accessToken) {
    throw new TypeError('A Supabase access token is required')
  }
  const client = createClient(supabaseUrl, supabaseAnonKey, {
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
  // Inject the JWT into the in-memory session so the SDK sends it on RPCs.
  // A fake refresh token is fine here — persistSession is false and we never
  // call refreshSession() on this client.
  client.auth.setSession({ access_token: accessToken, refresh_token: 'no-refresh' })
  return client
}

module.exports = { adminSupabase, createUserSupabase, createAuthSupabase }
