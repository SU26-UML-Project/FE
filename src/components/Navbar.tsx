import { useState, useEffect } from 'react'

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)

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

  return (
    <div className="fixed top-0 left-0 w-full z-[100] flex justify-center pointer-events-none transition-all duration-400 ease-in-out">
      <header 
        className={`
          w-full flex items-center justify-between transition-all duration-400 ease-in-out pointer-events-auto
          ${isScrolled 
            ? 'max-w-4xl px-8 py-3 bg-white/90 backdrop-blur-md rounded-[999px] shadow-lg border border-gray-200/50 mt-4' 
            : 'max-w-full px-12 py-6 footer-bg mt-0 border-b border-gray-200/0 rounded-[0px]'
          }
        `} 
        data-purpose="navigation-bar"
      >
        <div className="flex items-center" data-purpose="logo-container">
          <span className={`font-extrabold tracking-tight text-black font-priego-extrabold transition-all duration-500 ${isScrolled ? 'text-xl' : 'text-2xl'}`}>
            UML Diagram
          </span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8" data-purpose="main-nav">
          <a className="text-[15px] font-semibold text-gray-900 hover:text-uml-blue transition-colors duration-300" href="#">Features</a>
          <a className="text-[15px] font-semibold text-gray-900 hover:text-uml-blue transition-colors duration-300" href="#">Templates</a>
          <a className="text-[15px] font-semibold text-gray-900 hover:text-uml-blue transition-colors duration-300" href="#">Pricing</a>
          <a className="text-[15px] font-semibold text-gray-900 hover:text-uml-blue transition-colors duration-300" href="#">Documentation</a>
        </nav>
        
        <div className="flex items-center space-x-3" data-purpose="header-buttons">
          <button className={`font-semibold border border-black rounded-md hover:bg-gray-100 transition-all duration-500 ${isScrolled ? 'px-4 py-1.5 text-[14px]' : 'px-6 py-2 text-[16px]'}`}>
            Login
          </button>
          <button className={`font-semibold bg-uml-blue text-white rounded-md hover:bg-blue-700 transition-all duration-500 ${isScrolled ? 'px-4 py-1.5 text-[14px]' : 'px-6 py-2 text-[16px]'}`}>
            Get started free
          </button>
        </div>
      </header>
    </div>
  )
}

export default Navbar
