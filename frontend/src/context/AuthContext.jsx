import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'
import { AuthContext } from './AuthContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setLoading(false)
      }
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ session, user: session?.user || null, loading }}>{children}</AuthContext.Provider>
}
