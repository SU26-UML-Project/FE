import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

/**
 * Nút "Về đầu trang" dùng chung, gắn ở layout gốc nên hiển thị trên mọi trang.
 * Chỉ hiện khi cuộn quá 300px; bấm để cuộn mượt về đầu trang với hiệu ứng fade.
 */
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 0.4, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={scrollToTop}
          aria-label="Về đầu trang"
          className="fixed bottom-6 right-6 z-[90] h-11 w-11 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-700 shadow-sm hover:text-uml-blue hover:border-uml-blue active:scale-95 transition-colors duration-300"
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export default ScrollToTop
