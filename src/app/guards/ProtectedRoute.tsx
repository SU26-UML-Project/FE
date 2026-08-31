import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/model/useAuthStore'
import { SkeletonSplash } from '../../shared/ui/Skeleton'

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { isAuthenticated, user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return <SkeletonSplash />
  }

  if (!isAuthenticated) {
    return <Navigate to="/?openLogin=true" state={{ from: location }} replace />
  }

  const userRole = user ? (typeof user.role === 'string' ? user.role : user.role.roleName) : null

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
