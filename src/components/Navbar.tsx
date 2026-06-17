import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LogIn, User, LogOut } from 'lucide-react'
import AuthModal from './Auth/AuthModal'
import { useAuthStore } from '../store/useAuthStore'

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  
  const { user, isAuthenticated, logout } = useAuthStore()
  
  const location = useLocation()
  const isDashboardPage = location.pathname.startsWith('/dashboard')

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setIsAuthModalOpen(true)
  }

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
              ? 'max-w-[95%] lg:max-w-5xl px-6 lg:px-8 py-2 bg-white/60 backdrop-blur-sm rounded-[999px] shadow-lg border border-gray-200/50 mt-4'
              : 'max-w-full px-12 py-6 footer-bg mt-0 border-b border-gray-200/0 rounded-[0px]'
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
            <span className={`font-extrabold tracking-tight text-black font-priego-extrabold transition-all duration-500 ${isScrolled ? 'text-xl' : 'text-2xl'}`}>
              DiaUML Studio
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8" data-purpose="main-nav">
          <button
            onClick={() => {
              if (isAuthenticated) {
                window.location.href = '/dashboard';
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-uml-blue flex items-center justify-center text-white">
                    <User size={18} />
                  </div>
                  <div className="flex flex-col items-start leading-tight hidden sm:flex">
                    <span className="text-[13px] font-bold text-black">
                      {user?.fullName || user?.email.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => logout()}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
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
