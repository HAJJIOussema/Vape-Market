import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner.jsx'
import { useAuth } from '../context/useAuth.js'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingSpinner />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <Outlet />
}

export default ProtectedRoute
