import { supabase } from './supabase.js'

export const login = (credentials) => supabase.auth.signInWithPassword(credentials)
export const register = (details) => supabase.auth.signUp({
  email: details.email,
  password: details.password,
  options: { data: { full_name: details.full_name } },
})
export const logout = () => supabase.auth.signOut()
