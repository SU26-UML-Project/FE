import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { isAuthenticated, user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-admin-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-uml-blue border-t-transparent" />
      </div>
    )
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
