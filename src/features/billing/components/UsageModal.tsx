import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, AlertTriangle, RotateCcw, Sparkles } from 'lucide-react'
import toast from '../../../shared/lib/toast'
import { subscriptionService } from '../api/subscriptionApi'
import { getMyQuota, type QuotaInfo } from '../api/quotaApi'
import type { MySubscription } from '../types/payment'
import { getErrorMessage } from '../../../shared/lib/errorMessage'
import { Skeleton, SkeletonText } from '../../../shared/ui/Skeleton'
import { useAuthStore } from '../../../features/auth/model/useAuthStore'

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'

interface UsageModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal "Thông tin sử dụng" mở từ Sidebar (không đổi URL).
 * Nạp GET /me/subscription + GET /me/quota. result subscription = null → user Free.
 */
const UsageModal = ({ isOpen, onClose }: UsageModalProps) => {
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState<MySubscription | null>(null)
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [acting, setActing] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const load = useCallback(() => {
    setConfirmingCancel(false)
    setLoading(true)
    Promise.all([
      subscriptionService.getMySubscription().catch(() => null),
      getMyQuota().catch(() => null),
    ])
      .then(([s, q]) => {
        setSub(s)
        setQuota(q)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  const handleCancel = async () => {
    setActing(true)
    try {
      const updated = await subscriptionService.cancel()
      setSub(updated)
      setConfirmingCancel(false)
      useAuthStore.getState().refreshUser()
      toast.success('Đã hủy gói. Bạn vẫn dùng được tới hết kỳ hiện tại.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setActing(false)
    }
  }

  const handleReactivate = async () => {
    setActing(true)
    try {
      const updated = await subscriptionService.reactivate()
      setSub(updated)
      useAuthStore.getState().refreshUser()
      toast.success('Đã hoàn tác. Gói sẽ tiếp tục gia hạn.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setActing(false)
    }
  }

  const isFree = !sub
  const isCancelling = !!sub?.cancelAtPeriodEnd
  const planLabel = isFree ? 'Free Plan' : sub!.planName

  // Quota progress (–1 = không giới hạn)
  const limit = quota?.limit ?? 0
  const used = quota?.used ?? 0
  const unlimited = limit === -1
  const pct = unlimited || limit <= 0 ? 0 : Math.min((used / limit) * 100, 100)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-black tracking-tight">Thông tin sử dụng</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-black transition-colors rounded-lg p-1 hover:bg-gray-100"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {loading ? (
                <div aria-hidden className="space-y-5 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-7 w-32" />
                    </div>
                    <Skeleton className="h-16 w-16 rounded-xl" />
                  </div>
                  <div className="space-y-2.5 border-t border-gray-100 pt-4">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-full" />
                    <Skeleton className="h-2.5 w-5/6" />
                  </div>
                  <SkeletonText lines={2} />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Gói + trạng thái */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">Gói hiện tại</p>
                      <p className="text-xl font-priego-extrabold text-black flex items-center gap-2">
                        {planLabel}
                        {!isFree && <Sparkles size={16} className="text-uml-blue" />}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                        isFree
                          ? 'bg-gray-100 text-gray-500'
                          : isCancelling
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {isFree ? 'Miễn phí' : isCancelling ? 'Đã hủy · còn hạn' : 'Đang hoạt động'}
                    </span>
                  </div>

                  {/* Chu kỳ (chỉ gói trả phí) */}
                  {!isFree && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Chu kỳ</span>
                      <span className="font-semibold text-gray-800">
                        {fmtDate(sub!.startDate)} — {fmtDate(sub!.endDate)}
                      </span>
                    </div>
                  )}

                  {/* Quota progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-500">Hạn mức AI đã dùng</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-uml-blue'
                        }`}
                        style={{ width: unlimited ? '8%' : `${pct}%` }}
                      />
                    </div>
                    {quota?.resetAt && (
                      <p className="text-[11px] text-gray-400 mt-1.5">Làm mới vào {fmtDate(quota.resetAt)}</p>
                    )}
                  </div>

                  {/* Banner đã hủy còn hạn */}
                  {isCancelling && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-amber-800 leading-relaxed">
                        Dùng <strong>{planLabel}</strong> tới <strong>{fmtDate(sub!.endDate)}</strong>, sau đó về Free.
                      </p>
                    </div>
                  )}

                  {/* Free state */}
                  {isFree && (
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      Bạn đang dùng gói miễn phí. Nâng cấp để tăng hạn mức và mở khóa thêm tính năng.
                    </p>
                  )}

                  {/* Nút hành động */}
                  <div className="pt-1">
                    {isFree ? null : isCancelling ? (
                      <button
                        onClick={handleReactivate}
                        disabled={acting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border-2 border-uml-blue text-uml-blue hover:bg-blue-50 transition-colors disabled:opacity-60"
                      >
                        {acting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                        Hoàn tác hủy
                      </button>
                    ) : confirmingCancel ? (
                      <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5">
                        <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
                          Hủy gói <strong>{planLabel}</strong>? Bạn vẫn dùng tới <strong>{fmtDate(sub!.endDate)}</strong>, sau đó về Free.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmingCancel(false)}
                            disabled={acting}
                            className="flex-1 py-2 rounded-lg font-bold text-sm border-2 border-gray-300 text-gray-600 hover:bg-white transition-colors disabled:opacity-60"
                          >
                            Không
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={acting}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                          >
                            {acting ? <Loader2 size={16} className="animate-spin" /> : null}
                            Xác nhận hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingCancel(true)}
                        disabled={acting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border-2 border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        Hủy gói
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default UsageModal
