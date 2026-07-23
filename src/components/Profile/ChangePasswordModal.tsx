import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  Loader2,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { authService } from '../../features/auth/api/authApi'
import { useOtpCountdown } from '../../shared/hooks/useOtpCountdown'
import { usePasswordStrength } from '../../shared/hooks/usePasswordStrength'

// OTP lifetime in seconds — must match the backend Redis TTL (otp.ttl-seconds = 90).
const OTP_TTL_SECONDS = 90

// Shared input styling, matching OnboardingPage / AuthModal design system.
const INPUT_CLASS =
  'w-full h-[54px] pl-12 pr-4 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400 disabled:opacity-50'

type Step = 'current' | 'otp' | 'new'

const STEPS: { id: Step; title: string }[] = [
  { id: 'current', title: 'Xác minh' },
  { id: 'otp', title: 'OTP' },
  { id: 'new', title: 'Mật khẩu mới' },
]

interface ChangePasswordModalProps {
  email: string
  onClose: () => void
  onSuccess?: () => void
}

const ChangePasswordModal = ({ email, onClose, onSuccess }: ChangePasswordModalProps) => {
  const [step, setStep] = useState<Step>('current')
  const [submitting, setSubmitting] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { secondsLeft, start: startOtpCountdown } = useOtpCountdown()
  const { score, criteria, meta } = usePasswordStrength(newPassword)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword
  const newPasswordValid = passwordsMatch && score >= 3 && newPassword.length >= 8

  const apiError = (e: any, fallback: string) => toast.error(e?.message || fallback)

  // Step 1 — verify current password & send OTP
  const handleSendOtp = async () => {
    if (!currentPassword) return
    setSubmitting(true)
    try {
      await authService.initChangePassword({ currentPassword })
      setStep('otp')
      setOtpCode('')
      startOtpCountdown(OTP_TTL_SECONDS)
      toast.success('Mã OTP xác minh đã được gửi tới email của bạn')
    } catch (e) {
      apiError(e, 'Không thể xác minh mật khẩu hiện tại')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2 — verify OTP (does not consume it; the server re-checks on confirm)
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return
    setSubmitting(true)
    try {
      await authService.verifyOtp({ email, otpCode })
      setStep('new')
      toast.success('Xác minh OTP thành công — đặt mật khẩu mới')
    } catch (e) {
      apiError(e, 'Mã OTP không hợp lệ hoặc đã hết hạn')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    if (secondsLeft > 0 || submitting) return
    setSubmitting(true)
    try {
      await authService.initChangePassword({ currentPassword })
      setOtpCode('')
      startOtpCountdown(OTP_TTL_SECONDS)
      toast.success('Mã OTP mới đã được gửi tới email của bạn')
    } catch (e) {
      apiError(e, 'Không thể gửi lại OTP')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 3 — confirm new password
  const handleConfirm = async () => {
    if (!newPasswordValid) return
    setSubmitting(true)
    try {
      await authService.confirmChangePassword({ otpCode, newPassword, confirmPassword })
      toast.success('Đổi mật khẩu thành công')
      onSuccess?.()
      onClose()
    } catch (e) {
      apiError(e, 'Không thể đổi mật khẩu')
    } finally {
      setSubmitting(false)
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-2xl px-7 py-7 font-priego"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-black transition"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-uml-blue/10 text-uml-blue mb-3">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-[22px] font-black tracking-tight text-black leading-tight">Đổi mật khẩu</h2>
            <p className="mt-1.5 text-[13px] text-gray-500 font-medium">
              {step === 'current' && 'Xác nhận mật khẩu hiện tại để tiếp tục.'}
              {step === 'otp' && (
                <>
                  Nhập mã 6 chữ số đã gửi tới <span className="font-bold text-gray-700">{email}</span>
                </>
              )}
              {step === 'new' && 'Chọn một mật khẩu mới đủ mạnh.'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center mb-7">
            {STEPS.map((s, idx) => {
              const done = stepIndex > idx
              const active = stepIndex === idx
              return (
                <div key={s.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-colors ${
                      done
                        ? 'bg-uml-blue border-uml-blue text-white'
                        : active
                        ? 'bg-white border-uml-blue text-uml-blue'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {done ? <Check size={15} /> : idx + 1}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-10 sm:w-14 h-[3px] mx-1.5 rounded-full transition-colors ${
                        stepIndex > idx ? 'bg-uml-blue' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1 — current password */}
            {step === 'current' && (
              <motion.div
                key="current"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <Field label="Mật khẩu hiện tại" icon={<Lock size={20} strokeWidth={1.5} />}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    autoFocus
                    className={`${INPUT_CLASS} pr-12`}
                  />
                  <EyeToggle shown={showCurrent} onClick={() => setShowCurrent((v) => !v)} />
                </Field>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={!currentPassword || submitting}
                  className="w-full h-[54px] bg-uml-blue text-white font-bold text-[16px] rounded-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : <>Gửi OTP <ArrowRight size={18} /></>}
                </button>
              </motion.div>
            )}

            {/* STEP 2 — OTP */}
            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <Field label="Mã xác minh" icon={<KeyRound size={20} strokeWidth={1.5} />}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                    placeholder="000000"
                    autoFocus
                    className={`${INPUT_CLASS} tracking-[0.5em] font-bold text-center !pl-12`}
                  />
                </Field>

                <div className="flex items-center justify-between text-[13px] -mt-1">
                  <span className="text-gray-500 font-medium">
                    {secondsLeft > 0 ? (
                      <>
                        Mã hết hạn sau <span className="font-bold text-gray-700">{secondsLeft}s</span>
                      </>
                    ) : (
                      'Mã đã hết hạn'
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={secondsLeft > 0 || submitting}
                    className="font-bold text-uml-blue hover:underline disabled:text-gray-300 disabled:no-underline transition"
                  >
                    Gửi lại mã
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('current')}
                    disabled={submitting}
                    className="h-[54px] px-5 border-[1.5px] border-black/80 rounded-[14px] font-bold text-[15px] text-black hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ArrowLeft size={18} /> Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpCode.length !== 6 || submitting}
                    className="flex-1 h-[54px] bg-uml-blue text-white font-bold text-[16px] rounded-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {submitting ? <Loader2 size={20} className="animate-spin" /> : <>Xác minh <ArrowRight size={18} /></>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — new password */}
            {step === 'new' && (
              <motion.div
                key="new"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <Field label="Mật khẩu mới" icon={<Lock size={20} strokeWidth={1.5} />}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    autoFocus
                    className={`${INPUT_CLASS} pr-12`}
                  />
                  <EyeToggle shown={showNew} onClick={() => setShowNew((v) => !v)} />
                </Field>

                {/* Strength meter */}
                {newPassword.length > 0 && (
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
                  label="Xác nhận mật khẩu mới"
                  icon={<Lock size={20} strokeWidth={1.5} />}
                  error={confirmPassword.length > 0 && !passwordsMatch ? 'Mật khẩu không khớp' : undefined}
                >
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className={`${INPUT_CLASS} pr-12`}
                  />
                  <EyeToggle shown={showConfirm} onClick={() => setShowConfirm((v) => !v)} />
                </Field>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!newPasswordValid || submitting}
                  className="w-full h-[54px] bg-uml-blue text-white font-bold text-[16px] rounded-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Đổi mật khẩu'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

const EyeToggle = ({ shown, onClick }: { shown: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black transition-colors"
    aria-label={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
  >
    {shown ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
  </button>
)

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
    <label className="text-[14px] font-bold text-black block ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
        {icon}
      </div>
      {children}
    </div>
    {error && <p className="text-[13px] text-red-500 font-medium ml-1">{error}</p>}
  </div>
)

export default ChangePasswordModal
