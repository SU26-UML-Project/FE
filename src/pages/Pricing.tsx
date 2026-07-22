import { useState, useEffect } from 'react'
import { motion, animate, useMotionValue, useTransform } from 'framer-motion'
import { Check, ArrowRight, ArrowDown, Activity, RefreshCw, HardDrive, Globe, X, ChevronDown } from 'lucide-react'
import AuthModal from '../components/Auth/AuthModal'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { toast } from 'react-hot-toast'
import type { BillingCycle } from '../types/pricing'
import type { UpgradeQuoteResponse } from '../types/payment'
import { planService, type PlanResponse } from '../services/planService'
import { paymentService } from '../services/paymentService'
import { ERROR_CODES, getErrorCode } from '../utils/errorMessage'

/* ---------- helpers ---------- */
const fmtVnd = (n: number) => n.toLocaleString('vi-VN')
const fmtLimit = (v: number | null | undefined) =>
  v == null ? '—' : v === -1 ? '∞' : fmtVnd(v)

/** Giá quy đổi/tháng khi trả theo năm (chỉ khi gói bật yearlyBilling). */
const yearlyPerMonth = (p: PlanResponse): number | null =>
  p.yearlyBilling ? Math.round(p.price * (1 - (p.yearlyDiscount ?? 0) / 100)) : null

/** Bullet hiển thị trên card: hạn mức đã đặt + các tính năng được bật. */
function planBullets(p: PlanResponse): string[] {
  const b: string[] = []
  const L = p.limits
  if (L) {
    if (L.projects != null) b.push(L.projects === -1 ? 'Dự án không giới hạn' : `${fmtVnd(L.projects)} dự án`)
    if (L.diagrams != null) b.push(L.diagrams === -1 ? 'Sơ đồ không giới hạn' : `${fmtVnd(L.diagrams)} sơ đồ`)
    if (L.aiQueries != null) b.push(L.aiQueries === -1 ? 'AI không giới hạn' : `${fmtVnd(L.aiQueries)} lượt AI`)
    if (L.exportPdf != null) b.push(L.exportPdf === -1 ? 'Export PDF không giới hạn' : `${fmtVnd(L.exportPdf)} lần export PDF`)
    if (L.collaborators != null) b.push(L.collaborators === -1 ? 'Cộng tác viên không giới hạn' : `${fmtVnd(L.collaborators)} cộng tác viên`)
  }
  ;(p.features ?? []).filter(f => f.included).forEach(f => b.push(f.label))
  return b
}

const includes = [
  {
    icon: Activity,
    title: 'Cam kết uptime 99.9%',
    description: 'Hạ tầng có độ tin cậy cao với tự động chuyển đổi dự phòng và dự phòng đa vùng để đảm bảo khả dụng tối đa.',
  },
  {
    icon: RefreshCw,
    title: 'Đồng bộ thời gian thực',
    description: 'Chỉnh sửa hiển thị trên các thiết bị khác trong dưới 200ms. Không cần lưu tay, không cần tải lại.',
  },
  {
    icon: HardDrive,
    title: 'Sao lưu đám mây',
    description: 'Sơ đồ được sao lưu trên ba vùng địa lý. Khôi phục tệp đã xóa trong vòng 30 ngày.',
  },
  {
    icon: Globe,
    title: 'Ứng dụng desktop',
    description: 'Ứng dụng gốc cho macOS, Windows và Linux. Bản trình duyệt chạy trên Chrome, Firefox, Safari, Edge.',
  },
]

const faqData = [
  {
    question: 'Tôi có thể hủy bất cứ lúc nào không?',
    answer: 'Có, bạn có thể hủy đăng ký bất cứ lúc nào. Quyền truy cập vẫn duy trì đến hết kỳ thanh toán hiện tại. Không cần lý do.',
  },
  {
    question: 'Bạn chấp nhận những phương thức thanh toán nào?',
    answer: 'Chúng tôi chấp nhận tất cả các loại thẻ tín dụng phổ biến, PayPal và chuyển khoản ngân hàng cho gói Enterprise trả theo năm.',
  },
  {
    question: 'Gói Pro có dùng thử miễn phí không?',
    answer: 'Có, chúng tôi cung cấp bản dùng thử miễn phí 14 ngày cho gói Pro mà không cần thẻ tín dụng. Bạn được sử dụng đầy đủ mọi tính năng Pro trong thời gian dùng thử.',
  },
  {
    question: 'Tôi có thể đổi gói sau này không?',
    answer: 'Hoàn toàn được. Bạn có thể nâng cấp hoặc hạ cấp gói bất cứ lúc nào. Thay đổi có hiệu lực ngay lập tức và chúng tôi tính lại chênh lệch cước theo tỷ lệ.',
  },
  {
    question: 'Xác minh gói Education hoạt động thế nào?',
    answer: 'Chỉ cần đăng ký bằng email .edu của bạn và chúng tôi sẽ tự động xác minh tư cách sinh viên hoặc giảng viên trong vài phút.',
  },
]

