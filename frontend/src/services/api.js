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

export async function apiRequest(path, options = {}) {
  const accessToken = await getAccessToken()
  const request = {
    url: `${API_URL}${path}`,
    method: options.method || 'GET',
    body: options.body,
  }
  console.log(request)
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  }
  try {
    const response = await fetch(request.url, { ...options, headers })
    console.log(response)
    if (response.status === 204) return null
    const responseText = await response.text()
    console.error(response.status)
    console.error(responseText)
    const payload = responseText ? (() => {
      try {
        return JSON.parse(responseText)
      } catch {
        return null
      }
    })() : null
    console.log(payload)
    console.error(payload)
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `API request failed: ${response.status}`)
      error.status = response.status
      error.code = payload?.error?.code
      throw error
    }
    return payload
  } catch (error) {
    console.log(error)
    throw error
  }
}
