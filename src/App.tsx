import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import Pricing from './components/Pricing'
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from './pages/UserDashboard'

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

function App() {
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')
  const isDashboardPage = location.pathname.startsWith('/dashboard')

  return (
    <div className={`min-h-screen ${!isAdminPage && !isDashboardPage ? 'grid-background' : ''}`}>
      {!isAdminPage && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<UserDashboard />} />
        </Routes>
      </main>
      {!isAdminPage && !isDashboardPage && <Footer />}
      <ScrollToHash />
    </div>
  )
}

export default App
