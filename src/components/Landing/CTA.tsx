import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../langue'
import { useAuthStore } from '../../features/auth/model/useAuthStore'

const CTA = () => {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const t = useT()
  if (isAuthenticated) return null

  return (
    <section className="py-20 px-6 bg-grid-blue">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-4xl md:text-5xl font-priego-extrabold mb-4 tracking-tight text-black uppercase">
          {t('cta.title1')} <br /> {t('cta.title2')}
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
          {t('cta.subtitle')}
        </p>
        <div className="flex flex-wrap gap-4 justify-center" data-purpose="cta-actions">
          <button
            onClick={() => navigate('/?openLogin=true')}
            className="px-10 py-4 bg-uml-blue text-white font-bold rounded-md hover:bg-blue-700 transition-all text-base shadow-sm tracking-wide uppercase active:scale-[0.98]"
          >
            {t('cta.register')}
          </button>
          <button
            onClick={() => navigate('/pricing')}
            className="px-10 py-4 bg-white border-2 border-black text-black font-bold rounded-md hover:bg-gray-50 transition-all text-base tracking-wide uppercase active:scale-[0.98]"
          >
            {t('cta.viewPricing')}
          </button>
        </div>
      </motion.div>
    </section>
  )
}

export default CTA
