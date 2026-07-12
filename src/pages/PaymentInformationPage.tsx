import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Shield, Headphones, ArrowRight, CheckCircle, Scan } from 'lucide-react'
import apiClient from '../services/apiClient'
import { toast } from 'react-hot-toast'
import type { PlanResponse } from '../services/planService'

type PaymentMethod = 'payos'
type PaymentState = 'idle' | 'qr_shown' | 'paid'

const fmtVnd = (n: number) => n.toLocaleString('vi-VN')
const yearlyPerMonth = (p: PlanResponse): number | null =>
  p.yearlyBilling ? Math.round(p.price * (1 - (p.yearlyDiscount ?? 0) / 100)) : null
const fmtLimit = (v: number | null | undefined) =>
  v == null ? '' : v === -1 ? 'Không giới hạn' : fmtVnd(v)

function planBullets(p: PlanResponse): string[] {
  const b: string[] = []
  const L = p.limits
  if (L) {
    if (L.projects != null) b.push(L.projects === -1 ? 'Dự án không giới hạn' : `${fmtVnd(L.projects)} dự án`)
    if (L.diagrams != null) b.push(L.diagrams === -1 ? 'Sơ đồ không giới hạn' : `${fmtVnd(L.diagrams)} sơ đồ`)
    if (L.aiQueries != null) b.push(L.aiQueries === -1 ? 'Lượt AI không giới hạn' : `${fmtVnd(L.aiQueries)} lượt AI`)
    if (L.exportPdf != null) b.push(L.exportPdf === -1 ? 'Xuất PDF không giới hạn' : `${fmtVnd(L.exportPdf)} lần xuất PDF`)
    if (L.collaborators != null) b.push(L.collaborators === -1 ? 'Cộng tác viên không giới hạn' : `${fmtVnd(L.collaborators)} cộng tác viên`)
  }
  ;(p.features ?? []).filter(f => f.included).forEach(f => b.push(f.label))
  return b
}

const PaymentInformationPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const state = location.state as { plan: PlanResponse; billing: 'monthly' | 'yearly' } | null
  const plan = state?.plan
  const billing = state?.billing ?? 'monthly'
  const perMonthYearly = plan ? yearlyPerMonth(plan) : null
  const activePrice = billing === 'yearly' && perMonthYearly != null ? perMonthYearly : (plan?.price ?? 0)
  const planName = plan?.name ?? 'Pro'
  const bullets = plan ? planBullets(plan) : []
  const displayCycle = billing === 'yearly' ? 'Theo năm' : 'Theo tháng'

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('payos')
  const [loading, setLoading] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [orderCode, setOrderCode] = useState<number | null>(null)
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  const [paidPlanName, setPaidPlanName] = useState<string>('')

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (paymentState === 'qr_shown' && orderCode) {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await apiClient.get(`/payments/status/${orderCode}`)
          if (res.result?.status === 'PAID') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setPaidPlanName(res.result.planName || planName)
            setPaymentState('paid')
            toast.success('Thanh toán thành công!')
          }
        } catch {
          // Ignore polling errors silently
        }
      }, 3000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [paymentState, orderCode])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const planId = plan?.id ?? '33333333-3333-3333-3333-333333333333'
      const response = await apiClient.post('/payments/create', { planId });
      const checkoutUrl = response?.result?.checkoutUrl ?? response?.checkoutUrl;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error('Không lấy được link thanh toán, vui lòng thử lại.')
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tạo mã thanh toán')
    } finally {
      setLoading(false)
    }
  }

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (paymentState === 'paid') {
    return (
      <div className="bg-[#f8f9ff] text-[#0b1c30] flex flex-col min-h-screen items-center justify-center"
        style={{
          backgroundSize: '24px 24px',
          backgroundImage:
            'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
        }}
      >
        <div className="bg-white border border-[#c3c6d7] rounded-xl p-14 max-w-lg w-full text-center shadow-sm">
          <div className="flex items-center justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-green-50 border-4 border-green-400 flex items-center justify-center animate-[bounce_0.6s_ease-out]">
              <CheckCircle className="text-green-500" size={48} strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-[36px] font-bold leading-[1.2] mb-3 text-[#0b1c30]">
            Thanh toán thành công!
          </h1>
          <p className="text-[16px] text-[#434655] leading-[24px] mb-2">
            Gói <span className="font-semibold text-[#0b1c30]">{paidPlanName}</span> đã được kích
            hoạt cho tài khoản của bạn.
          </p>
          <p className="text-[14px] text-[#737686] mb-10">
            Mã đơn hàng: <span className="font-mono font-bold text-[#0b1c30]">{orderCode}</span>
          </p>

          <div className="border-t border-[#c3c6d7] pt-8 space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[16px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 rounded-lg"
            >
              Đến bảng điều khiển
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 border border-[#c3c6d7] text-[#434655] hover:border-[#0b1c30] hover:text-[#0b1c30] text-[16px] font-medium transition-all rounded-lg"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN PAGE ─────────────────────────────────────────────────────────────
  return (
    <div
      className="bg-[#f8f9ff] text-[#0b1c30] flex flex-col min-h-screen"
      style={{
        backgroundSize: '24px 24px',
        backgroundImage:
          'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
      }}
    >
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-16 pt-32 pb-16">
        <div className="mb-12">
          <h1 className="text-[48px] font-bold leading-[1.2] tracking-[-0.02em] uppercase mb-2">
            Nâng cấp gói dịch vụ
          </h1>
          <p className="text-[18px] leading-[28px] text-[#434655]">
            Sẵn sàng kiến tạo hệ thống chuẩn chuyên gia cùng DiaUML Studio.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-start">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Step 1: Selected Plan */}
            <section className="bg-white border border-[#c3c6d7] rounded-xl p-8">
              <div className="flex justify-between items-start gap-6 flex-wrap">
                <div>
                  <span className="text-[12px] font-semibold text-[#2563eb] uppercase tracking-widest block mb-1">
                    Gói dịch vụ đã chọn
                  </span>
                  <h2 className="text-[30px] font-bold leading-[1.3] mb-3">
                    {planName.toUpperCase()} <span className="text-[#434655] font-normal">PLAN</span>
                  </h2>
                  <ul className="space-y-2 mb-4">
                    {bullets.slice(0, 5).map((bullet, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-[15px] text-[#434655]">
                        <span className="w-[6px] h-[6px] rounded-full bg-[#2563eb] shrink-0" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-[14px] text-[#2563eb] underline hover:text-[#1d4ed8] font-medium transition-colors"
                  >
                    ⟵ Thay đổi gói cước
                  </button>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[32px] font-extrabold leading-[1.2] text-[#0b1c30]">
                    {fmtVnd(activePrice)} đ
                  </div>
                  <div className="text-[14px] text-[#434655]">/{billing === 'yearly' ? 'năm' : 'tháng'}</div>
                </div>
              </div>
            </section>

            {qrCodeData ? (
              /* QR Code Section */
              <section className="bg-white border border-[#c3c6d7] rounded-xl p-10 text-center flex flex-col items-center">
                <h3 className="text-[24px] font-bold leading-[1.3] mb-3 text-[#2563eb]">
                  Quét mã để thanh toán
                </h3>
                <p className="text-[15px] text-[#434655] max-w-[420px] mb-6 leading-relaxed">
                  Sử dụng ứng dụng ngân hàng hoặc ví điện tử để quét mã VietQR bên dưới.
                  Hệ thống sẽ tự động cập nhật gói cước của bạn sau khi thanh toán thành công.
                </p>
                <div className="p-4 border-2 border-dashed border-[#2563eb] rounded-xl inline-block bg-white shadow-lg">
                  <QRCodeSVG value={qrCodeData} size={250} level="H" includeMargin={true} />
                </div>
                <div className="mt-6 bg-[#eff6ff] p-4 rounded-lg w-full max-w-md">
                  <div className="flex justify-between text-[14px] py-1">
                    <span className="text-[#434655] font-medium">Mã đơn hàng:</span>
                    <span className="font-bold text-[#0b1c30]">{orderCode}</span>
                  </div>
                  <div className="flex justify-between text-[14px] py-1">
                    <span className="text-[#434655] font-medium">Số tiền:</span>
                    <span className="font-bold text-[#2563eb]">{fmtVnd(activePrice)} đ</span>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[14px] text-[#2563eb] font-semibold animate-pulse">
                    Đang chờ xác nhận thanh toán...
                  </span>
                </div>
              </section>
            ) : (
              /* Step 2: Payment Method */
              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-widest text-[#434655] mb-4">
                  Phương thức thanh toán
                </h3>
                <label
                  className={`relative flex items-center gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${selectedMethod === 'payos'
                      ? 'border-[#2563eb] bg-[#eff6ff]'
                      : 'border-[#c3c6d7] bg-white hover:border-blue-300'
                    }`}
                  onClick={() => setSelectedMethod('payos')}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="payos"
                    checked={selectedMethod === 'payos'}
                    onChange={() => setSelectedMethod('payos')}
                    className="sr-only"
                  />
                  <div
                    className={`absolute top-3 right-3 transition-opacity ${selectedMethod === 'payos' ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <CheckCircle className="text-[#2563eb]" size={22} fill="#2563eb" color="white" />
                  </div>
                  <div className="w-9 h-9 bg-[#0b1c30] rounded-lg flex items-center justify-center shrink-0">
                    <Scan className="text-white" size={22} strokeWidth={2} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-[16px] font-semibold ${selectedMethod === 'payos' ? 'text-[#0b1c30]' : 'text-[#434655]'}`}>
                      PayOS (VietQR)
                    </span>
                    <span className="text-[12px] text-[#737686] mt-0.5">
                      Quét mã QR bằng ứng dụng ngân hàng
                    </span>
                  </div>
                </label>
              </section>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <aside className="lg:sticky lg:top-32">
            <div className="bg-white border border-[#c3c6d7] rounded-xl p-8">
              <h3 className="text-[24px] font-bold leading-[1.3] mb-6">
                Tóm tắt đơn hàng
              </h3>

              <div className="space-y-1 mb-6">
                <div className="flex justify-between items-center py-2 text-[15px]">
                  <span className="text-[#434655]">Tạm tính</span>
                  <span className="font-mono font-semibold text-right">{fmtVnd(activePrice)} đ</span>
                </div>
                <div className="flex justify-between items-center py-2 text-[15px]">
                  <span className="text-[#434655]">Thuế (0%)</span>
                  <span className="font-mono font-semibold text-right">0 đ</span>
                </div>
                <div className="flex justify-between items-center py-2 text-[15px]">
                  <span className="text-[#434655]">Chu kì thanh toán</span>
                  <span className="font-medium text-[#0b1c30]">{displayCycle}</span>
                </div>
              </div>

              <hr className="border-t border-[#c3c6d7] my-3" />

              <div className="flex justify-between items-center py-3 mb-6">
                <span className="text-[20px] font-bold">Tổng cộng</span>
                <span className="font-mono text-[24px] font-extrabold text-[#2563eb]">
                  {fmtVnd(activePrice)} đ
                </span>
              </div>

              {!qrCodeData && (
                <>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`w-full py-4 text-[18px] font-bold rounded-lg transition-all flex items-center justify-center gap-2.5 ${loading
                        ? 'bg-[#93c5fd] cursor-not-allowed text-white'
                        : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white hover:shadow-[0_8px_32px_rgba(37,99,235,0.35)] active:scale-[0.98] hover:-translate-y-px'
                      }`}
                  >
                    {loading ? 'Đang tạo mã...' : 'Thanh Toán Ngay'}
                    {!loading && <ArrowRight size={20} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1" />}
                  </button>
                  <p className="text-[12px] text-[#737686] text-center mt-4 leading-relaxed">
                    Bằng việc hoàn tất thanh toán, bạn đồng ý với <a href="#" className="text-[#2563eb] underline">Điều khoản dịch vụ</a> và <a href="#" className="text-[#2563eb] underline">Chính sách bảo mật</a>.
                  </p>
                </>
              )}

              <div className="mt-6 pt-6 border-t border-[#c3c6d7] space-y-3.5">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-[#737686] shrink-0" strokeWidth={1.5} />
                  <span className="text-[13px] font-medium text-[#737686]">
                    Mã hoá AES-256 — Bảo mật tuyệt đối
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Headphones size={18} className="text-[#737686] shrink-0" strokeWidth={1.5} />
                  <span className="text-[13px] font-medium text-[#737686]">
                    Hỗ trợ kỹ thuật 24/7
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default PaymentInformationPage
