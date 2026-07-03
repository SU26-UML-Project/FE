import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import classdiagram from '../../assets/images_populartemplate/Gemini_Generated_Image_oruyqmoruyqmoruy.png'
import usecase from '../../assets/images_populartemplate/Gemini_Generated_Image_olgywzolgywzolgy.png'
import activitydiagram from '../../assets/images_populartemplate/Gemini_Generated_Image_9x41y79x41y79x41.png'
import sequencediagram from '../../assets/images_populartemplate/Gemini_Generated_Image_ca8uykca8uykca8u.png'
import statemachine from '../../assets/images_populartemplate/Gemini_Generated_Image_7ed1qb7ed1qb7ed1.png'
import componentdiagram from '../../assets/images_populartemplate/Gemini_Generated_Image_ep5jorep5jorep5j.png'

const templateData = [
  { id: 1, src: classdiagram, alt: "Online Booking System Class Diagram" },
  { id: 2, src: usecase, alt: "Online Booking System Use Case Diagram" },
  { id: 3, src: activitydiagram, alt: "Booking System Activity Diagram" },
  { id: 4, src: sequencediagram, alt: "Flight Booking Sequence Diagram" },
  { id: 5, src: statemachine, alt: "Booking Lifecycle State Machine" },
  { id: 6, src: componentdiagram, alt: "Booking System Component Architecture" },
]

const Templates = () => {
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 3
  const totalPages = Math.ceil(templateData.length / itemsPerPage)

  const currentTemplates = templateData.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  )

  return (
    <section id="popular-templates" className="py-20 px-4">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-7xl mx-auto"
      >
        <h2 className="text-4xl font-priego-extrabold font-bold text-left mb-12 ml-4 md:ml-0 uppercase tracking-tight text-black">POPULAR TEMPLATES</h2>
        
        <div className="relative overflow-hidden min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center py-4"
            >
              {currentTemplates.map((template) => (
                <motion.div 
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  className="border-[1.5px] border-[#666666] rounded-[2rem] bg-white aspect-square w-full max-w-[350px] overflow-hidden flex items-center justify-center p-4"
                >
                  <img 
                    src={template.src} 
                    alt={template.alt} 
                    className="w-full h-full object-contain rounded-[1.5rem]"
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <nav aria-label="Pagination" className="flex justify-center items-center space-x-4 mt-12" data-purpose="slider-pagination">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={`h-4 w-4 rounded-full transition-colors duration-300 ${
                currentPage === idx ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </nav>
      </motion.div>
    </section>
  )
}

export default Templates
