import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useSearchParams, useNavigate, Navigate, Outlet } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { ReactFlowProvider } from "@xyflow/react"

import Navbar from './components/Landing/Navbar'
import Footer from './components/Landing/Footer'
import LandingPage from './pages/LandingPage'
import Pricing from './pages/Pricing'
import PaymentInformationPage from './pages/PaymentInformationPage'
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from './pages/UserDashboard'
import ProfilePage from './pages/ProfilePage'
import OnboardingPage from './pages/OnboardingPage'
import TemplateDetail from './pages/TemplateDetail'
import PrebuiltDetail from './pages/PrebuiltDetail'
import ProjectOverview from './pages/ProjectOverview'

import { Editor } from "./components/Editor"
import { useAuthStore } from './stores/useAuthStore'
import GlobalAIChatSidebar from './components/Chat/GlobalAIChatSidebar'
import ScrollToTop from './components/ui/ScrollToTop'
import { authService } from './services/authService'
import { setAuthCookie, COOKIE_KEYS } from './utils/auth'

// Protected Route Component
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
    // Redirect to home with openLogin state so Navbar can trigger AuthModal
    return <Navigate to="/?openLogin=true" state={{ from: location }} replace />
  }

  const userRole = user ? (typeof user.role === 'string' ? user.role : user.role.roleName) : null
  
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />
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
        if (element) element.scrollIntoView({ behavior: 'smooth' })
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
        setAuthCookie(COOKIE_KEYS.ACCESS_TOKEN, accessToken);
        setAuthCookie(COOKIE_KEYS.REFRESH_TOKEN, refreshToken);
        const userResponse = await authService.getCurrentUser();
        setAuth(userResponse.result);
        toast.success('Đăng nhập Google thành công!')
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
      if (accessToken && refreshToken) handleOAuth2Success(accessToken, refreshToken);
    }
    if (errorMsg) {
      toast.error(decodeURIComponent(errorMsg))
      navigate('/', { replace: true })
    }
  }, [searchParams, navigate, setAuth])

  return null
}

export default function App() {
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')
  const isDashboardPage = location.pathname.startsWith('/dashboard')
  const isWorkspacePage = location.pathname.startsWith('/workspace')
  const isWorkspaceEditorPage = /^\/workspace\/[^/]+\/editor(?:\/|$)/.test(location.pathname)
  const isMarketingPage = location.pathname === '/' || location.pathname === '/pricing' || location.pathname === '/payment-information'

  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <div className={`min-h-screen flex flex-col ${!isAdminPage && !isDashboardPage && !isWorkspaceEditorPage ? 'grid-background' : ''}`}>
      <OAuth2Handler />
      {!isAdminPage && !isWorkspaceEditorPage && <Navbar />}

      <div className="flex-1 flex overflow-hidden relative">
        <main className={`min-w-0 flex-1 transition-all duration-300 ease-in-out ${isAiSidebarOpen && !isAdminPage && !isWorkspacePage && !isMarketingPage && !isDashboardPage ? 'mr-[380px]' : ''}`}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<Pricing />} />

            <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN']} />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/workspace/:id" element={<ProjectOverview />} />
              <Route path="/workspace/:id/editor" element={
                <ReactFlowProvider>
                  <Editor />
                </ReactFlowProvider>
              } />
              <Route path="/workspace/:id/editor/:itemId" element={
                <ReactFlowProvider>
                  <Editor />
                </ReactFlowProvider>
              } />
              <Route path="/prebuilts/:id" element={<PrebuiltDetail />} />
              <Route path="/templates/:id" element={<TemplateDetail />} />
              <Route path="/payment-information" element={<PaymentInformationPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            <Route path="/auth/google/callback" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {!isAdminPage && !isWorkspacePage && !isMarketingPage && !isDashboardPage && (
          <GlobalAIChatSidebar 
            isOpen={isAiSidebarOpen} 
            onToggle={setIsAiSidebarOpen} 
          />
        )}
      </div>

      {!isAdminPage && !isDashboardPage && !isWorkspacePage && !isWorkspacePage && <Footer />}
      <ScrollToHash />
      <ScrollToTop />
      <Toaster position="top-right" />
    </div>
  )
}
