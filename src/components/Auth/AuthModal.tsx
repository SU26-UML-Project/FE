import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Sync mode when initialMode changes
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`${mode} attempt with:`, { email, password, fullName });
  };

  return (
    <AnimatePresence>
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
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center mb-10">
              <h2 className="text-[32px] font-black uppercase tracking-tight text-black leading-none">
                {mode === 'login' ? 'LOG IN' : mode === 'register' ? 'SIGN UP' : 'FORGOT'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name Field (Only for Register) */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <label className="text-[15px] font-bold text-black block ml-1">
                    Full Name
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
                      placeholder="e.g., John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-[54px] pl-12 pr-4 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-[15px] font-bold text-black block ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                    <Mail size={20} strokeWidth={1.5} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="e.g., yourname@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-[54px] pl-12 pr-4 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Password Field (Not for Forgot Password) */}
              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <label className="text-[15px] font-bold text-black block ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                      <Lock size={20} strokeWidth={1.5} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-[54px] pl-12 pr-12 bg-white border-[1.5px] border-black/80 rounded-[14px] text-[15px] focus:outline-none focus:ring-2 focus:ring-uml-blue/20 transition-all placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot Password Link */}
              {mode === 'login' && (
                <div className="flex justify-end mt-[-8px]">
                  <button 
                    type="button" 
                    onClick={() => setMode('forgot')}
                    className="text-[14px] font-bold text-uml-blue hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full h-[54px] bg-uml-blue text-white font-bold text-[16px] rounded-[14px] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20"
              >
                {mode === 'login' ? 'Log in' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
              </button>
            </form>

            {/* Google Sign In (Hidden for Forgot Password) */}
            {mode !== 'forgot' && (
              <div className="mt-4">
                <button className="w-full h-[54px] bg-white border-[1.5px] border-black/80 rounded-[14px] flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  <span className="text-[15px] font-bold text-black">
                    Sign in with Google
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
                  <span className="bg-white px-4 text-gray-500 font-bold tracking-widest text-[13px]">OR</span>
                </div>
              </div>
            )}

            {/* Switch Mode */}
            <div className="text-center mt-6">
              <p className="text-[15px] text-black">
                {mode === 'login' ? "Don't have an account?" : mode === 'register' ? "Already have an account?" : "Remember your password?"}{' '}
                <button
                  onClick={() => setMode(mode === 'login' || mode === 'forgot' ? 'register' : 'login')}
                  className="font-bold text-uml-blue hover:underline"
                >
                  {mode === 'login' ? 'Sign Up Free' : 'Log In'}
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
