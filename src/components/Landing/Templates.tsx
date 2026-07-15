import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import classdiagram from '../../assets/images_populartemplate/Gemini_Generated_Image_oruyqmoruyqmoruy.png'
import usecase from '../../assets/images_populartemplate/Gemini_Generated_Image_olgywzolgywzolgy.png'
import activitydiagram from '../../assets/images_populartemplate/Gemini_Generated_Image_9x41y79x41y79x41.png'
import sequencediagram from '../../assets/images_populartemplate/Gemini_Generated_Image_ca8uykca8uykca8u.png'
import statemachine from '../../assets/images_populartemplate/Gemini_Generated_Image_7ed1qb7ed1qb7ed1.png'
import componentdiagram from '../../assets/images_populartemplate/Gemini_Generated_Image_ep5jorep5jorep5j.png'

const templateData = [
  { id: 1, src: classdiagram, alt: "Sơ đồ lớp hệ thống đặt chỗ trực tuyến" },
  { id: 2, src: usecase, alt: "Sơ đồ ca sử dụng hệ thống đặt chỗ trực tuyến" },
  { id: 3, src: activitydiagram, alt: "Sơ đồ hoạt động hệ thống đặt chỗ" },
  { id: 4, src: sequencediagram, alt: "Sơ đồ tuần tự đặt vé máy bay" },
  { id: 5, src: statemachine, alt: "Sơ đồ máy trạng thái vòng đời đặt chỗ" },
  { id: 6, src: componentdiagram, alt: "Sơ đồ thành phần kiến trúc hệ thống đặt chỗ" },
]

const AUTOPLAY_MS = 4000
const SWIPE_THRESHOLD = 50

const Templates = () => {
  const [currentPage, setCurrentPage] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const itemsPerPage = 3
  const totalPages = Math.ceil(templateData.length / itemsPerPage)
  const touchStartX = useRef<number | null>(null)

  const currentTemplates = templateData.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  )

  const goTo = useCallback((page: number, dir: number) => {
    setDirection(dir)
    setCurrentPage(((page % totalPages) + totalPages) % totalPages)
  }, [totalPages])

  const next = useCallback(() => goTo(currentPage + 1, 1), [currentPage, goTo])
  const prev = useCallback(() => goTo(currentPage - 1, -1), [currentPage, goTo])

  // Auto-play — resets whenever currentPage or pause state changes.
  useEffect(() => {
    if (isPaused) return
    const timer = setTimeout(() => goTo(currentPage + 1, 1), AUTOPLAY_MS)
    return () => clearTimeout(timer)
  }, [currentPage, isPaused, goTo])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      delta < 0 ? next() : prev()
    }
    touchStartX.current = null
  }

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  }

  return (
    <section id="popular-templates" className="py-20 px-4">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-7xl mx-auto"
      >
        <h2 className="text-4xl font-priego-extrabold font-bold text-left mb-12 ml-4 md:ml-0 uppercase tracking-tight text-black">MẪU PHỔ BIẾN</h2>

        <div
          className="group relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Prev arrow */}
          <button
            onClick={prev}
            aria-label="Mẫu trước"
            className="absolute left-0 md:-left-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-700 opacity-40 hover:opacity-100 hover:text-uml-blue hover:border-uml-blue group-hover:opacity-100 transition-all duration-300"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>

          {/* Next arrow */}
          <button
            onClick={next}
            aria-label="Mẫu tiếp theo"
            className="absolute right-0 md:-right-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-700 opacity-40 hover:opacity-100 hover:text-uml-blue hover:border-uml-blue group-hover:opacity-100 transition-all duration-300"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>

          <div className="overflow-hidden min-h-[400px] px-8 md:px-0">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentPage}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
        </div>

        <nav aria-label="Điều hướng mẫu" className="flex justify-center items-center space-x-4 mt-12" data-purpose="slider-pagination">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx, idx > currentPage ? 1 : -1)}
              className={`h-4 w-4 rounded-full transition-colors duration-300 ${
                currentPage === idx ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Đến trang ${idx + 1}`}
            />
          ))}
        </nav>
      </motion.div>
    </section>
  )
}

export default Templates
