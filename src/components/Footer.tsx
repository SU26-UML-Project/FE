const footerLinks = [
  {
    title: 'Product',
    links: ['A Diagram', 'B Diagram', 'C Diagram']
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Templates', 'Pricing']
  },
  {
    title: 'Company',
    links: ['About Us', 'Blog', 'Contact']
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Settings']
  }
]

const Footer = () => {
  return (
    <footer className="footer-bg w-full py-20 px-6 md:px-12 lg:px-24">
      <section className="flex flex-col items-center text-center mb-24" data-purpose="cta-section">
        <h2 className="font-priego-extrabold text-3xl md:text-4xl lg:text-[2.75rem] text-black mb-10 uppercase tracking-tight">
          Accelerate your engineering workflow.
        </h2>
        <a className="bg-[#2b63d1] hover:bg-[#1e4bb8] text-white px-10 py-3 rounded-md font-bold text-sm tracking-widest transition-colors duration-200 uppercase" data-purpose="signup-button" href="#">
          SIGN UP FOR FREE
        </a>
      </section>

      <section className="max-w-7xl mx-auto pt-16" data-purpose="footer-navigation">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {footerLinks.map((column, index) => (
            <div key={index} data-purpose="footer-column">
              <h3 className="font-bold text-[1.1rem] mb-5 text-black tracking-tight">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link, lIndex) => (
                  <li key={lIndex}>
                    <a className="text-gray-900 font-medium hover:text-uml-blue transition-colors text-[0.95rem]" href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-span-2 md:col-span-1 flex md:justify-end items-start pt-1 md:pt-0" data-purpose="copyright-area">
            <p className="text-gray-400 text-[0.8rem] font-normal whitespace-nowrap opacity-80">
              © 2026 UMLDiagram
            </p>
          </div>
        </div>
      </section>
    </footer>
  )
}

export default Footer
