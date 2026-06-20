import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  User as UserIcon,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { authService } from '../services/authService'
import { useAuthStore } from '../stores/useAuthStore'

// Shared input styling, matching AuthModal's design system.
const INPUT_CLASS =
  'w-full h-[54px] pl-12 pr-4 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400 disabled:opacity-50'

const today = new Date().toISOString().split('T')[0]

// VN phone: starts with 0, 10–11 digits total.
const PHONE_REGEX = /^0\d{9,10}$/

type PasswordCriterion = { label: string; met: boolean }

const evaluatePassword = (pw: string): { score: number; criteria: PasswordCriterion[] } => {
  const criteria: PasswordCriterion[] = [
    { label: 'At least 8 characters', met: pw.length >= 8 },
    { label: 'An uppercase letter (A–Z)', met: /[A-Z]/.test(pw) },
    { label: 'A lowercase letter (a–z)', met: /[a-z]/.test(pw) },
    { label: 'A number (0–9)', met: /\d/.test(pw) },
    { label: 'A special character', met: /[^A-Za-z0-9]/.test(pw) },
  ]
  return { score: criteria.filter((c) => c.met).length, criteria }
}

// 0–2 → Weak, 3–4 → Medium, 5 → Strong
const strengthMeta = (score: number) => {
  if (score >= 5) return { label: 'Strong', color: '#16a34a', bars: 3 }
  if (score >= 3) return { label: 'Medium', color: '#d97706', bars: 2 }
  return { label: 'Weak', color: '#dc2626', bars: 1 }
}

const STEPS = [
  { id: 1, title: 'Personal Info' },
  { id: 2, title: 'Set Password' },
]

const OnboardingPage = () => {
  const navigate = useNavigate()
  const { user, setAuth } = useAuthStore()

  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')

  // Step 2
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // --- Validation ---
  const phoneValid = PHONE_REGEX.test(phone)
  const dobValid = !!dob && dob < today
  const step1Valid = fullName.trim().length > 0 && phoneValid && dobValid

  const { score, criteria } = useMemo(() => evaluatePassword(password), [password])
  const meta = strengthMeta(score)
  const passwordsMatch = password.length > 0 && password === confirmPassword
  // Enable "Save" only at ≥ Medium strength AND length ≥ 8 (matches the server rule).
  const step2Valid = passwordsMatch && score >= 3 && password.length >= 8

  const goNext = () => {
    if (step1Valid) setCurrentStep(2)
  }

  const handleSubmit = async () => {
    if (!step2Valid) return
    setSubmitting(true)
    try {
      const res = await authService.completeProfile({
        fullName: fullName.trim(),
        phone,
        dob,
        password,
        confirmPassword,
      })
      // Mark onboarding done in the store so the route guard lets the user through.
      setAuth({ ...(user as any), ...res.result, profileCompleted: true })
      toast.success('Your information has been saved. A confirmation email has been sent.')
      navigate('/dashboard', { replace: true })
    } catch (e: any) {
      toast.error(e?.message || 'Could not complete your profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 font-priego">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[480px] bg-white rounded-[32px] shadow-2xl px-8 py-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-uml-blue/10 text-uml-blue mb-4">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-[26px] font-black tracking-tight text-black leading-tight">
            Complete your profile
          </h1>
          <p className="mt-2 text-[14px] text-gray-500 font-medium">
            Just a few steps to start using DiaUML Studio.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-9">
          {STEPS.map((s, idx) => {
            const done = currentStep > s.id
            const active = currentStep === s.id
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                      done
                        ? 'bg-uml-blue border-uml-blue text-white'
                        : active
                        ? 'bg-white border-uml-blue text-uml-blue'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {done ? <Check size={18} /> : s.id}
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-bold uppercase tracking-wide text-center ${
                      active ? 'text-uml-blue' : done ? 'text-black' : 'text-gray-400'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-16 sm:w-20 h-[3px] mx-2 mb-6 rounded-full transition-colors ${
                      currentStep > s.id ? 'bg-uml-blue' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <Field label="Full Name" icon={<UserIcon size={20} strokeWidth={1.5} />}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={255}
                  placeholder="e.g. John Doe"
                  className={INPUT_CLASS}
                />
              </Field>

              <Field
                label="Phone Number"
                icon={<Phone size={20} strokeWidth={1.5} />}
                error={phone.length > 0 && !phoneValid ? 'Invalid phone number (10–11 digits, starting with 0)' : undefined}
              >
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="e.g. 0901234567"
                  className={INPUT_CLASS}
                />
              </Field>

              <Field
                label="Date of Birth"
                icon={<Calendar size={20} strokeWidth={1.5} />}
                error={dob.length > 0 && !dobValid ? 'Date of birth must be in the past' : undefined}
              >
                <input
                  type="date"
                  value={dob}
                  max={today}
                  onChange={(e) => setDob(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>

              <button
                type="button"
                onClick={goNext}
                disabled={!step1Valid}
                className="w-full h-[54px] bg-uml-blue text-white font-bold text-[16px] rounded-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                Continue <ArrowRight size={18} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <Field label="Password" icon={<Lock size={20} strokeWidth={1.5} />}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className={`${INPUT_CLASS} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                </button>
              </Field>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="-mt-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    {[1, 2, 3].map((seg) => (
                      <div
                        key={seg}
                        className="h-1.5 flex-1 rounded-full transition-colors"
                        style={{ backgroundColor: seg <= meta.bars ? meta.color : '#e5e7eb' }}
                      />
                    ))}
                    <span className="text-[12px] font-bold ml-1" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 gap-1">
                    {criteria.map((c) => (
                      <li
                        key={c.label}
                        className={`flex items-center gap-1.5 text-[12px] font-medium ${
                          c.met ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            c.met ? 'bg-emerald-100' : 'bg-gray-100'
                          }`}
                        >
                          <Check size={11} strokeWidth={3} className={c.met ? 'opacity-100' : 'opacity-0'} />
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Field
                label="Confirm Password"
                icon={<Lock size={20} strokeWidth={1.5} />}
                error={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
              >
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className={`${INPUT_CLASS} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                </button>
              </Field>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={submitting}
                  className="h-[54px] px-5 border-[1.5px] border-black/80 rounded-[14px] font-bold text-[15px] text-black hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowLeft size={18} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!step2Valid || submitting}
                  className="flex-1 h-[54px] bg-uml-blue text-white font-bold text-[16px] rounded-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

const Field = ({
  label,
  icon,
  error,
  children,
}: {
  label: string
  icon: React.ReactNode
  error?: string
  children: React.ReactNode
}) => (
  <div className="space-y-2">
    <label className="text-[15px] font-bold text-black block ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
        {icon}
      </div>
      {children}
    </div>
    {error && <p className="text-[13px] text-red-500 font-medium ml-1">{error}</p>}
  </div>
)

export default OnboardingPage
