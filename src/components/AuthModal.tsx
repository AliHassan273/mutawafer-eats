import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { saveToken } from '../utils/fetchHelper';
import { lang, getTranslation } from '../translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; name: string; email: string; phone: string; role?: string; status?: string }) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({
 isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  const isAr = true;
  const t = (key: any, params?: any) => getTranslation(key, lang as any, params);

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'captain'>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStatus, setOtpStatus] = useState<'idle' | 'sending' | 'sent' | 'verified'>('idle');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpDebugCode, setOtpDebugCode] = useState('');

  if (!isOpen) return null;


  const resetOtpFlow = () => {
    setOtpCode('');
    setOtpStatus('idle');
    setOtpVerified(false);
    setOtpDebugCode('');
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('customer');
    setErrorText('');
    setSuccessText('');
    resetOtpFlow();
  };

  const handleToggleMode = () => {
    setMode(prev => (prev === 'login' ? 'register' : 'login'));
    setErrorText('');
    setSuccessText('');
    resetOtpFlow();
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setErrorText(isAr ? 'أدخل البريد الإلكتروني أولاً.' : 'Please enter the email first.');
      return;
    }

    setErrorText('');
    setSuccessText('');
    setLoading(true);
    setOtpStatus('sending');

    try {
      const res = await fetch('/api/users/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isAr ? 'تعذر إرسال الرمز.' : 'Could not send OTP.'));

      setOtpStatus('sent');
      setOtpVerified(false);
      setOtpCode('');
      setOtpDebugCode(data.debugCode || '');
      setSuccessText(data.message || (isAr ? 'تم إرسال الرمز إلى بريدك الإلكتروني.' : 'OTP sent to your email.'));
    } catch (err: any) {
      setOtpStatus('idle');
      setErrorText(err.message || (isAr ? 'تعذر إرسال الرمز.' : 'Could not send OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!email.trim() || !otpCode.trim()) {
      setErrorText(isAr ? 'الرجاء إدخال الرمز المرسل.' : 'Please enter the received OTP code.');
      return;
    }

    setErrorText('');
    setSuccessText('');
    setLoading(true);

    try {
      const res = await fetch('/api/users/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isAr ? 'رمز التحقق غير صحيح.' : 'Invalid OTP.'));

      setOtpStatus('verified');
      setOtpVerified(true);
      setOtpDebugCode('');

      // ✅ تسجيل الحساب تلقائياً بعد التحقق — بدون ضغطة تانية
      const regRes = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, role }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || (isAr ? 'حدث خطأ أثناء التسجيل.' : 'Failed to register.'));

      if (role === 'captain') {
        setSuccessText(isAr ? 'تم تسجيل حساب الكابتن بنجاح! في انتظار موافقة الإدارة.' : 'Captain account registered! Pending admin approval.');
        setTimeout(() => { onClose(); resetForm(); }, 3000);
      } else {
        setSuccessText(isAr ? 'تم التسجيل بنجاح! جاري تسجيل الدخول...' : 'Registered! Logging in...');
        setTimeout(() => { autoLogin(phone, password); }, 1500);
      }
    } catch (err: any) {
      setOtpVerified(false);
      setErrorText(err.message || (isAr ? 'فشل تأكيد الرمز.' : 'OTP verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setSuccessText('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim() || !phone.trim() || !password.trim() || !email.trim()) {
          setErrorText(isAr ? 'الرجاء ملء جميع الحقول.' : 'Please fill all fields.');
          setLoading(false);
          return;
        }

        // ── Step 1: بعت OTP لو لسه مش بعت ──
        if (otpStatus === 'idle') {
          await handleSendOtp();
          setLoading(false);
          return;
        }

        // ── Step 2: تحقق من OTP لو الكود موجود ومش متحقق لسه ──
        if (otpStatus === 'sent' && !otpVerified) {
          if (!otpCode.trim()) {
            setErrorText(isAr ? 'أدخل رمز التحقق المرسل على بريدك.' : 'Enter the OTP sent to your email.');
            setLoading(false);
            return;
          }
          await handleVerifyOtp();
          setLoading(false);
          return;
        }

        // ── Step 3: سجّل الحساب بعد التحقق ──
        if (!otpVerified) {
          setErrorText(isAr ? 'يرجى تأكيد البريد الإلكتروني أولاً.' : 'Please verify your email first.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password, role }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || (isAr ? 'حدث خطأ أثناء التسجيل.' : 'Failed to register.'));

        if (role === 'captain') {
          setSuccessText(isAr ? 'تم تسجيل حساب الكابتن بنجاح! في انتظار موافقة الإدارة.' : 'Captain account registered! Pending admin approval.');
          setTimeout(() => {
            onClose();
            resetForm();
          }, 3000);
        } else {
          setSuccessText(isAr ? 'تم تسجيل حسابك بنجاح! جاري تسجيل الدخول...' : 'Registered! Logging in...');
          setTimeout(() => {
            autoLogin(phone, password);
          }, 1500);
        }
      } else {
        // Login
        if (!phone.trim() || !password.trim()) {
          setErrorText(isAr ? 'الرجاء كتابة رقم الموبايل ورقمك السري.' : 'Please enter your phone and password.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || (isAr ? 'رقم الهاتف أو الرمز السري غير صحيح.' : 'Invalid credentials.'));

        if (data.user?.role === 'captain' && data.user?.status === 'pending') {
          setErrorText(isAr ? '⚠️ حساب الكابتن لا يزال قيد مراجعة الإدارة.' : 'Captain account is pending admin approval.');
          setLoading(false);
          return;
        }
        if (data.user?.role === 'captain' && data.user?.status === 'suspended') {
          setErrorText(isAr ? '🚫 تم تعليق هذا الحساب من قبل الإدارة.' : 'This account has been suspended.');
          setLoading(false);
          return;
        }

        // ✅ حفظ التوكن
        if (data.token) saveToken(data.token);

        // ✅ إرسال بيانات آمنة فقط
        const safeUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email || '',
          phone: data.user.phone || '',
          role: data.user.role || 'customer',
          status: data.user.status || 'approved',
        };

        setSuccessText(isAr ? 'تم الدخول بنجاح! مرحباً بك 🎉' : 'Logged in successfully!');
        setTimeout(() => {
          onSuccess(safeUser);
          onClose();
          resetForm();
        }, 1200);
      }
    } catch (err: any) {
      setErrorText(err.message || (isAr ? 'عفواً! تعذّر الاتصال بالسيرفر.' : 'Server connection failed.'));
    } finally {
      setLoading(false);
    }
  };

  // دالة مساعدة: لوجن تلقائي بعد التسجيل
  const autoLogin = async (phoneVal: string, passwordVal: string) => {
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneVal, password: passwordVal }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        saveToken(data.token);
        const safeUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email || '',
          phone: data.user.phone || '',
          role: data.user.role || 'customer',
          status: data.user.status || 'approved',
        };
        onSuccess(safeUser);
        onClose();
        resetForm();
      }
    } catch {
      // لو فشل اللوجن التلقائي، المستخدم هيدخل يدوياً
      onClose();
      resetForm();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh]"
        style={{ direction: isAr ? 'rtl' : 'ltr' }}
      >
        <button
          onClick={onClose}
          className={`absolute top-5 ${isAr ? 'left-5' : 'right-5'} p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer z-10`}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-none">
          <div className="text-center mb-6 mt-2">
            <span className="text-3xl">🛵</span>
            <h2 className="text-xl font-extrabold text-slate-800 mt-3 font-display">
              {mode === 'login'
                ? (isAr ? 'تسجيل الدخول إلى حسابك' : 'Login to Mutafer Eats')
                : (isAr ? 'إنشاء حساب جديد' : 'Create New Account')}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {isAr ? 'مطلوب حساب لإتمام الطلبات وتتبعها مباشرة' : 'An account is required to place and track orders'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorText && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold text-center">
                ⚠️ {errorText}
              </div>
            )}
            {successText && (
              <div className="p-3.5 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-xs font-bold text-center flex items-center justify-center gap-2">
                <Check className="h-4 w-4 text-green-600 animate-pulse" />
                <span>{successText}</span>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <label className="text-xs font-bold text-slate-600 block">
                  {isAr ? 'طبيعة الحساب' : 'Account Type'}
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      role === 'customer' ? 'bg-[#f94c10] text-white shadow' : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    {isAr ? '👤 عميل' : 'Customer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('captain')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      role === 'captain' ? 'bg-[#f43f5e] text-white shadow' : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    {isAr ? '🛵 كابتن توصيل' : 'Captain Courier'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{isAr ? 'الاسم بالكامل' : 'Full Name'}</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'علي حسن' : 'John Doe'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                  />
                </div>
              )}

              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
                  </label>
                  <input
                    type="email"
                    required={mode === 'register'}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (otpStatus !== 'idle') resetOtpFlow();
                    }}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                  />
                </div>
              )}

              {mode === 'register' && otpStatus === 'sent' && !otpVerified && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                    <Check className="h-3.5 w-3.5 text-slate-400" />
                    <span>{isAr ? 'رمز التحقق — تم إرساله على بريدك' : 'OTP sent to your email'}</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10] tracking-[0.4em] text-center font-mono"
                    style={{ direction: 'ltr' }}
                    maxLength={6}
                  />
                  {otpDebugCode && (
                    <p className="text-[10px] text-amber-600 font-bold text-center bg-amber-50 rounded-xl py-1">
                      🔧 وضع تطوير — الرمز: {otpDebugCode}
                    </p>
                  )}
                </div>
              )}

              {mode === 'register' && otpVerified && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                  {isAr ? '✓ تم تأكيد البريد الإلكتروني بنجاح.' : '✓ Email verified successfully.'}
                </div>
              )}

              {/* Phone field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isAr ? 'رقم الموبايل' : 'Phone Number'}</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                  style={{ direction: 'ltr' }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isAr ? 'الرقم السري' : 'Password'}</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 ${isAr ? 'left-4' : 'right-4'} flex items-center text-slate-400 hover:text-slate-600 cursor-pointer`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#f94c10] hover:bg-[#e03d08] text-white font-extrabold rounded-2xl text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                  <span>{isAr ? 'جاري التحميل...' : 'Please wait...'}</span>
                </>
              ) : (
                <span>
                  {mode === 'login'
                    ? (isAr ? 'دخول فوري 🚪' : 'Sign In Now')
                    : otpVerified
                      ? (isAr ? 'تأكيد إنشاء الحساب ✨' : 'Confirm & Create Account')
                      : otpStatus === 'sent'
                        ? (isAr ? 'تحقق من الرمز ✉️' : 'Verify Code ✉️')
                        : (isAr ? 'إرسال رمز التحقق 📧' : 'Send Verification Code 📧')}
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 font-bold">
              {mode === 'login'
                ? (isAr ? 'أول مرة معنا؟' : "Don't have an account?")
                : (isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?')}
              <button
                type="button"
                onClick={handleToggleMode}
                className="text-[#f94c10] hover:underline font-black outline-none cursor-pointer mx-1.5"
              >
                {mode === 'login'
                  ? (isAr ? 'سجل حساب جديد' : 'Create Account')
                  : (isAr ? 'سجل الدخول' : 'Login')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}