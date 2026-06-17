import { useEffect } from 'react'
import { Routes, Route, useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import Pricing from './pages/Pricing'
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from './pages/UserDashboard'
import CanvasEditor from './pages/CanvasEditor'
import TemplateDetail from './pages/TemplateDetail'
import { useAuthStore } from './store/useAuthStore'
import { authService } from './services/authService'
import { setAuthCookie, COOKIE_KEYS, getAuthCookie } from './utils/auth'
import { Navigate, Outlet } from 'react-router-dom'

// Protected Route Component
const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { isAuthenticated, user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) return null // Or a loading spinner

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (allowedRoles && user) {
    const userRole = typeof user.role === 'string' ? user.role : user.role.roleName;
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <Outlet />
}

const ScrollToHash = () => {
  const { hash, key } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      setTimeout(() => {
        const element = document.getElementById(id)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 80)
    } else {
      window.scrollTo(0, 0)
    }
  }, [hash, key])

  return null
}

const OAuth2Handler = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => {
    const loginStatus = searchParams.get('login')
    const errorMsg = searchParams.get('error')

    const handleOAuth2Success = async (accessToken: string, refreshToken: string) => {
      try {
        // Use central utility to save cookies from URL params
        setAuthCookie(COOKIE_KEYS.ACCESS_TOKEN, accessToken);
        setAuthCookie(COOKIE_KEYS.REFRESH_TOKEN, refreshToken);

        // Fetch real user info
        const userResponse = await authService.getCurrentUser();
        setAuth(userResponse.result);
        
        toast.success('Đăng nhập Google thành công!')
        navigate('/dashboard', { replace: true })
      } catch (error) {
        console.error('OAuth2 User Info Error:', error);
        toast.error('Không thể lấy thông tin người dùng sau khi đăng nhập Google');
        navigate('/', { replace: true });
      }
    };

    if (loginStatus === 'success') {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')

      if (accessToken && refreshToken) {
        handleOAuth2Success(accessToken, refreshToken);
      } else {
        toast.error('Thiếu token từ Google OAuth2');
        navigate('/', { replace: true });
      }
    }

    if (errorMsg) {
      toast.error(decodeURIComponent(errorMsg))
      navigate('/', { replace: true })
    }
  }, [searchParams, navigate, setAuth])

  return null
}

function App() {
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')
  const isDashboardPage = location.pathname.startsWith('/dashboard')
  const isCanvasPage = location.pathname.startsWith('/canvas')
  
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <div className={`min-h-screen ${!isAdminPage && !isDashboardPage && !isCanvasPage ? 'grid-background' : ''}`}>
      <OAuth2Handler />
      {!isAdminPage && !isCanvasPage && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<Pricing />} />
          
          {/* User Routes */}
          <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN']} />}>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/canvas" element={<CanvasEditor />} />
            <Route path="/templates/:id" element={<TemplateDetail />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Support for Google OAuth2 Callback Path */}
          <Route path="/auth/google/callback" element={<LandingPage />} />
        </Routes>
      </main>
      {!isAdminPage && !isDashboardPage && !isCanvasPage && <Footer />}
      <ScrollToHash />
      <Toaster position="top-right" />
    </div>
  )
}

export default App
