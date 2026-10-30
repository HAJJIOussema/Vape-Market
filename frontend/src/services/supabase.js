import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for authentication.')
}

export const supabase = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseAnonKey || '',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
