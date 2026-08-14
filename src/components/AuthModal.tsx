import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { extractFunctionErrorMessage } from '../utils/functionError';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; name: string; email: string; phone: string; role?: string; status?: string }) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({
isOpen, onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
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
  const [resendSeconds, setResendSeconds] = useState(0);

  // استرجاع كلمة السر
  const [forgotStep, setForgotStep] = useState<'phone' | 'reset'>('phone');
  const [forgotPhone, setForgotPhone] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  React.useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  if (!isOpen) return null;

  const resetOtpFlow = () => {
    setOtpCode('');
    setOtpStatus('idle');
    setOtpVerified(false);
    setResendSeconds(0);
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
    resetForgotFlow();
  };

  const resetForgotFlow = () => {
    setForgotStep('phone');
    setForgotPhone('');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const maskEmail = (value: string) => {
    const [user, domain] = value.split('@');
    if (!domain) return value;
    const visible = user.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
  };

  const handleToggleMode = () => {
    setMode(prev => (prev === 'login' ? 'register' : 'login'));
    setErrorText('');
    setSuccessText('');
    resetOtpFlow();
    resetForgotFlow();
  };

  const handleOpenForgotPassword = () => {
    setMode('forgot');
    setErrorText('');
    setSuccessText('');
    resetForgotFlow();
  };

  const handleSendResetCode = async () => {
    if (!forgotPhone.trim()) { setErrorText('اكتب رقم الموبايل المسجل على حسابك.'); return; }
    setErrorText('');
    setSuccessText('');
    setLoading(true);
    try {
      const result = await supabase.functions.invoke('forgot-password', { body: { phone: forgotPhone.trim() } });
      if (result.error) throw new Error(await extractFunctionErrorMessage(result.error, 'لا يوجد حساب مسجل بهذا الرقم.'));
      if (result.data?.error) throw new Error(result.data.error);
      setResetEmail(result.data.email);
      setForgotStep('reset');
      setSuccessText(`تم إرسال رمز التحقق إلى بريدك (${maskEmail(result.data.email)}).`);
    } catch (err: any) {
      setErrorText(err.message || 'تعذر إرسال رمز الاسترجاع.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorText('');
    setSuccessText('');
    if (!resetCode.trim()) { setErrorText('اكتب رمز التحقق المرسل لبريدك.'); return; }
    if (!newPassword.trim() || newPassword.trim().length < 6) { setErrorText('كلمة المرور الجديدة لازم تكون 6 حروف/أرقام على الأقل.'); return; }
    if (newPassword.trim() !== confirmNewPassword.trim()) { setErrorText('كلمتا المرور غير متطابقتين.'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: resetEmail, token: resetCode.trim(), type: 'recovery' });
      if (error || !data.session) throw error || new Error('رمز التحقق غير صحيح.');
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword.trim() });
      if (updateError) throw updateError;
      setSuccessText('تم تغيير كلمة المرور بنجاح! سجّل دخولك بكلمة المرور الجديدة.');
      await supabase.auth.signOut();
      setTimeout(() => { setMode('login'); resetForgotFlow(); setErrorText(''); }, 1200);
    } catch (err: any) {
      setErrorText(err.message || 'تعذر تعيين كلمة المرور الجديدة.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (otpStatus === 'sent' && resendSeconds > 0) return;
    if (!email.trim()) {
      setErrorText('أدخل البريد الإلكتروني أولاً.');
      return;
    }
    if (!password.trim() || password.trim().length < 6) {
      setErrorText('اكتب كلمة مرور من 6 حروف/أرقام على الأقل قبل إرسال رمز التحقق.');
      return;
    }

    setErrorText('');
    setSuccessText('');
    setLoading(true);
    setOtpStatus('sending');

    try {
      // signUp بيعمل حساب فعلي بكلمة المرور دي، وبيبعت كود تحقق للبريد (لو مفعّل من إعدادات Supabase)
      const { error } = await supabase.auth.signUp({ email: email.trim(), password: password.trim(), options: { data: { name, phone, role } } });
      if (error) throw error;
      setOtpStatus('sent');
      setOtpVerified(false);
      setOtpCode('');
      setResendSeconds(60);
      setSuccessText('تم إرسال رمز التحقق إلى بريدك الإلكتروني.');
    } catch (err: any) {
      setOtpStatus('idle');
      setErrorText(err.message || 'تعذر إرسال الرمز.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!email.trim() || !otpCode.trim()) {
      setErrorText('الرجاء إدخال الرمز المرسل.');
      return;
    }

    setErrorText('');
    setSuccessText('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otpCode.trim(), type: 'signup' });
      if (error || !data.user) throw error || new Error('رمز التحقق غير صحيح.');
      const { data: profile, error: profileError } = await supabase.rpc('create_my_profile', { p_name: name, p_phone: phone, p_role: role });
      if (profileError || !profile) throw profileError || new Error('تعذر حفظ الحساب بعد التحقق.');
      setOtpStatus('verified');
      setOtpVerified(true);
      setSuccessText('تم تأكيد البريد وإنشاء الحساب بنجاح.');
      onSuccess({ id: profile.id, name: profile.name || name, email: profile.email || email, phone: profile.phone || phone, role: profile.role || role, status: profile.status || 'approved' });
      setTimeout(() => { onClose(); resetForm(); }, 1000);
    } catch (err: any) {
      setOtpVerified(false);
      setErrorText(err.message || 'فشل تأكيد الرمز.');
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
      if (!password.trim() || (mode === 'register' && (!name.trim() || !phone.trim() || !email.trim())) || (mode === 'login' && !phone.trim())) {
        setErrorText('من فضلك أكمل رقم الموبايل وكلمة المرور والبيانات المطلوبة.');
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        // تسجيل حساب جديد: يتطلب تأكيد البريد الإلكتروني عبر رمز تحقق (Supabase OTP) قبل إنشاء الحساب
        if (otpStatus === 'idle') { await handleSendOtp(); setLoading(false); return; }
        if (otpStatus === 'sent' && !otpVerified) { await handleVerifyOtp(); setLoading(false); return; }
        if (!otpVerified) { setErrorText('أدخل رمز التحقق أولًا.'); setLoading(false); return; }
      } else {
        // تسجيل الدخول: رقم الموبايل وكلمة المرور فقط
        const result = await supabase.functions.invoke('login-by-phone', { body: { phone, password } });
        if (result.error) throw new Error(await extractFunctionErrorMessage(result.error, 'رقم الهاتف أو كلمة المرور غير صحيحة.'));
        if (result.data?.error) throw new Error(result.data.error);
        if (result.data?.session) {
          await supabase.auth.setSession(result.data.session);
        }
        const profile: any = result.data.profile;
        onSuccess({ id: profile.id, name: profile.name, email: profile.email, phone: profile.phone, role: profile.role, status: profile.status });
      }
      onClose();
      resetForm();
    } catch (err: any) {
      setErrorText(err.message || 'عفواً! تعذّر الاتصال بالسيرفر.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh]"
        style={{ direction: 'rtl' }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer z-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-none">
          <div className="text-center mb-6 mt-2">
            <span className="text-3xl">🛵</span>
            <h2 className="text-xl font-extrabold text-slate-800 mt-3 font-display">
              {mode === 'login' ? 'تسجيل الدخول إلى حسابك' : mode === 'register' ? 'إنشاء حساب جديد' : 'استرجاع كلمة المرور'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {mode === 'forgot' ? 'هنبعتلك رمز تحقق على بريدك المسجل لتعيين كلمة مرور جديدة' : 'مطلوب حساب لإتمام الطلبات وتتبعها مباشرة'}
            </p>
          </div>

          {errorText && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold text-center mb-4">
              ⚠️ {errorText}
            </div>
          )}
          {successText && (
            <div className="p-3.5 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-xs font-bold text-center flex items-center justify-center gap-2 mb-4">
              <Check className="h-4 w-4 text-green-600 animate-pulse" />
              <span>{successText}</span>
            </div>
          )}

          {mode === 'forgot' ? (
            <div className="space-y-4">
              {forgotStep === 'phone' ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>رقم الموبايل المسجل على حسابك</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSendResetCode}
                    className="w-full py-3.5 bg-[#f94c10] hover:bg-[#e03d08] text-white font-extrabold rounded-2xl text-xs sm:text-sm tracking-wide transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> : <span>إرسال رمز التحقق 📧</span>}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                      <Check className="h-3.5 w-3.5 text-slate-400" />
                      <span>رمز التحقق — تم إرساله على {maskEmail(resetEmail)}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="12345678"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10] tracking-[0.4em] text-center font-mono"
                      style={{ direction: 'ltr' }}
                      maxLength={8}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      <span>كلمة المرور الجديدة</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      <span>تأكيد كلمة المرور الجديدة</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResetPassword}
                    className="w-full py-3.5 bg-[#f94c10] hover:bg-[#e03d08] text-white font-extrabold rounded-2xl text-xs sm:text-sm tracking-wide transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> : <span>تعيين كلمة المرور الجديدة ✅</span>}
                  </button>
                  <button type="button" onClick={handleSendResetCode} disabled={loading} className="w-full text-xs font-bold rounded-xl py-2 border border-orange-200 text-orange-600 disabled:text-slate-400 disabled:border-slate-200">
                    إعادة إرسال الرمز
                  </button>
                </div>
              )}

              <div className="mt-2 text-center border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setMode('login'); resetForgotFlow(); setErrorText(''); setSuccessText(''); }}
                  className="text-[#f94c10] hover:underline font-black outline-none cursor-pointer text-xs"
                >
                  الرجوع لتسجيل الدخول
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'register' && (
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <label className="text-xs font-bold text-slate-600 block">
                  طبيعة الحساب
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      role === 'customer' ? 'bg-[#f94c10] text-white shadow' : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    👤 عميل
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('captain')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      role === 'captain' ? 'bg-[#f43f5e] text-white shadow' : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    🛵 كابتن توصيل
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>الاسم بالكامل</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="اكتب اسمك بالكامل"
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
                    <span>البريد الإلكتروني</span>
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
                    <span>رمز التحقق — تم إرساله على بريدك</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="12345678"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#f94c10] tracking-[0.4em] text-center font-mono"
                    style={{ direction: 'ltr' }}
                    maxLength={8}
                  />
                  <button type="button" onClick={handleSendOtp} disabled={loading || resendSeconds > 0} className="w-full mt-2 text-xs font-bold rounded-xl py-2 border border-orange-200 text-orange-600 disabled:text-slate-400 disabled:border-slate-200">
                    {resendSeconds > 0 ? `إعادة إرسال الرمز بعد ${resendSeconds} ثانية` : 'إعادة إرسال الرمز مرة أخرى'}
                  </button>
                </div>
              )}

              {mode === 'register' && otpVerified && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                  ✓ تم تأكيد البريد الإلكتروني بنجاح.
                </div>
              )}

              {/* Phone field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pb-0.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>رقم الموبايل</span>
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
                  <span>الرقم السري</span>
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
                    className="absolute inset-y-0 left-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  <span>جاري التحميل...</span>
                </>
              ) : (
                <span>
                  {mode === 'login'
                    ? 'دخول فوري 🚪'
                    : otpVerified
                      ? 'تأكيد إنشاء الحساب ✨'
                      : otpStatus === 'sent'
                        ? 'تحقق من الرمز ✉️'
                        : 'إرسال رمز التحقق 📧'}
                </span>
              )}
            </button>
          </form>
          )}

          {mode !== 'forgot' && (
          <div className="mt-6 text-center border-t border-slate-100 pt-4 space-y-2">
            {mode === 'login' && (
              <button
                type="button"
                onClick={handleOpenForgotPassword}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold outline-none cursor-pointer block w-full"
              >
                نسيت كلمة السر؟
              </button>
            )}
            <p className="text-xs text-slate-500 font-bold">
              {mode === 'login' ? 'أول مرة معنا؟' : 'لديك حساب بالفعل؟'}
              <button
                type="button"
                onClick={handleToggleMode}
                className="text-[#f94c10] hover:underline font-black outline-none cursor-pointer mx-1.5"
              >
                {mode === 'login' ? 'سجل حساب جديد' : 'سجل الدخول'}
              </button>
            </p>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
