import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner.jsx'
import { useAuth } from '../context/useAuth.js'
import { getProfile } from '../services/accountService.js'
import { useEffect, useState } from 'react'

const ADMIN_ROLES = ['admin', 'super_admin']

function AdminRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [profileStatus, setProfileStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    getProfile()
      .then((nextProfile) => {
        setProfile(nextProfile)
        setProfileStatus('ready')
      })
      .catch((requestError) => {
        setError(requestError.message || 'Impossible de vérifier vos permissions.')
        setProfileStatus('error')
      })
  }, [user])

  if (loading || (user && profileStatus === 'loading')) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profileStatus === 'error') return <p role="alert">{error}</p>
  if (!ADMIN_ROLES.includes(profile?.role)) return <Navigate to="/account" replace />
  return <Outlet />
}

export default AdminRoute
