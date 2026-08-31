import { motion } from 'framer-motion'
import { useT } from '../../langue'
import laptopMockup from '../../assets/images/IMG_5486.PNG'
import mobileMockup from '../../assets/images/IMG_5490.PNG'
import tabletMockup from '../../assets/images/IMG_5488.PNG'

const Hero = () => {
  const t = useT()
  const laptopStyle = {
    width: '915px',
    height: '900px',
    right: '-15%',
    left: 'auto',
    bottom: '-37px',
    zIndex: 0
  };

  const tabletStyle = {
    width: '1042px',
    height: '800px',
    right: 'auto',
    left: '-20%',
    bottom: '-44px',
    zIndex: 10
  };

  const mobileStyle = {
    width: '780px',
    height: '780px',
    right: 'auto',
    left: '-18%',
    bottom: '-131px',
    zIndex: 20
  };

  // Animation variants
  const laptopVariants = {
    hidden: { x: 500, scale: 0.8, opacity: 0 },
    showcase: { 
      x: '15%', // Slide to center-ish for focus
      scale: 1.1, 
      opacity: 1,
      transition: { duration: 1.2, ease: "easeOut" }
    },
    final: { 
      x: 0, 
      scale: 1, 
      opacity: 1,
      transition: { duration: 0.8, ease: "easeInOut" }
    }
  };

  const tabletVariants = {
    hidden: { x: -500, scale: 0.8, opacity: 0 },
    showcase: { 
      x: '10%', 
      scale: 1.1, 
      opacity: 1,
      transition: { duration: 1.2, ease: "easeOut" }
    },
    final: { 
      x: 0, 
      scale: 1, 
      opacity: 1,
      transition: { duration: 0.8, ease: "easeInOut" }
    }
  };

  const mobileVariants = {
    hidden: { x: 500, scale: 0.8, opacity: 0 },
    showcase: { 
      x: '5%', 
      scale: 1.1, 
      opacity: 1,
      transition: { duration: 1.2, ease: "easeOut" }
    },
    final: { 
      x: 0, 
      scale: 1, 
      opacity: 1,
      transition: { duration: 0.8, ease: "easeInOut" }
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 pt-32 pb-0" data-purpose="hero-content">
      <div className="max-w-3xl">
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-5xl md:text-6xl font-priego-extrabold text-black uppercase mb-6"
        >
          {t('hero.title1')}<br />{t('hero.title2')}
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-xl text-gray-700 mb-10 max-w-2xl leading-relaxed"
        >
          {t('hero.subtitle')}
        </motion.p>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-wrap gap-4 mb-16"
          data-purpose="hero-actions"
        >
          <button className="px-8 py-4 bg-uml-blue text-white font-bold rounded-md hover:bg-blue-700 transition tracking-wide uppercase">
            {t('hero.ctaTry')}
          </button>
          <button className="px-8 py-4 bg-white border-2 border-black text-black font-bold rounded-md hover:bg-gray-50 transition tracking-wide uppercase">
            {t('hero.ctaDiagrams')}
          </button>
        </motion.div>
      </div>

      <div className="relative w-full flex justify-center mt-4 min-h-[560px]" data-purpose="product-visual">
        <div className="relative w-full max-w-5xl h-[600px]">
          {/* Laptop Mockup */}
          <motion.div 
            className="absolute" 
            style={laptopStyle}
            initial="hidden"
            animate={["showcase", "final"]}
            variants={laptopVariants}
          >
              <img src={laptopMockup} alt={t('hero.altLaptop')} className="w-full h-full drop-shadow-sm object-contain" />
          </motion.div>
          
          {/* Tablet Mockup */}
          <motion.div 
            className="absolute" 
            style={tabletStyle}
            initial="hidden"
            animate={["showcase", "final"]}
            variants={tabletVariants}
            transition={{ delay: 1.5 }} // Sequence after laptop starts
          >
            <img src={tabletMockup} alt={t('hero.altTablet')} className="w-full h-full drop-shadow-2xl object-contain" />
          </motion.div>

          {/* Mobile Mockup */}
          <motion.div 
            className="absolute" 
            style={mobileStyle}
            initial="hidden"
            animate={["showcase", "final"]}
            variants={mobileVariants}
            transition={{ delay: 3 }} // Sequence after tablet starts
          >
            <img src={mobileMockup} alt={t('hero.altPhone')} className="w-full h-full drop-shadow-2xl object-contain" />
          </motion.div>
        </div>
      </div>
    </main>
  )
}

export default Hero
