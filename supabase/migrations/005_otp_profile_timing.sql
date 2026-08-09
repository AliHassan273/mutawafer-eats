-- لا تنشئ Profile قبل تأكيد OTP.
-- Supabase Auth قد يحتفظ بمستخدم غير مؤكد داخليًا، لكن حساب التطبيق لا يظهر في profiles إلا بعد التحقق.
drop trigger if exists on_auth_user_created on auth.users;
