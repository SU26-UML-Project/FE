import { useState, useEffect } from 'react'
import { motion, animate, useMotionValue, useTransform } from 'framer-motion'
import { Check, ArrowRight, ArrowDown, Activity, RefreshCw, HardDrive, Globe } from 'lucide-react'

type BillingCycle = 'monthly' | 'yearly'

interface Plan {
  name: string
  monthlyPrice: number | null
  yearlyPrice: number | null
  description: string
  features: string[]
  cta: string
  highlight?: boolean
}

const plans: Plan[] = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'For individuals exploring UML diagrams and basic architecture design.',
    features: [
      'Up to 3 active diagrams',
      'Basic UML diagram types',
      'PNG export',
      'Community forum support',
    ],
    cta: 'Get started free',
  },
  {
    name: 'Education',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Free for students and accredited educators around the world.',
    features: [
      'Unlimited diagrams',
      'All UML diagram types',
      'Classroom collaboration',
      'PNG, SVG and PDF export',
      'Priority email support',
    ],
    cta: 'Apply with .edu',
  },
  {
    name: 'Pro',
    monthlyPrice: 12,
    yearlyPrice: 9,
    description: 'For professional engineers, freelancers, and small product teams.',
    features: [
      'Everything in Education',
      'Real-time team collaboration',
      'Version history & branches',
      'Custom shape libraries',
      'PNG, SVG, PDF and VDX export',
      'Priority chat support',
    ],
    cta: 'Start 14-day free trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    description: 'For organizations that need security, scale, and custom workflows.',
    features: [
      'Everything in Pro',
      'SSO & SAML authentication',
      'Dedicated success manager',
      'Custom API & integrations',
      'On-premise deployment',
      '24/7 premium support',
      'Enterprise SLA guarantee',
    ],
    cta: 'Contact sales',
  },
]

const includes = [
  {
    icon: Activity,
    title: '99.9% uptime SLA',
    description: 'Your workspace stays online. Accounts affected by unplanned downtime receive prorated credits.',
  },
  {
    icon: RefreshCw,
    title: 'Real-time sync',
    description: 'Edits appear on other devices in under 200ms. No manual save, no refresh button.',
  },
  {
    icon: HardDrive,
    title: 'Cloud backup',
    description: 'Diagrams replicate across three geographic regions. Restore deleted files within 30 days.',
  },
  {
    icon: Globe,
    title: 'Cross-platform access',
    description: 'Native apps for macOS, Windows, and Linux. Browser version runs in Chrome, Firefox, Safari, Edge.',
  },
]

