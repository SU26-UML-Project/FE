const Navbar = () => {
  return (
    <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between" data-purpose="navigation-bar">
      <div className="flex items-center" data-purpose="logo-container">
        <span className="text-2xl font-extrabold tracking-tight text-black font-priego-extrabold">UML Diagram</span>
      </div>
      
      <nav className="hidden md:flex items-center space-x-8" data-purpose="main-nav">
        <a className="text-[16px] font-semibold text-gray-900 hover:text-uml-blue transition" href="#">Features</a>
        <a className="text-[16px] font-semibold text-gray-900 hover:text-uml-blue transition" href="#">Templates</a>
        <a className="text-[16px] font-semibold text-gray-900 hover:text-uml-blue transition" href="#">Pricing</a>
        <a className="text-[16px] font-semibold text-gray-900 hover:text-uml-blue transition" href="#">Documentation</a>
      </nav>
      
      <div className="flex items-center space-x-4" data-purpose="header-buttons">
        <button className="px-6 py-2 text-[16px] font-semibold border border-black rounded-md hover:bg-gray-100 transition">Login</button>
        <button className="px-6 py-2 text-[16px] font-semibold bg-uml-blue text-white rounded-md hover:bg-blue-700 transition">Get started free</button>
      </div>
    </header>
  )
}

export default Navbar
