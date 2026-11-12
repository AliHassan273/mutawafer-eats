# حزمة الإصلاح الأمني: خطوات التطبيق (بالترتيب)

> الفولدر ده بيتنسخ فوق فولدر المشروع بنفس المسارات (`supabase/...` و`src/...`).
> الـ SQL والـ Edge Functions اتفحصت صياغتها، والواجهة عدّت `tsc` و`vite build` والاختبارات.
> **ولا حاجة اتجرّبت على Supabase بتاعك**، فاعمل قايمة الاختبار اللي في الآخر.

## 1) الداتابيز (الأول دايمًا)
1. افتح `supabase/migrations/009_security_lockdown.sql` وانسخ كل محتواه.
2. Supabase ← SQL Editor ← New query ← الصق ← Run.
3. النتيجة لازم تكون:
   - `false` ـ المستخدم يقدر يعدّل role
   - `false` ـ المستخدم يقدر يعمل INSERT في profiles
   - `true` ـ يعدّل name
   - `true` ـ unique index للموبايل
   - `true` ـ unique index للتقييمات
   - `5` ـ عدد التريجرز
   - وآخر استعلام (أرقام مكررة) **مفيهوش ولا صف**.
4. لو ظهر تحذير (warning) إن index اتخطّى، يبقى فيه أرقام موبايل مكررة. صلّحها وأعد التشغيل.
5. خلّي نسخة من الملف في الريبو كـ migration (موجود بالمسار الصح).

## 2) الـ Edge Functions
الـ functions دي كلها بتتحقق من الهوية والصلاحية **جوه الكود**، فلازم تعطّل "Verify JWT" عليها
(فحص Supabase المدمج مابيفهمش المفاتيح الجديدة، وده بيوقّف تسجيل الدخول لو سبته شغّال بعد الـ Revoke).

- بالـ CLI من فولدر المشروع: `supabase functions deploy --no-verify-jwt`
- أو من الداشبورد: كل function ← Code ← الصق الملف ← Deploy، وفي Settings عطّل **Verify JWT**.

الدوال: `login-by-phone` `forgot-password` `send-telegram-order` `upload-image` `parse-menu`
`create-admin` `delete-admin` `delete-category` `delete-captain` (الأخيرة **جديدة**).

## 3) الواجهة
انسخ الملفات اللي في `src/` فوق مشروعك، ونفّذ `DELETE_THESE.txt`، وبعدين `git push`.
- `src/pages/index.ts`: كان اتكتب فوقه كود delete-captain بالغلط. رجّعته.
- `AuthModal.tsx`: استرجاع كلمة السر بقى من السيرفر والإيميل مابيظهرش للمتصفح.
- `supabaseOrderService.ts`: تليجرام بياخد رقم الأوردر بس.
- `App.tsx`: لو الأوردر ماتحفظش، العميل بيشوف الخطأ (القديم كان بيوريه أوردر وهمي كأنه نجح).

## 4) Cloudinary (مهم)
الواجهة بترفع الصور **مباشرة من المتصفح** لما `VITE_CLOUDINARY_UPLOAD_PRESET` تكون موجودة،
يعني اسم الـ preset ظاهر لأي حد، وأي حد يقدر يرفع على حسابك.
1. Cloudinary ← Settings ← Upload ← اعمل preset جديد (Unsigned): الصيغ jpg/png/webp بس، حد أقصى للحجم (مثلًا 5MB)، فولدر `mutawafer-eats`، من غير overwrite.
2. Supabase ← Edge Functions ← Secrets: `CLOUDINARY_CLOUD_NAME` و`CLOUDINARY_UPLOAD_PRESET` (الاسم الجديد).
3. Cloudflare Pages: امسح `VITE_CLOUDINARY_CLOUD_NAME` و`VITE_CLOUDINARY_UPLOAD_PRESET` وأعد النشر (بيخلي الرفع يعدّي من `upload-image` للأدمن بس).
4. امسح الـ preset القديم من Cloudinary.

## 5) قايمة الاختبار (بعد كل ده)
- [ ] تسجيل دخول بالموبايل (أدمن).
- [ ] نسيت كلمة السر: الرمز يوصل، وبعدها الرمز + كلمة جديدة، وبعدين دخول بالجديدة.
- [ ] أوردر كعميل: يظهر عند الأدمن، رسالة تليجرام **مرة واحدة**، والإجمالي صح.
- [ ] افصل النت وجرّب تعمل أوردر: لازم يظهر خطأ والسلة تفضل.
- [ ] رفع صورة منيو، وماسح المنيو الذكي (كأدمن).
- [ ] تسجيل كابتن ← اعتماده ← يشوف الأوردرات ← يقبل ← يأكد التسليم.
- [ ] بعد التسليم: العميل يقيّم مرة واحدة، والمرة التانية ترفض.

## 6) بعد ما كل ده يشتغل
اعمل **Revoke** للـ legacy JWT secret (JWT Signing Keys).
الـ functions فيها fallback للمفاتيح القديمة، فلازم الـ Revoke يكون آخر خطوة.
