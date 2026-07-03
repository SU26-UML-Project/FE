import { motion } from 'framer-motion'
import feature1 from '../../assets/images_features/787D8154-7C70-48F2-B2CF-53E7762ACF99.png'
import feature2 from '../../assets/images_features/IMG_5496 (1).PNG'
import feature3 from '../../assets/images_features/3075BC6F-69E5-4E7F-9B4F-09309FDE4DAB.png'

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center py-4">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="border-[1.5px] border-[#666666] rounded-4xl bg-transparent aspect-square w-full max-w-[480px] overflow-hidden"
                    >
                        <img src={feature1} alt="AI Supported UML Diagrams" className="w-full h-full object-cover" />
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="border-[1.5px] border-[#666666] rounded-4xl bg-transparent aspect-square w-full max-w-[480px] overflow-hidden"
                    >
                        <img src={feature2} alt="Collaboration / Cooperation" className="w-full h-full object-cover" />
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="border-[1.5px] border-[#666666] rounded-4xl bg-transparent aspect-square w-full max-w-[480px] overflow-hidden"
                    >
                        <img src={feature3} alt="Upload Document SRS" className="w-full h-full object-cover" />
                    </motion.div>
                </div>
            </motion.div>
        </section>
    )
}

export default Features
