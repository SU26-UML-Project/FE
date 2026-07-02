import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import AuthModal from '../Auth/AuthModal'
import UserMenu from '../ui/UserMenu'
import { useAuthStore } from '../../stores/useAuthStore'

const Navbar = () => {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  
  const { user, isAuthenticated } = useAuthStore()
  
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDashboardPage = location.pathname.startsWith('/dashboard')

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setIsAuthModalOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('openLogin') === 'true') {
      openAuth('login')
      // Clear the param after opening
      searchParams.delete('openLogin')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const linkBase = 'font-semibold transition-colors duration-300 text-[13px] lg:text-[15px]'
  const onHome = location.pathname === '/'
  
  const userRole = user ? (typeof user.role === 'string' ? user.role : user.role.roleName) : null;

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-[100] flex justify-center pointer-events-none transition-all duration-400 ease-in-out">
        <header
          id="home"
          className={`
            w-full flex items-center justify-between transition-all duration-400 ease-in-out pointer-events-auto
            ${isScrolled
              ? 'max-w-[95%] lg:max-w-5xl px-6 lg:px-8 py-1.5 bg-white/60 backdrop-blur-sm rounded-[999px] shadow-lg border border-gray-200/50 mt-4'
              : 'max-w-full px-12 py-4 footer-bg mt-0 border-b border-gray-200/0 rounded-[0px]'
            }
            ${isDashboardPage && !isScrolled ? 'bg-white border-b border-admin-outline' : ''}
          `}
          data-purpose="navigation-bar"
        >
          <Link
            to="/"
            className="flex items-center cursor-pointer"
            data-purpose="logo-container"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className={`font-extrabold tracking-tight text-black font-priego-extrabold transition-all duration-500 ${isScrolled ? 'text-lg' : 'text-xl'}`}>
              DiaUML Studio
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8" data-purpose="main-nav">
          <button
            onClick={() => {
              if (isAuthenticated) {
                navigate('/dashboard');
              } else {
                openAuth('login');
              }
            }}
            className={`${linkBase} ${location.pathname === '/dashboard' ? 'text-uml-blue' : 'text-gray-900 hover:text-uml-blue'}`}
          >
            Dashboard
          </button>
          
          {userRole === 'ADMIN' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? 'text-uml-blue' : 'text-gray-900 hover:text-uml-blue'}`
              }
            >
              Admin
            </NavLink>
          )}
          {onHome ? (
            <a href="#key-features" className={`${linkBase} text-gray-900 hover:text-uml-blue`}>Features</a>
          ) : (
            <Link to="/#key-features" className={`${linkBase} text-gray-900 hover:text-uml-blue`}>Features</Link>
          )}
          {onHome ? (
            <a href="#popular-templates" className={`${linkBase} text-gray-900 hover:text-uml-blue`}>Templates</a>
          ) : (
            <Link to="/#popular-templates" className={`${linkBase} text-gray-900 hover:text-uml-blue`}>Templates</Link>
          )}
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? 'text-uml-blue' : 'text-gray-900 hover:text-uml-blue'}`
            }
          >
            Pricing
          </NavLink>
          {onHome ? (
            <a href="#docs" className={`${linkBase} text-gray-900 hover:text-uml-blue`}>Documentation</a>
          ) : (
            <Link to="/#docs" className={`${linkBase} text-gray-900 hover:text-uml-blue`}>Documentation</Link>
          )}
        </nav>

          <div className="flex items-center gap-2 lg:gap-3" data-purpose="header-buttons">
            {!isAuthenticated ? (
              <>
                {isScrolled ? (
                  <button 
                    onClick={() => openAuth('login')}
                    className="login-btn-pill transition-all duration-500"
                  >
                    <div className="sign">
                      <LogIn size={18} strokeWidth={2.5} />
                    </div>
                    <div className="btn-text">Login</div>
                  </button>
                ) : (
                  <button 
                    onClick={() => openAuth('login')}
                    className="px-6 py-2 text-[16px] font-semibold border border-black rounded-md hover:bg-gray-100 transition-all duration-500"
                  >
                    Login
                  </button>
                )}
                <button 
                  onClick={() => openAuth('register')}
                  className={`font-semibold bg-uml-blue text-white rounded-md hover:bg-blue-700 transition-all duration-500 ${isScrolled ? 'px-4 py-1.5 text-[14px]' : 'px-6 py-2 text-[16px]'}`}
                >
                  Get started free
                </button>
              </>
            ) : (
              <UserMenu />
            )}
          </div>
        </header>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode}
      />
    </>
  )
}

export default Navbar
