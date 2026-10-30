import { supabase } from './supabase.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3101/api/v1'

export async function apiRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  }
  const response = await fetch(`${API_URL}${path}`, { headers, ...options })
  if (response.status === 204) return null
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || `API request failed: ${response.status}`)
  }
  return payload
}
