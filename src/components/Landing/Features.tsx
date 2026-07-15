import { motion } from 'framer-motion'
import feature1 from '../../assets/images_features/787D8154-7C70-48F2-B2CF-53E7762ACF99.png'
import feature2 from '../../assets/images_features/IMG_5496 (1).PNG'
import feature3 from '../../assets/images_features/3075BC6F-69E5-4E7F-9B4F-09309FDE4DAB.png'

const features = [
    {
        src: feature1,
        title: 'Sơ đồ UML hỗ trợ bởi AI',
        description: 'Sinh và tinh chỉnh sơ đồ tự động, để AI lo phần cấu trúc còn bạn tập trung vào thiết kế.',
    },
    {
        src: feature2,
        title: 'Cộng tác thời gian thực',
        description: 'Cùng nhau chỉnh sửa trên một bản vẽ, thay đổi được đồng bộ tức thì cho cả đội.',
    },
    {
        src: feature3,
        title: 'Tải lên tài liệu SRS',
        description: 'Nhập tài liệu đặc tả yêu cầu và chuyển hóa thành sơ đồ UML chỉ trong vài bước.',
    },
]

const Features = () => {
    return (
        <section id="key-features" className="pt-4 pb-16 px-4">
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-7xl mx-auto"
            >
                <h2 className="text-4xl font-priego-extrabold font-bold text-center mb-12 uppercase tracking-tight text-black">TÍNH NĂNG NỔI BẬT</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center py-4">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={feature.title}
                            initial={{ y: 40, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ scale: 1.02 }}
                            className="w-full max-w-[480px] flex flex-col"
                        >
                            <div className="border-[1.5px] border-[#666666] rounded-4xl bg-transparent aspect-square w-full overflow-hidden">
                                <img src={feature.src} alt={feature.title} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="mt-5 text-lg font-bold text-black tracking-tight text-center">{feature.title}</h3>
                            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed text-center px-2">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </section>
    )
}

export default Features
