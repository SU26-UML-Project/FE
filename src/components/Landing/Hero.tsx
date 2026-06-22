import { motion } from 'framer-motion'
import laptopMockup from '../../assets/images/IMG_4805.png'
import mobileMockup from '../../assets/images/IMG_4810.PNG'
import tabletMockup from '../../assets/images/IMG_4811.PNG'

const Hero = () => {
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
    <main className="max-w-7xl mx-auto px-6 pt-32 pb-12" data-purpose="hero-content">
      <div className="max-w-3xl">
        <motion.h1 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-5xl md:text-6xl font-priego-extrabold text-black uppercase mb-6"
        >
          DESIGN COMPLEX<br />SYSTEMS, SIMPLY.
        </motion.h1>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-xl text-gray-700 mb-10 max-w-2xl leading-relaxed"
        >
          Visualize software architecture, processes, and systems using intuitive, standard UML diagrams. Built for engineering teams.
        </motion.p>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-wrap gap-4 mb-20" 
          data-purpose="hero-actions"
        >
          <button className="px-8 py-4 bg-uml-blue text-white font-bold rounded-md hover:bg-blue-700 transition tracking-wide uppercase">
            START FREE TRIAL
          </button>
          <button className="px-8 py-4 bg-white border-2 border-black text-black font-bold rounded-md hover:bg-gray-50 transition tracking-wide uppercase">
            VIEW ALL DIAGRAM
          </button>
        </motion.div>
      </div>

      <div className="relative w-full flex justify-center mt-12 min-h-[700px]" data-purpose="product-visual">
        <div className="relative w-full max-w-5xl h-[600px]">
          {/* Laptop Mockup */}
          <motion.div 
            className="absolute" 
            style={laptopStyle}
            initial="hidden"
            animate={["showcase", "final"]}
            variants={laptopVariants}
          >
             <img src={laptopMockup} alt="Laptop Mockup" className="w-full h-full drop-shadow-sm object-contain" />
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
            <img src={tabletMockup} alt="Tablet Mockup" className="w-full h-full drop-shadow-2xl object-contain" />
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
            <img src={mobileMockup} alt="Mobile Mockup" className="w-full h-full drop-shadow-2xl object-contain" />
          </motion.div>
        </div>
      </div>
    </main>
  )
}

export default Hero
