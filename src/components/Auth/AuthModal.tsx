import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, X, Loader2, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/useAuthStore';
import { toast } from 'react-hot-toast';
import { setAuthCookie, COOKIE_KEYS } from '../../shared/lib/auth';
import { useOtpCountdown } from '../../shared/hooks/useOtpCountdown';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

// OTP lifetime in seconds (must match backend: 1 phút 30 giây)
const OTP_TTL_SECONDS = 90;

type Mode = 'login' | 'register' | 'forgot';
type ForgotStep = 'email' | 'otp' | 'reset';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  // Popup riêng khi tài khoản bị khoá (BE trả code 1021 USER_INACTIVE).
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Forgot-password flow state
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { secondsLeft, start: startOtpCountdown, reset: resetOtpCountdown } = useOtpCountdown();

  const setAuth = useAuthStore((state) => state.setAuth);

  const resetFields = React.useCallback(() => {
    setEmail('');
    setPassword('');
    setFullName('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setForgotStep('email');
    setLockedNotice(null);
    resetOtpCountdown();
  }, [resetOtpCountdown]);

  // Sync mode and reset fields when modal opens/changes mode
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      resetFields();
    }
  }, [initialMode, isOpen, resetFields]);

  if (!isOpen) return null;

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    resetFields();
  };

  // --- Forgot-password step handlers ---
  const handleSendOtp = async () => {
    await authService.forgotPassword({ email });
    setForgotStep('otp');
    setOtpCode('');
    startOtpCountdown(OTP_TTL_SECONDS);
    toast.success('Mã OTP đã được gửi đến email của bạn');
  };

  const handleVerifyOtp = async () => {
    await authService.verifyOtp({ email, otpCode });
    setForgotStep('reset');
    toast.success('Mã OTP hợp lệ, hãy đặt mật khẩu mới');
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    await authService.resetPassword({ email, otpCode, newPassword, confirmPassword });
    toast.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
    switchMode('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        // Step 1: authenticate, get token from backend (or mock service)
        const loginResponse = await authService.login({ email, password });

        // Step 1b: save token as cookie
        if (loginResponse.result?.token) {
          setAuthCookie(COOKIE_KEYS.ACCESS_TOKEN, loginResponse.result.token);
        }

        // Step 2: fetch user profile (needs cookie from step 1)
        const userResponse = await authService.getCurrentUser();
        const user = userResponse.result;
        setAuth(user);

        toast.success(userResponse.message || 'Đăng nhập thành công!');
        onClose();

        // Redirect based on role
        const userRole = (typeof user.role === 'string' ? user.role : user.role?.roleName || '').toUpperCase();
        if (userRole === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else if (mode === 'register') {
        const response = await authService.register({
          email,
          password,
          fullName,
        });

        toast.success(response.message || 'Đăng ký thành công! Vui lòng đăng nhập.');
        setMode('login');
        setPassword(''); // Clear password for security
      } else if (mode === 'forgot') {
        if (forgotStep === 'email') {
          await handleSendOtp();
        } else if (forgotStep === 'otp') {
          await handleVerifyOtp();
        } else {
          await handleResetPassword();
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      // Tài khoản bị khoá → hiện popup nổi bật thay vì chỉ toast.
      if (error?.code === 1021) {
        setLockedNotice(error.message || 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.');
      } else {
        toast.error(error.message || 'Đã có lỗi xảy ra');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (secondsLeft > 0 || loading) return;
    setLoading(true);
    try {
      await handleSendOtp();
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi lại mã OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    window.location.href = `${baseUrl}/oauth2/authorization/google`;
  };

  const headerTitle =
    mode === 'login' ? 'ĐĂNG NHẬP' : mode === 'register' ? 'ĐĂNG KÝ' : 'ĐẶT LẠI';

  const headerSubtitle =
    mode !== 'forgot'
      ? null
      : forgotStep === 'email'
      ? 'Nhập email để nhận mã xác nhận'
      : forgotStep === 'otp'
      ? `Nhập mã OTP đã gửi tới ${email}`
      : 'Tạo mật khẩu mới cho tài khoản của bạn';

  const submitLabel =
    mode === 'login'
      ? 'Đăng nhập'
      : mode === 'register'
      ? 'Tạo tài khoản'
      : forgotStep === 'email'
      ? 'Gửi mã OTP'
      : forgotStep === 'otp'
      ? 'Xác nhận OTP'
      : 'Đặt lại mật khẩu';

  return (
    <AnimatePresence>
      {lockedNotice && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLockedNotice(null)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-[400px] bg-white rounded-[28px] shadow-2xl overflow-hidden px-8 py-9 text-center font-priego"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <ShieldAlert size={32} strokeWidth={1.8} className="text-red-500" />
            </div>
            <h3 className="text-[22px] font-black uppercase tracking-tight text-black">Tài khoản bị khoá</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-gray-500">{lockedNotice}</p>
            <button
              onClick={() => setLockedNotice(null)}
              className="mt-7 w-full h-[50px] bg-uml-blue text-white font-bold text-[15px] rounded-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Đã hiểu
            </button>
          </motion.div>
        </div>
      )}
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[440px] bg-white rounded-[32px] shadow-2xl overflow-hidden px-8 py-10 font-priego"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors disabled:opacity-50"
              disabled={loading}
            >
              <X size={20} />
            </button>

            {/* Back button inside forgot flow (otp / reset steps) */}
            {mode === 'forgot' && forgotStep !== 'email' && (
              <button
                type="button"
                disabled={loading}
                onClick={() => setForgotStep(forgotStep === 'reset' ? 'otp' : 'email')}
                className="absolute top-6 left-6 p-2 text-gray-400 hover:text-black transition-colors disabled:opacity-50"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            {/* Header */}
            <div className="text-center mb-10">
              <h2 className="text-[32px] font-black uppercase tracking-tight text-black leading-none">
                {headerTitle}
              </h2>
              {headerSubtitle && (
                <p className="mt-3 text-[14px] text-gray-500 font-medium px-2">{headerSubtitle}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
              {/* Full Name Field (Only for Register) */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <label className="text-[15px] font-bold text-black block ml-1">
                    Họ và tên
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                      <Mail size={20} strokeWidth={1.5} className="invisible" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      </div>
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-[54px] pl-12 pr-4 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400 disabled:opacity-50"
                    />
                  </div>
                </div>
              )}

              {/* Email Field (login, register, forgot:email step) */}
              {(mode !== 'forgot' || forgotStep === 'email') && (
                <div className="space-y-2">
                  <label className="text-[15px] font-bold text-black block ml-1">
                    Địa chỉ email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                      <Mail size={20} strokeWidth={1.5} />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      placeholder="Ví dụ: ten@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-[54px] pl-12 pr-4 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400 disabled:opacity-50"
                    />
                  </div>
                </div>
              )}

              {/* Password Field (login & register only) */}
              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <label className="text-[15px] font-bold text-black block ml-1">
                    Mật khẩu
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                      <Lock size={20} strokeWidth={1.5} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-[54px] pl-12 pr-12 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black transition-colors disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Field (forgot:otp step) */}
              {mode === 'forgot' && forgotStep === 'otp' && (
                <div className="space-y-2">
                  <label className="text-[15px] font-bold text-black block ml-1">
                    Mã OTP
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                      <ShieldCheck size={20} strokeWidth={1.5} />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      autoComplete="one-time-code"
                      disabled={loading}
                      placeholder="------"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full h-[54px] pl-12 pr-4 bg-white border-[1.5px] border-black/80 rounded-[14px] text-center text-[22px] font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:tracking-[0.5em] placeholder:text-gray-300 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1 ml-1">
                    {secondsLeft > 0 ? (
                      <span className="text-[13px] text-gray-500">
                        Mã hết hạn sau <b className="text-uml-blue">{formatTime(secondsLeft)}</b>
                      </span>
                    ) : (
                      <span className="text-[13px] text-red-500 font-medium">Mã đã hết hạn</span>
                    )}
                    <button
                      type="button"
                      disabled={secondsLeft > 0 || loading}
                      onClick={handleResendOtp}
                      className="text-[13px] font-bold text-uml-blue hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      Gửi lại mã
                    </button>
                  </div>
                </div>
              )}

              {/* New Password + Confirm (forgot:reset step) */}
              {mode === 'forgot' && forgotStep === 'reset' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[15px] font-bold text-black block ml-1">
                      Mật khẩu mới
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                        <Lock size={20} strokeWidth={1.5} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        disabled={loading}
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-[54px] pl-12 pr-12 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black transition-colors disabled:opacity-50"
                      >
                        {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[15px] font-bold text-black block ml-1">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                        <Lock size={20} strokeWidth={1.5} />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        disabled={loading}
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-[54px] pl-12 pr-12 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black transition-colors disabled:opacity-50"
                      >
                        {showConfirmPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                      <p className="text-[13px] text-red-500 font-medium ml-1">Mật khẩu xác nhận không khớp</p>
                    )}
                  </div>
                </>
              )}

              {/* Forgot Password Link */}
              {mode === 'login' && (
                <div className="flex flex-col gap-3 mt-[-8px]">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => switchMode('forgot')}
                      className="text-[14px] font-bold text-uml-blue hover:underline disabled:opacity-50"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[54px] bg-uml-blue text-white font-bold text-[16px] rounded-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : submitLabel}
              </button>
            </form>

            {/* Google Sign In (Hidden for Forgot Password) */}
            {mode !== 'forgot' && (
              <div className="mt-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="w-full h-[54px] bg-white border-[1.5px] border-black/80 rounded-[14px] flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  <span className="text-[15px] font-bold text-black">
                    Đăng nhập với Google
                  </span>
                </button>
              </div>
            )}

            {/* Divider (Hidden for Forgot Password) */}
            {mode !== 'forgot' && (
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  <span className="bg-white px-4 text-gray-500 font-bold tracking-widest text-[13px]">HOẶC</span>
                </div>
              </div>
            )}

            {/* Switch Mode */}
            <div className="text-center mt-6">
              <p className="text-[15px] text-black">
                {mode === 'login' ? 'Chưa có tài khoản?' : mode === 'register' ? 'Đã có tài khoản?' : 'Nhớ mật khẩu?'}{' '}
                <button
                  disabled={loading}
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="font-bold text-uml-blue hover:underline disabled:opacity-50"
                >
                  {mode === 'login' ? 'Đăng ký miễn phí' : 'Đăng nhập'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
