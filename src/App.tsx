import { useEffect } from 'react'
import { Routes, Route, useLocation, useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => {
    const loginStatus = searchParams.get('login')
    const errorMsg = searchParams.get('error')

    if (loginStatus === 'success') {
      toast.success('Đăng nhập Google thành công!')
      // Temporary: Set a placeholder user since we don't have a /me endpoint yet
      setAuth({
        id: 'google-user',
        username: 'Google User',
        fullName: 'Google User',
        email: '',
        role: { roleName: 'USER', description: 'Standard User' }
      })
      
      // Navigate to dashboard after successful login
      window.location.href = '/dashboard';
    }

    if (errorMsg) {
      toast.error(decodeURIComponent(errorMsg))
      searchParams.delete('error')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, setAuth])

  return null
}

function App() {
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')
  const isDashboardPage = location.pathname.startsWith('/dashboard')
  const isCanvasPage = location.pathname.startsWith('/canvas')

  return (
    <div className={`min-h-screen ${!isAdminPage && !isDashboardPage && !isCanvasPage ? 'grid-background' : ''}`}>
      <OAuth2Handler />
      {!isAdminPage && !isCanvasPage && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/canvas" element={<CanvasEditor />} />
          <Route path="/templates/:id" element={<TemplateDetail />} />
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
