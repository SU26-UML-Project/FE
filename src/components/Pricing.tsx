import { useState, useEffect } from 'react'
import { motion, animate, useMotionValue, useTransform } from 'framer-motion'
import { Check, ArrowRight, ArrowDown, Activity, RefreshCw, HardDrive, Globe, X, ChevronDown } from 'lucide-react'

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
      'All UML diagram types',
      'Real-time collaboration up to 4 members',
      'PNG export',
      'Community forum support',
    ],
    cta: 'Get started free',
  },
  {
    name: 'Education',
    monthlyPrice: 3,
    yearlyPrice: 3,
    description: 'For students and accredited educators around the world.',
    features: [
      'Unlimited diagrams',
      'All UML diagram types',
      'Real-time collaboration up to 4 members',
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
      'Real-time collaboration',
      'Version history & branches',
      'Custom shape libraries',
      'Priority support',
      'Advanced team permissions',
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
    description: 'Highly reliable infrastructure with automatic failover and multi-region redundancy for maximum availability.',
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
    title: 'Desktop apps',
    description: 'Native apps for macOS, Windows, and Linux. Browser version runs in Chrome, Firefox, Safari, Edge.',
  },
]

interface ComparisonRow {
  feature: string
  free: string | boolean
  education: string | boolean
  pro: string | boolean
  enterprise: string | boolean
}

const comparisonData: ComparisonRow[] = [
  { feature: 'Active diagrams', free: 'Up to 3', education: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'UML diagram types', free: 'All', education: 'All', pro: 'All', enterprise: 'All' },
  { feature: 'Export formats', free: 'PNG', education: 'PNG, SVG, PDF', pro: 'PNG, SVG, PDF, VDX', enterprise: 'All formats' },
  { feature: 'Real-time collaboration', free: 'Up to 4 members', education: 'Up to 4 members', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Version history & branches', free: false, education: false, pro: true, enterprise: true },
  { feature: 'Custom shape libraries', free: false, education: false, pro: true, enterprise: true },
  { feature: 'Priority support', free: false, education: 'Email', pro: 'Chat & email', enterprise: '24/7 premium' },
  { feature: 'Team permissions', free: false, education: false, pro: 'Advanced', enterprise: 'Advanced' },
  { feature: 'SSO & SAML', free: false, education: false, pro: false, enterprise: true },
  { feature: 'Dedicated success manager', free: false, education: false, pro: false, enterprise: true },
  { feature: 'Custom API & integrations', free: false, education: false, pro: false, enterprise: true },
  { feature: 'On-premise deployment', free: false, education: false, pro: false, enterprise: true },
]

const faqData = [
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period. No questions asked.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and bank transfers for annual Enterprise plans.',
  },
  {
    question: 'Is there a free trial for Pro?',
    answer: 'Yes, we offer a 14-day free trial of the Pro plan with no credit card required. You get full access to all Pro features during the trial.',
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we prorate any differences in billing.',
  },
  {
    question: 'How does Education verification work?',
    answer: 'Simply sign up with your .edu email address and we will automatically verify your student or educator status within minutes.',
  },
]

const Pricing = () => {
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  useEffect(() => {
    const collapse = () => setExpandedIndex(null)
    document.addEventListener('click', collapse)
    return () => document.removeEventListener('click', collapse)
  }, [])

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
      <FeatureComparison />
      <FAQSection />
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
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
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
              +{plan.features.length - 3} more {plan.features.length - 3 === 1 ? 'feature' : 'features'}
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
                className="group flex items-start gap-4"
              >
                <span className="shrink-0 w-12 h-12 rounded-full border-[1.5px] border-[#666666] flex items-center justify-center bg-white transition-all duration-300 group-hover:border-uml-blue group-hover:shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                  <Icon size={20} strokeWidth={1.5} className="text-black transition-colors duration-300 group-hover:text-uml-blue" />
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

const FeatureComparison = () => {
  const tiers = ['free', 'education', 'pro', 'enterprise'] as const
  const planNames = ['Free', 'Education', 'Pro', 'Enterprise']

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
    <section className="py-20 px-4 md:px-8 border-t border-gray-200/60">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-priego-extrabold uppercase tracking-tight text-black mb-3">
            DETAILED FEATURE COMPARISON
          </h2>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            See exactly what each plan includes to find the right fit for your team.
          </p>
        </motion.div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.08),0_4px_6px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-300">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 w-[28%]">
                  Feature
                </th>
                {planNames.map(name => (
                  <th
                    key={name}
                    className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-center border-b border-gray-200 ${
                      name === 'Pro' ? 'text-uml-blue' : 'text-gray-400'
                    }`}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, idx) => (
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
                  <td className="px-6 py-3.5 text-sm font-semibold text-gray-800 border-b border-gray-100/80">
                    {row.feature}
                  </td>
                  {tiers.map(tier => (
                    <td
                      key={tier}
                      className="px-6 py-3.5 text-center align-middle border-b border-gray-100/80"
                    >
                      {renderCell(row[tier])}
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
    <section className="py-20 px-4 md:px-8 border-t border-gray-200/60">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-priego-extrabold uppercase tracking-tight text-black mb-3">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Everything you need to know before getting started.
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqData.map((item, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="border border-gray-200 rounded-xl overflow-hidden bg-white"
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