const Pricing = () => {
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <>
      <section className="relative pt-32 pb-16 px-4 md:px-8 min-h-[100dvh]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-priego-extrabold uppercase tracking-tight text-black mb-4">
              PRICING
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed whitespace-nowrap">
              Simple, transparent pricing — choose the plan that fits your team and scale as you grow.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-12"
          >
            <BillingToggle billing={billing} setBilling={setBilling} />
          </motion.div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-stretch">
            {plans.map((plan, idx) => (
              <PlanCard
                key={plan.name}
                plan={plan}
                index={idx}
                billing={billing}
                isExpanded={expandedIndex === idx}
                isAnyExpanded={expandedIndex !== null}
                onToggle={() => setExpandedIndex(prev => (prev === idx ? null : idx))}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-center -mt-12 mb-4">
        <motion.a
          href="#every-plan-includes"
          aria-label="Scroll to Every plan includes"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
          className="group inline-flex flex-col items-center gap-1.5 text-gray-500 hover:text-uml-blue transition-colors"
        >
          <span className="text-xs font-bold uppercase tracking-widest">What's included</span>
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

      <EveryPlanIncludes />
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
      aria-label="Billing cycle"
      className="relative inline-flex items-center bg-white border-[1.5px] border-[#666666] rounded-full p-1"
    >
      {(['monthly', 'yearly'] as BillingCycle[]).map(option => {
        const isActive = billing === option
        return (
          <button
            key={option}
            role="tab"
            aria-selected={isActive}
            onClick={() => setBilling(option)}
            className={`relative px-6 py-2 text-sm font-bold uppercase tracking-wider rounded-full transition-colors duration-300 capitalize ${
              isActive ? 'bg-uml-blue text-white' : 'text-gray-600 hover:text-black'
            }`}
          >
            {option}
            {option === 'yearly' && (
              <span
                className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-green-100 text-green-700'
              }`}
              >
                -25%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const PriceCounter = ({ value }: { value: number }) => {
  const count = useMotionValue(0)
  const rounded = useTransform(count, latest => Math.round(latest))

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [value, count])

  return <motion.span className="tabular-nums">{rounded}</motion.span>
}

const PlanCard = ({
  plan,
  index,
  billing,
  isExpanded,
  isAnyExpanded,
  onToggle,
}: {
  plan: Plan
  index: number
  billing: BillingCycle
  isExpanded: boolean
  isAnyExpanded: boolean
  onToggle: () => void
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
  const isBlurred = isAnyExpanded && !isExpanded
  const canBounce = isHovered && !isExpanded && !isBlurred

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{
        opacity: isBlurred ? (isHovered ? 0.6 : 0.2) : 1,
        filter: isBlurred ? (isHovered ? 'blur(3px)' : 'blur(8px)') : 'blur(0px)',
        flexGrow: isExpanded ? 2.4 : 1,
        scale: canBounce ? 1.025 : 1,
        y: canBounce ? -6 : 0,
        zIndex: isExpanded ? 10 : 1,
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onToggle}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        opacity: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
        filter: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        flexGrow: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        zIndex: { duration: 0.2 },
      }}
      className={`group relative cursor-pointer min-w-0 flex-1 rounded-[2rem] border-[1.5px] transition-colors duration-300 flex flex-col overflow-hidden ${
        plan.highlight
          ? 'border-uml-blue bg-blue-50/30 hover:bg-blue-50/50'
          : 'border-[#666666] bg-white hover:border-uml-blue'
      }`}
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
          {plan.highlight && (
            <span className="text-[10px] font-bold uppercase bg-uml-blue text-white px-2 py-1 rounded tracking-wider">
              Popular
            </span>
          )}
        </div>

        <div className="mb-4">
          {price === null ? (
            <>
              <div className="text-3xl md:text-4xl font-priego-extrabold text-black">Custom</div>
              <p className="text-xs text-gray-500 mt-1">Tailored to your team</p>
            </>
          ) : price === 0 ? (
            <>
              <div className="text-3xl md:text-4xl font-priego-extrabold text-black">Free</div>
              <p className="text-xs text-gray-500 mt-1">
                {plan.name === 'Education'
                  ? 'For accredited students & teachers'
                  : 'No credit card required'}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl md:text-4xl font-priego-extrabold text-black inline-flex items-baseline">
                  $<PriceCounter value={price} />
                </span>
                <span className="text-sm text-gray-500">/user/mo</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {billing === 'yearly' ? 'Billed annually' : 'Billed monthly'}
              </p>
            </>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{plan.description}</p>

        <ul className="space-y-2.5 mb-4 flex-grow">
          {plan.features.slice(0, isExpanded ? plan.features.length : 3).map(feature => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center">
                <Check size={10} className="text-uml-blue" strokeWidth={3} />
              </span>
              <span>{feature}</span>
            </li>
          ))}
          {!isExpanded && plan.features.length > 3 && (
            <li className="text-xs text-gray-400 pl-6 font-medium">
              +{plan.features.length - 3} more features
            </li>
          )}
        </ul>

        <div className="pt-4 border-t border-gray-100">
          {isExpanded ? (
            <button
              onClick={(e) => e.stopPropagation()}
              className={`w-full py-3 rounded-xl font-bold uppercase text-sm tracking-wider transition-colors duration-200 ${
                plan.highlight
                  ? 'bg-uml-blue text-white hover:bg-blue-700'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {plan.cta}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 group-hover:text-uml-blue transition-colors duration-300">
              <span>View details</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const EveryPlanIncludes = () => {
  return (
    <section id="every-plan-includes" className="py-20 px-4 md:px-8 border-t border-gray-200/60 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-priego-extrabold uppercase tracking-tight text-black mb-3">
            EVERY PLAN INCLUDES
          </h2>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Core infrastructure that ships with every account, starting from the free tier.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-10 max-w-5xl mx-auto">
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
                className="flex items-start gap-4"
              >
                <span className="shrink-0 w-12 h-12 rounded-full border-[1.5px] border-[#666666] flex items-center justify-center bg-white">
                  <Icon size={20} strokeWidth={1.5} className="text-black" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-black mb-1.5 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
