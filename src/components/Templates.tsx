import { motion } from 'framer-motion'

const Templates = () => {
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
          {[1, 2, 3, 4].map((i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.05 }}
              className="border-[1.5px] border-[#666666] rounded-[2rem] bg-transparent aspect-square w-full max-w-[350px]"
            ></motion.div>
          ))}
        </div>

        <nav aria-label="Pagination" className="flex justify-center items-center space-x-4 mt-12" data-purpose="slider-pagination">
          <span aria-current="page" className="h-4 w-4 rounded-full bg-blue-600"></span>
          <span className="h-4 w-4 rounded-full bg-gray-300"></span>
          <span className="h-4 w-4 rounded-full bg-gray-300"></span>
          <span className="h-4 w-4 rounded-full bg-gray-300"></span>
        </nav>
      </motion.div>
    </section>
  )
}

export default Templates
