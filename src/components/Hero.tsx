import laptopMockup from '../assets/images/IMG_4805.png'
import mobileMockup from '../assets/images/IMG_4810.PNG'
import tabletMockup from '../assets/images/IMG_4811.PNG'

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

  return (
    <main className="max-w-7xl mx-auto px-6 pt-32 pb-12" data-purpose="hero-content">
      <div className="max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-priego-extrabold text-black uppercase mb-6">
          DESIGN COMPLEX<br />SYSTEMS, SIMPLY.
        </h1>
        <p className="text-xl text-gray-700 mb-10 max-w-2xl leading-relaxed">
          Visualize software architecture, processes, and systems using intuitive, standard UML diagrams. Built for engineering teams.
        </p>
        <div className="flex flex-wrap gap-4 mb-20" data-purpose="hero-actions">
          <button className="px-8 py-4 bg-uml-blue text-white font-bold rounded-md hover:bg-blue-700 transition tracking-wide uppercase">
            START FREE TRIAL
          </button>
          <button className="px-8 py-4 bg-white border-2 border-black text-black font-bold rounded-md hover:bg-gray-50 transition tracking-wide uppercase">
            VIEW ALL DIAGRAM
          </button>
        </div>
      </div>

      <div className="relative w-full flex justify-center mt-12 min-h-[700px]" data-purpose="product-visual">
        <div className="relative w-full max-w-5xl h-[600px]">
          <div className="absolute transition-all duration-300" style={laptopStyle}>
             <img src={laptopMockup} alt="Laptop Mockup" className="w-full h-full drop-shadow-sm object-contain" />
          </div>
          
          <div className="absolute transition-all duration-300" style={tabletStyle}>
            <img src={tabletMockup} alt="Tablet Mockup" className="w-full h-full drop-shadow-2xl object-contain" />
          </div>

          <div className="absolute transition-all duration-300" style={mobileStyle}>
            <img src={mobileMockup} alt="Mobile Mockup" className="w-full h-full drop-shadow-2xl object-contain" />
          </div>
        </div>
      </div>
    </main>
  )
}

export default Hero
