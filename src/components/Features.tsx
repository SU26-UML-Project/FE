import { motion } from 'framer-motion'
import diagramlearning from '../assets/images_features/diagram_learning.png'
import AI_support from '../assets/images_features/AI_support.png'
import diagrameditor from '../assets/images_features/diagram_editor.png'

const Features = () => {
    return (
        <section id="key-features" className="py-20 px-4">
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-7xl mx-auto"
            >
                <h2 className="text-4xl font-priego-extrabold font-bold text-center mb-12 uppercase tracking-tight text-black">KEY FEATURES</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="border-[1.5px] border-[#666666] rounded-4xl bg-transparent aspect-square w-full max-w-[480px] overflow-hidden"
                    >
                        <img src={diagramlearning} alt="Diagram Learning" className="w-full h-full object-cover object-left" />
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="border-[1.5px] border-[#666666] rounded-4xl bg-transparent aspect-square w-full max-w-[480px] overflow-hidden"
                    >
                        <img src={AI_support} alt="AI Support" className="w-full h-full object-cover object-left" />
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="border-[1.5px] border-[#666666] rounded-4xl bg-transparent aspect-square w-full max-w-[480px] overflow-hidden"
                    >
                        <img src={diagrameditor} alt="Diagram Editor" className="w-full h-full object-cover object-left" />
                    </motion.div>
                </div>
            </motion.div>
        </section>
    )
}

export default Features
