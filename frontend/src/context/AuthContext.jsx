import { useEffect, useMemo, useState } from 'react'
import { AUTH_NOT_CONFIGURED_MESSAGE, authConfigured, supabase } from '../services/supabase.js'
import { AuthContext } from './AuthContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authConfigured) {
      setSession(null)
      setLoading(false)
      return undefined
    }

    let active = true

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) console.error('Unable to restore the authentication session.', error)
        if (active) {
          setSession(data.session)
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error('Unable to restore the authentication session.', error)
        if (active) {
          setSession(null)
          setLoading(false)
        }
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    loading,
    configured: authConfigured,
    configError: authConfigured ? '' : AUTH_NOT_CONFIGURED_MESSAGE,
  }), [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
