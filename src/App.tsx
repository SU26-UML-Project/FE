import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import Navbar from './components/Landing/Navbar'
import Footer from './components/Landing/Footer'
import LandingPage from './pages/LandingPage'
import Pricing from './pages/Pricing'
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from './pages/UserDashboard'
import ProfilePage from './pages/ProfilePage'
import OnboardingPage from './pages/OnboardingPage'
import CanvasEditor from './pages/CanvasEditor'
import TemplateDetail from './pages/TemplateDetail'
import WorkspacePage from './pages/WorkspacePage'
import PrebuiltDetail from './pages/PrebuiltDetail'
import { useAuthStore } from './stores/useAuthStore'
import GlobalAIChatSidebar from './components/Chat/GlobalAIChatSidebar'
import { authService } from './services/authService'
import { setAuthCookie, COOKIE_KEYS } from './utils/auth'
import { Navigate, Outlet } from 'react-router-dom'

// Protected Route Component
const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { isAuthenticated, user, loading } = useAuthStore()
  const location = useLocation()

  // Không gọi checkAuth ở đây nữa vì đã gọi ở root App level
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-uml-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Đang xác thực...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Chỉ redirect về Landing Page khi chắc chắn là không có quyền truy cập
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Onboarding gate: Google users with an unfinished profile must complete the wizard first.
  const needsOnboarding = user?.profileCompleted === false
  const onOnboarding = location.pathname === '/onboarding'
  if (needsOnboarding && !onOnboarding) {
    return <Navigate to="/onboarding" replace />
  }
  if (!needsOnboarding && onOnboarding) {
    return <Navigate to="/dashboard" replace />
  }

  if (allowedRoles && user) {
    const userRole = (typeof user.role === 'string' ? user.role : user.role?.roleName || '').toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());
    
    if (!normalizedAllowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />
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
        // First-time Google users must finish onboarding before entering the app.
        if (userResponse.result?.profileCompleted === false) {
          navigate('/onboarding', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
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
  const isWorkspacePage = location.pathname.startsWith('/workspace')
  const isMarketingPage = location.pathname === '/' || location.pathname === '/pricing'

  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const { isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <div className={`min-h-screen flex flex-col ${!isAdminPage && !isDashboardPage && !isCanvasPage && !isWorkspacePage ? 'grid-background' : ''}`}>
      <OAuth2Handler />
      {!isAdminPage && !isCanvasPage && !isWorkspacePage && <Navbar />}
      
      <div className="flex-1 flex overflow-hidden relative">
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isAiSidebarOpen && !isAdminPage && !isCanvasPage && !isWorkspacePage && !isMarketingPage ? 'mr-[380px]' : ''}`}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<Pricing />} />

            {/* User Routes */}
            <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN']} />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/canvas" element={<CanvasEditor />} />
              <Route path="/workspace/:id" element={<WorkspacePage />} />
              <Route path="/prebuilts/:id" element={<PrebuiltDetail />} />
              <Route path="/templates/:id" element={<TemplateDetail />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            {/* Support for Google OAuth2 Callback Path */}
            <Route path="/auth/google/callback" element={<LandingPage />} />

            {/* Fallback for undefined routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {!isAdminPage && !isCanvasPage && !isWorkspacePage && !isMarketingPage && (
          <GlobalAIChatSidebar 
            isOpen={isAiSidebarOpen} 
            onToggle={setIsAiSidebarOpen} 
          />
        )}
      </div>

      {!isAdminPage && !isDashboardPage && !isCanvasPage && !isWorkspacePage && <Footer />}
      <ScrollToHash />
      <Toaster position="top-right" />
    </div>
  )
}

export default App
