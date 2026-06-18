import { motion } from 'framer-motion'
import { FaFacebook, FaInstagram, FaXTwitter } from 'react-icons/fa6'

const socialLinks = [
  { icon: FaFacebook, label: 'Facebook', url: '#' },
  { icon: FaInstagram, label: 'Instagram', url: '#' },
  { icon: FaXTwitter, label: 'X (Twitter)', url: '#' }
]

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
      <motion.section 
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center text-center mb-24" 
        data-purpose="cta-section"
      >
        <h2 className="font-priego-extrabold text-3xl md:text-4xl lg:text-[2.75rem] text-black mb-10 uppercase tracking-tight">
          Accelerate your engineering workflow.
        </h2>
        <a className="bg-[#2b63d1] hover:bg-[#1e4bb8] text-white px-10 py-3 rounded-md font-bold text-sm tracking-widest transition-colors duration-200 uppercase" data-purpose="signup-button" href="#">
          SIGN UP FOR FREE
        </a>
      </motion.section>

      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.3 }}
        className="max-w-7xl mx-auto pt-16" 
        data-purpose="footer-navigation"
      >
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
          <div className="col-span-2 md:col-span-1 flex md:justify-end md:items-end md:flex-col items-center" data-purpose="copyright-area">
            <div className="flex gap-4 mb-3 md:mb-2">
              {socialLinks.map((social, index) => {
                const Icon = social.icon
                return (
                  <motion.a
                    key={index}
                    href={social.url}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-gray-600 hover:text-uml-blue transition-colors"
                    aria-label={social.label}
                  >
                    <Icon size={20} style={{ fontSize: '20px' }} />
                  </motion.a>
                )
              })}
            </div>
            <p className="text-gray-400 text-[0.8rem] font-normal whitespace-nowrap opacity-80">
              © 2026 DiaUML Studio
            </p>
          </div>
        </div>
      </motion.section>
    </footer>
  )
}

export default Footer
