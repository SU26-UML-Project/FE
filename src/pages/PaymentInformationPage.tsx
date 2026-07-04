import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import apiClient from '../services/apiClient'
import { toast } from 'react-hot-toast'

type PaymentMethod = 'payos' | 'credit_card' | 'paypal'
type PaymentState = 'idle' | 'qr_shown' | 'paid'

const PaymentInformationPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const { planName, price, billingCycle, description } = location.state || {
    planName: 'Pro',
    price: 12,
    billingCycle: 'monthly',
    description: 'For professional engineers, freelancers, and small product teams.',
  }

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('payos')
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [saveCard, setSaveCard] = useState(false)
  const [loading, setLoading] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [orderCode, setOrderCode] = useState<number | null>(null)
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  const [paidPlanName, setPaidPlanName] = useState<string>('')

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Polling logic: check payment status every 3s when QR is shown
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
      const planId = planName.toLowerCase().includes('education') ? '22222222-2222-2222-2222-222222222222'
        : planName.toLowerCase().includes('enterprise') ? '44444444-4444-4444-4444-444444444444'
          : '33333333-3333-3333-3333-333333333333';

      const response = await apiClient.post('/payments/create', { planId });
      console.log('[Payment] API response:', response);

      const checkoutUrl = response?.result?.checkoutUrl ?? response?.checkoutUrl;
      console.log('[Payment] checkoutUrl:', checkoutUrl);

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error('Không lấy được link thanh toán, vui lòng thử lại.')
      }
    } catch (error: any) {
      console.error('[Payment] Error:', error);
      toast.error(error.message || 'Lỗi khi tạo mã thanh toán')
    } finally {
      setLoading(false)
    }
  }

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (paymentState === 'paid') {
    return (
      <div
        className="bg-[#f8f9ff] text-[#0b1c30] flex flex-col min-h-screen items-center justify-center"
        style={{
          backgroundSize: '24px 24px',
          backgroundImage:
            'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
        }}
      >
        <div className="bg-white border border-[#c3c6d7] p-14 max-w-lg w-full text-center shadow-sm">
          {/* Animated checkmark */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-green-50 border-4 border-green-400 flex items-center justify-center animate-[bounce_0.6s_ease-out]">
              <span
                className="material-symbols-outlined text-green-500"
                style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
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
              className="w-full py-3 bg-[#2563eb] hover:bg-[#004ac6] text-white text-[16px] font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 rounded-sm"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              Đến Dashboard
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 border border-[#c3c6d7] text-[#434655] hover:border-[#0b1c30] hover:text-[#0b1c30] text-[16px] font-medium transition-all rounded-sm"
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
      {/* TopNavBar */}
      <header
        className="sticky top-0 z-50 border-b border-[#c3c6d7]"
        style={{ backgroundColor: 'rgba(248,249,255,0.8)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex justify-between items-center w-full max-w-[1280px] mx-auto px-16 py-4">
          <div className="font-bold text-[30px] leading-[1.3] text-[#0b1c30]">DiaUML Studio</div>
          <nav className="hidden md:flex items-center gap-8">
            {['Dashboard', 'Features', 'Templates', 'Pricing', 'Documentation'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-[14px] font-medium text-[#434655] hover:text-[#0b1c30] transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button className="px-6 py-2 text-[14px] font-bold border border-[#0b1c30] text-[#0b1c30] hover:bg-[#e5eeff] transition-colors rounded-sm">
              Login
            </button>
            <button className="px-6 py-2 text-[14px] font-bold bg-[#2563eb] text-[#eeefff] hover:opacity-90 transition-opacity rounded-sm">
              Get started free
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-16 py-16">
        <div className="mb-12">
          <h1 className="text-[48px] font-bold leading-[1.2] tracking-[-0.02em] uppercase mb-2">
            Upgrade your plan
          </h1>
          <p className="text-[18px] leading-[28px] text-[#434655]">
            Complete your purchase to unlock advanced UML modeling features.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Selected Plan Card */}
            <section className="bg-white border border-[#c3c6d7] p-8 flex justify-between items-center">
              <div>
                <span className="text-[14px] font-medium text-[#004ac6] uppercase tracking-widest block mb-1">
                  Selected Plan
                </span>
                <h2 className="text-[30px] font-semibold leading-[1.3]">{planName} Plan</h2>
                <p className="text-[16px] leading-[24px] text-[#434655]">
                  {description}
                </p>
              </div>
              <div className="text-right">
                <div className="text-[30px] font-semibold leading-[1.3]">
                  ${price}
                  <span className="text-[#434655] text-[16px] leading-[24px]">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <button
                  onClick={() => navigate('/pricing')}
                  className="text-[#004ac6] text-[14px] font-medium underline hover:text-[#003ea8] transition-colors"
                >
                  Change plan
                </button>
              </div>
            </section>

            {qrCodeData ? (
              <section className="bg-white border border-[#c3c6d7] p-8 text-center flex flex-col items-center">
                <h3 className="text-[24px] font-semibold leading-[1.3] mb-4 text-[#004ac6]">Quét mã để thanh toán</h3>
                <p className="text-[16px] text-[#434655] mb-8">
                  Sử dụng ứng dụng ngân hàng hoặc ví điện tử để quét mã VietQR bên dưới.
                  Hệ thống sẽ tự động cập nhật gói cước của bạn sau khi thanh toán thành công.
                </p>
                <div className="p-4 border-2 border-dashed border-[#004ac6] rounded-xl inline-block bg-white shadow-lg">
                  <QRCodeSVG value={qrCodeData} size={250} level="H" includeMargin={true} />
                </div>
                <div className="mt-8 bg-blue-50/50 p-4 rounded-lg border border-blue-100 w-full max-w-md">
                  <p className="text-[14px] text-[#434655] font-medium flex justify-between items-center">
                    <span>Mã đơn hàng:</span>
                    <span className="font-bold text-[#0b1c30] text-[16px]">{orderCode}</span>
                  </p>
                  <p className="text-[14px] text-[#434655] font-medium flex justify-between items-center mt-2">
                    <span>Số tiền:</span>
                    <span className="font-bold text-[#004ac6] text-[16px]">${price.toFixed(2)}</span>
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#004ac6] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[14px] text-[#004ac6] font-medium animate-pulse">Đang chờ xác nhận thanh toán...</p>
                </div>
              </section>
            ) : (
              <>
                {/* Payment Method Selection */}
                <section className="space-y-4">
                  <h3 className="text-[14px] font-bold uppercase tracking-widest text-[#434655]">
                    Payment Method
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {/* PayOS (VietQR) */}
                    <label
                      className={`relative flex items-center p-4 border cursor-pointer transition-colors ${selectedMethod === 'payos'
                          ? 'border-[#004ac6] bg-blue-50/30'
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
                      <span
                        className="material-symbols-outlined mr-3"
                        style={{ color: selectedMethod === 'payos' ? '#004ac6' : '#434655' }}
                      >
                        qr_code_scanner
                      </span>
                      <span
                        className={`text-[16px] font-medium ${selectedMethod === 'payos' ? 'text-[#0b1c30]' : 'text-[#434655]'
                          }`}
                      >
                        PayOS (VietQR)
                      </span>
                      {selectedMethod === 'payos' && (
                        <div className="absolute top-2 right-2">
                          <span
                            className="material-symbols-outlined text-[#004ac6]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            check_circle
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <aside className="lg:col-span-4 sticky top-24">
            <div className="bg-white border border-[#c3c6d7] p-8">
              <h3 className="text-[30px] font-semibold leading-[1.3] mb-8">Order Summary</h3>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-[16px] leading-[24px]">
                  <span className="text-[#434655]">Subtotal</span>
                  <span>${price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[16px] leading-[24px]">
                  <span className="text-[#434655]">Tax (0%)</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t border-[#c3c6d7] pt-4 flex justify-between text-[30px] font-semibold leading-[1.3]">
                  <span>Total</span>
                  <span className="text-[#004ac6]">${price.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                {!qrCodeData && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`w-full py-4 ${loading ? 'bg-[#93c5fd] cursor-not-allowed' : 'bg-[#2563eb] hover:bg-[#004ac6]'} text-[#eeefff] text-[30px] font-semibold leading-[1.3] transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
                  >
                    <span className="text-[18px]">{loading ? 'Đang tạo mã...' : 'Thanh Toán Ngay'}</span>
                    {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
                  </button>
                )}
                <p className="text-[14px] font-medium text-[#434655] text-center px-4 mt-4">
                  By completing your purchase, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>

              <div className="mt-8 pt-8 border-t border-[#c3c6d7]">
                <div className="flex items-center gap-4 mb-4">
                  <span className="material-symbols-outlined text-[#434655]">verified_user</span>
                  <span className="text-[14px] font-medium text-[#434655]">
                    Secure AES-256 Encryption
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-[#434655]">support_agent</span>
                  <span className="text-[14px] font-medium text-[#434655]">
                    24/7 Engineering Support
                  </span>
                </div>
              </div>
            </div>

            {/* Decorative schematic */}
            <div className="mt-8 opacity-20 hidden lg:block">
              <div className="w-full h-32 border-2 border-dashed border-[#c3c6d7] flex items-center justify-center">
                <div className="flex gap-4">
                  <div className="w-12 h-12 border-2 border-[#737686]" />
                  <div className="w-12 h-12 rounded-full border-2 border-[#737686]" />
                  <div className="w-12 h-12 border-2 border-[#737686] rotate-45" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#eff4ff] border-t border-[#c3c6d7] py-12 mt-auto">
        <div className="max-w-[1280px] mx-auto px-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="lg:col-span-1">
              <div className="text-[30px] font-bold text-[#0b1c30] mb-4">DiaUML Studio</div>
              <p className="text-[16px] leading-[24px] text-[#434655]">
                The blueprint for modern engineering teams. Design complex systems with absolute
                precision.
              </p>
            </div>
            <div className="lg:col-span-3 flex flex-wrap justify-end gap-12">
              <div className="space-y-4">
                <h4 className="text-[14px] font-bold uppercase text-[#0b1c30]">Resources</h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#"
                      className="text-[16px] leading-[24px] text-[#434655] hover:text-[#004ac6] transition-colors"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[16px] leading-[24px] text-[#434655] hover:text-[#004ac6] transition-colors"
                    >
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[14px] font-bold uppercase text-[#0b1c30]">Company</h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#"
                      className="text-[16px] leading-[24px] text-[#434655] hover:text-[#004ac6] transition-colors"
                    >
                      Security
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[16px] leading-[24px] text-[#434655] hover:text-[#004ac6] transition-colors"
                    >
                      Status
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-[#c3c6d7]/30 text-[#434655] text-[16px] leading-[24px]">
            © 2024 DiaUML Studio. All rights reserved. Built for engineering teams.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PaymentInformationPage