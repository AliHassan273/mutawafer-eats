# مراحل النقل إلى Supabase

## المرحلة الأولى — البيانات والصلاحيات

- مخطط الجداول موجود في `supabase/migrations/001_initial_schema.sql`.
- سياسات الحماية الكاملة موجودة في `supabase/migrations/002_complete_rls.sql`.
- المطاعم والأصناف والطلبات والتقييمات والحسابات تستخدم Supabase عند تفعيل المتغيرات.
- لا يتم حذف Railway أو Turso في هذه المرحلة.

## المرحلة الثانية — الخدمات الخارجية ✅

- `upload-image` جاهز لرفع الصور إلى Cloudinary.
- `send-telegram-order` جاهز لإرسال الطلبات إلى Telegram.
- إشعار إنشاء الطلب يُحفظ في Supabase.
- الواجهة تستخدم Cloudinary عند تفعيل Supabase.

أوامر النشر:

```bash
supabase functions deploy upload-image
supabase functions deploy send-telegram-order
supabase secrets set TELEGRAM_BOT_TOKEN=...
supabase secrets set TELEGRAM_CHAT_ID=...
supabase secrets set CLOUDINARY_CLOUD_NAME=...
supabase secrets set CLOUDINARY_UPLOAD_PRESET=...
```

## المرحلة الثالثة — الإيقاف النهائي

- اختبارات E2E على Cloudflare Pages.
- إزالة fallback القديم.
- إزالة Turso و`server.ts` بعد أخذ نسخة احتياطية.