const Pricing = () => {
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [plans, setPlans] = useState<PlanResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { user } = useAuthStore()

  useEffect(() => {
    let alive = true
    planService
      .getPublicPlans()
      .then(list => { if (alive) setPlans(list ?? []) })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const collapse = () => setExpandedIndex(null)
    document.addEventListener('click', collapse)
    return () => document.removeEventListener('click', collapse)
  }, [])

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setIsAuthModalOpen(true)
  }

  const hasYearly = plans.some(p => p.yearlyBilling)

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
      <section className="relative pt-32 pb-8 px-4 md:px-8 bg-white/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-priego-extrabold uppercase tracking-tight text-black mb-4">
              BẢNG GIÁ
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Giá minh bạch, đơn giản — chọn gói phù hợp với đội ngũ và mở rộng khi bạn phát triển.
            </p>
          </motion.div>

          {hasYearly && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex justify-center mb-12"
            >
              <BillingToggle billing={billing} setBilling={setBilling} />
            </motion.div>
          )}

          {loading ? (
            <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-stretch">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex-1 rounded-[2rem] border-[1.5px] border-gray-200 bg-white p-6 animate-pulse">
                  <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
                  <div className="h-9 w-32 bg-gray-200 rounded mb-4" />
                  <div className="h-4 w-full bg-gray-100 rounded mb-2" />
                  <div className="h-4 w-5/6 bg-gray-100 rounded mb-6" />
                  <div className="space-y-2">
                    {[0, 1, 2].map(j => <div key={j} className="h-3.5 w-full bg-gray-100 rounded" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20 text-gray-500">Không tải được bảng giá. Vui lòng thử lại sau.</div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20 text-gray-500">Chưa có gói nào được mở bán.</div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-stretch">
              {plans.map((plan, idx) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  billing={billing}
                  isExpanded={expandedIndex === idx}
                  isAnyExpanded={expandedIndex !== null}
                  onToggle={() => setExpandedIndex(prev => (prev === idx ? null : idx))}
                  openAuth={openAuth}
                  currentPlanId={user?.currentPlanId}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-center -mt-8 mb-4">
        <motion.a
          href="#every-plan-includes"
          aria-label="Cuộn tới phần Gói nào cũng có"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
          className="group inline-flex flex-col items-center gap-1.5 text-gray-500 hover:text-uml-blue transition-colors"
        >
          <span className="text-xs font-bold uppercase tracking-widest">Bao gồm những gì</span>
          <motion.span
            aria-hidden
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <ArrowDown size={20} strokeWidth={1.5} />
          </motion.span>
        </motion.a>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-8 md:gap-14 px-8 py-4 bg-white rounded-2xl border border-gray-200/60 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-center">
            <div className="text-lg font-priego-extrabold text-black">2,000+</div>
            <div className="text-xs text-gray-500">Đội ngũ tin dùng</div>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center">
            <div className="text-lg font-priego-extrabold text-black">4.8/5</div>
            <div className="text-xs text-gray-500">Đánh giá người dùng</div>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center">
            <div className="text-lg font-priego-extrabold text-black">99.9%</div>
            <div className="text-xs text-gray-500">Uptime SLA</div>
          </div>
        </div>
      </motion.div>

      <div className="bg-gradient-to-b from-transparent via-white/20 to-white/40">
        <EveryPlanIncludes />
        {plans.length > 0 && <FeatureComparison plans={plans} />}
        <FAQSection />
      </div>
    </>
  )
}

export default Pricing

const BillingToggle = ({
  billing,
  setBilling,
}: {
  billing: BillingCycle
  setBilling: (b: BillingCycle) => void
}) => {
  return (
    <div
      role="tablist"
      aria-label="Chu kỳ thanh toán"
      className="relative inline-flex items-center bg-white/60 backdrop-blur-sm border-2 border-gray-200/80 rounded-full p-0.5"
    >
      {(['monthly', 'yearly'] as BillingCycle[]).map(option => {
        const isActive = billing === option
        return (
          <button
            key={option}
            role="tab"
            aria-selected={isActive}
            onClick={() => setBilling(option)}
            className={`relative z-10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full capitalize transition-colors duration-300 ${
              isActive ? 'text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="billing-pill"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute inset-0 rounded-full bg-uml-blue/85 backdrop-blur-md border border-white/20 shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              {option === 'monthly' ? 'Hàng tháng' : 'Hàng năm'}
              {option === 'yearly' && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                }`}>
                  Tiết kiệm
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const PriceCounter = ({ value }: { value: number }) => {
  const count = useMotionValue(0)
  const rounded = useTransform(count, latest => Math.round(latest))
  const formatted = useTransform(rounded, latest => latest.toLocaleString('vi-VN'))

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [value, count])

  return <motion.span className="tabular-nums">{formatted}</motion.span>
}

const PlanCard = ({
  plan,
  billing,
  isExpanded,
  isAnyExpanded,
  onToggle,
  openAuth,
  currentPlanId,
}: {
  plan: PlanResponse
  billing: BillingCycle
  isExpanded: boolean
  isAnyExpanded: boolean
  onToggle: () => void
  openAuth: (mode: 'login' | 'register') => void
  currentPlanId?: string
}) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [isHovered, setIsHovered] = useState(false)

  const bullets = planBullets(plan)
  const perMonthYearly = yearlyPerMonth(plan)
  const activePrice = billing === 'yearly' && perMonthYearly != null ? perMonthYearly : plan.price
  const yearlySaving = perMonthYearly != null ? (plan.price - perMonthYearly) * 12 : 0
  const isFree = !plan.contactSales && plan.price === 0
  const isCurrentPlan = currentPlanId === plan.id
  const isBlurred = isAnyExpanded && !isExpanded
  const canBounce = isHovered && !isExpanded && !isBlurred

  const goCheckout = async () => {
    if (plan.contactSales) { openAuth('login'); return }
    if (isFree) { openAuth('register'); return }
    if (!isAuthenticated) { openAuth('login'); return }

    if (currentPlanId === plan.id) {
      toast('Bạn đang sử dụng gói này.')
      return
    }

    if (currentPlanId) {
      try {
        const quote = await paymentService.getQuote(plan.id)
        navigate('/payment-information', { state: { plan, billing, quote } })
      } catch (err: any) {
        const code = getErrorCode(err)
        if (code === ERROR_CODES.SUBSCRIPTION_ALREADY_ACTIVE) {
          toast('Bạn đang sử dụng gói này.')
        } else if (code === ERROR_CODES.DOWNGRADE_NOT_ALLOWED_WHILE_ACTIVE) {
          toast('Không thể hạ gói khi gói hiện tại còn hiệu lực.')
        } else if (code === ERROR_CODES.PENDING_PAYMENT_EXISTS) {
          toast('Bạn đang có giao dịch chờ thanh toán. Vui lòng hoàn tất hoặc huỷ trước khi nâng cấp.')
        } else {
          toast(err?.message || 'Không thể lấy báo giá, vui lòng thử lại.')
        }
      }
      return
    }

    navigate('/payment-information', { state: { plan, billing } })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{
        opacity: isBlurred ? (isHovered ? 0.6 : 0.2) : 1,
        filter: isBlurred ? (isHovered ? 'blur(3px)' : 'blur(8px)') : 'blur(0px)',
        flexGrow: isExpanded ? 2.4 : 1,
        scale: canBounce ? 1.04 : (plan.popular && !isAnyExpanded ? 1.03 : 1),
        y: canBounce ? -6 : (plan.popular && !isAnyExpanded ? -4 : 0),
        zIndex: isExpanded ? 10 : 1,
        borderColor: isHovered && !plan.popular ? '#2563eb' : (plan.popular ? '#2563eb' : '#e5e7eb'),
      }}
      whileHover={!isExpanded && !isAnyExpanded ? { scale: 1.025, y: -6 } : undefined}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.7,
        opacity: { duration: 0.25, ease: 'easeOut' },
        filter: { duration: 0.3, ease: 'easeOut' },
        flexGrow: { type: 'spring', stiffness: 350, damping: 28, mass: 0.9 },
        zIndex: { duration: 0.15 },
      }}
      className="group relative cursor-pointer min-w-0 flex-1 rounded-[2rem] border-[1.5px] flex flex-col overflow-hidden bg-white"
      style={{
        boxShadow: plan.popular
          ? '0 8px 30px -8px rgba(37,99,235,0.25), 0 1px 3px rgba(0,0,0,0.04)'
          : '0 4px 16px -6px rgba(0,0,0,0.08), 0 2px 6px -3px rgba(0,0,0,0.04)',
        background: plan.popular ? 'linear-gradient(to bottom, #f0f7ff, #ffffff)' : '#ffffff',
        willChange: 'transform, filter',
      }}
      data-purpose={`plan-card-${plan.name.toLowerCase()}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      aria-expanded={isExpanded}
    >
      <div className="p-5 md:p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight text-black">
            {plan.name}
          </h3>
          <div className="flex items-center gap-1.5">
            {isCurrentPlan && (
              <span className="text-[10px] font-bold uppercase bg-green-600 text-white px-2 py-1 rounded tracking-wider">
                Hiện tại
              </span>
            )}
            {plan.popular && (
              <span className="text-[10px] font-bold uppercase bg-uml-blue text-white px-2 py-1 rounded tracking-wider">
                Phổ biến nhất
              </span>
            )}
          </div>
        </div>

        <div className="mb-4">
          {plan.contactSales ? (
            <>
              <div className="text-3xl md:text-4xl font-priego-extrabold text-black">Liên hệ</div>
              <p className="text-xs text-gray-500 mt-1">Báo giá riêng theo nhu cầu</p>
            </>
          ) : isFree ? (
            <>
              <div className="text-3xl md:text-4xl font-priego-extrabold text-black">Miễn phí</div>
              <p className="text-xs text-gray-500 mt-1">Không cần thẻ tín dụng</p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-3xl md:text-4xl font-priego-extrabold text-black inline-flex items-baseline">
                  <PriceCounter value={activePrice} /><span className="text-2xl ml-1">đ</span>
                </span>
                <span className="text-sm text-gray-500">/tháng</span>
                {billing === 'yearly' && yearlySaving > 0 && (
                  <span className="ml-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    Tiết kiệm {fmtVnd(yearlySaving)}đ/năm
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {billing === 'yearly' && perMonthYearly != null
                  ? `Thanh toán theo năm — ${fmtVnd(activePrice)}đ/tháng`
                  : 'Thanh toán theo tháng'}
              </p>
            </>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{plan.description}</p>

        <ul className="space-y-2.5 mb-4 flex-grow">
          {bullets.length === 0 && (
            <li className="text-xs text-gray-400">Chưa cấu hình tính năng.</li>
          )}
          {bullets.slice(0, isExpanded ? bullets.length : 3).map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center">
                <Check size={10} className="text-uml-blue" strokeWidth={3} />
              </span>
              <span>{feature}</span>
            </li>
          ))}
          {!isExpanded && bullets.length > 3 && (
            <li className="text-xs text-gray-400 pl-6 font-medium">
              +{bullets.length - 3} tính năng khác
            </li>
          )}
        </ul>

        <div className="pt-4 border-t border-gray-100">
          {isExpanded ? (
            !isFree && (
              <button
                onClick={(e) => { e.stopPropagation(); goCheckout() }}
                className={`w-full py-3 rounded-xl font-bold uppercase text-sm tracking-wider transition-colors duration-200 ${
                  plan.popular
                    ? 'bg-uml-blue text-white hover:bg-blue-700'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {plan.contactSales ? 'Liên hệ' : 'Chọn gói'}
              </button>
            )
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              className={`w-full py-3 rounded-xl font-bold uppercase text-sm tracking-wider transition-colors duration-300 ${
                plan.popular
                  ? 'border-2 border-uml-blue text-uml-blue hover:bg-blue-50'
                  : 'border-2 border-gray-300 text-gray-600 hover:border-uml-blue hover:text-uml-blue'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span>Xem chi tiết</span>
                <ArrowRight size={14} strokeWidth={2.5} />
              </span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const EveryPlanIncludes = () => {
  return (
    <section id="every-plan-includes" className="pt-6 pb-16 px-4 md:px-8 border-t border-gray-200/60 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-priego-extrabold uppercase tracking-tight text-black mb-3">
            GÓI NÀO CŨNG CÓ
          </h2>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Hạ tầng cốt lõi đi kèm mọi tài khoản, ngay từ gói miễn phí.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 max-w-5xl mx-auto">
          {includes.map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ y: 24, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.55,
                  delay: idx * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group flex items-start gap-4 p-4 -m-4 rounded-2xl transition-all duration-300 hover:bg-white/60 hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.06)]"
              >
                <span className="shrink-0 w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center bg-white shadow-[0_2px_6px_-3px_rgba(0,0,0,0.08)] transition-all duration-300 group-hover:border-uml-blue group-hover:shadow-[0_4px_12px_-4px_rgba(37,99,235,0.25)]">
                  <Icon size={20} strokeWidth={1.5} className="text-gray-700 transition-colors duration-300 group-hover:text-uml-blue" />
                </span>
                <div className="min-w-0 relative">
                  <h3 className="text-lg font-bold text-black mb-1.5 tracking-tight transition-colors duration-300 group-hover:text-uml-blue">
                    {item.title}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-uml-blue transition-all duration-300 group-hover:w-full"></span>
                  </h3>
                  <p
                    className="text-sm text-gray-600 leading-relaxed transition-all duration-300 group-hover:text-gray-800"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                  >
                    {item.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

type ComparisonRow = { feature: string; values: (string | boolean)[] }

/** Dựng ma trận so sánh động: 4 hạn mức + toàn bộ catalog tính năng (✓/✗ theo từng gói). */
function buildComparison(plans: PlanResponse[]): ComparisonRow[] {
  const rows: ComparisonRow[] = [
    { feature: 'Số dự án', values: plans.map(p => fmtLimit(p.limits?.projects)) },
    { feature: 'Số sơ đồ', values: plans.map(p => fmtLimit(p.limits?.diagrams)) },
    { feature: 'Lượt AI / kỳ', values: plans.map(p => fmtLimit(p.limits?.aiQueries)) },
    { feature: 'Export PDF / kỳ', values: plans.map(p => fmtLimit(p.limits?.exportPdf)) },
    { feature: 'Cộng tác viên', values: plans.map(p => fmtLimit(p.limits?.collaborators)) },
  ]
  // Catalog features: mọi gói cùng thứ tự catalog → lấy danh mục từ gói đầu, tra included theo id.
  const catalog = plans[0]?.features ?? []
  catalog.forEach(cell => {
    rows.push({
      feature: cell.label,
      values: plans.map(p => p.features?.find(f => f.id === cell.id)?.included ?? false),
    })
  })
  return rows
}

const FeatureComparison = ({ plans }: { plans: PlanResponse[] }) => {
  const rows = buildComparison(plans)

  const renderCell = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value
        ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50">
              <Check size={13} className="text-green-600" strokeWidth={3} />
            </span>
          )
        : (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100">
              <X size={12} className="text-gray-400" strokeWidth={2.5} />
            </span>
          )
    }
    return <span className="text-sm font-medium text-gray-700">{value}</span>
  }

  return (
    <section className="py-16 px-4 md:px-8 border-t border-gray-200/60">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-priego-extrabold uppercase tracking-tight text-black mb-3">
            SO SÁNH TÍNH NĂNG CHI TIẾT
          </h2>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Xem chính xác từng gói bao gồm những gì để tìm lựa chọn phù hợp cho đội ngũ của bạn.
          </p>
        </motion.div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-[0_4px_16px_-6px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.1),0_4px_8px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-300">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 w-[28%] sticky left-0 bg-gray-50/80 z-10">
                  Tính năng
                </th>
                {plans.map(p => (
                  <th
                    key={p.id}
                    className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-center border-b border-gray-200 ${
                      p.popular ? 'text-uml-blue' : 'text-gray-400'
                    }`}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <motion.tr
                  key={row.feature}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  className={`transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                  } hover:bg-blue-50/20`}
                >
                  <td className={`px-6 py-3.5 text-sm font-semibold text-gray-800 border-b border-gray-100/80 sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    {row.feature}
                  </td>
                  {row.values.map((value, i) => (
                    <td
                      key={i}
                      className="px-6 py-3.5 text-center align-middle border-b border-gray-100/80"
                    >
                      {renderCell(value)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-16 px-4 md:px-8 border-t border-gray-200/60">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-priego-extrabold uppercase tracking-tight text-black mb-3">
            CÂU HỎI THƯỜNG GẶP
          </h2>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Mọi điều bạn cần biết trước khi bắt đầu.
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqData.map((item, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="border border-gray-200/80 rounded-xl overflow-hidden bg-white shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.08)] transition-shadow duration-300"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span className="text-sm font-bold text-black tracking-tight">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={18}
                    strokeWidth={2.5}
                    className={`shrink-0 text-gray-400 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-6 pb-5 text-sm text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
