import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';

// ============================================================
// 🔑  JWT SECRET — يُقرأ من متغير البيئة فقط
// ============================================================
// ❌ المشكلة القديمة:
//    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
//    → إذا نُسي تعيين المتغير، كان الـ fallback يصبح المفتاح الحقيقي
//      وهو مفتاح معروف لأي شخص يقرأ الكود!
//
// ✅ الحل الجديد:
//    نتحقق من وجود المفتاح عند بدء التشغيل ونوقف السيرفر
//    إذا لم يُعيَّن — أفضل من السماح بأي fallback ضعيف.
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ FATAL: JWT_SECRET غير محدد أو قصير جداً في ملف .env');
  console.error('   شغّل: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  console.error('   وضع النتيجة في JWT_SECRET داخل ملف .env');
  process.exit(1); // أوقف السيرفر نهائياً — لا نسمح بالتشغيل بمفتاح ضعيف
}

// ============================================================
// 🔐  دوال التشفير
// ============================================================

// hashPassword: تحوّل الباسورد الـ plain-text إلى hash آمن
// الرقم 12 = bcrypt cost factor (كلما زاد كلما استغرق التكسير وقتاً أطول)
// القيمة القديمة كانت 10 — رفعناها لـ 12 لأمان أفضل
export const hashPassword = async (plain: string) =>
  await bcrypt.hash(plain, 12);

export const comparePassword = async (plain: string, hash: string) =>
  await bcrypt.compare(plain, hash);

// ============================================================
// 🛡️  Middleware: التحقق من الـ JWT Token
// ============================================================
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // صيغة: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'غير مصرح، الرجاء تسجيل الدخول.' });
  }

  // jwt.verify يتحقق من:
  //   1. أن التوكن موقّع بنفس JWT_SECRET
  //   2. أن التوكن لم ينته (expiresIn)
  //   3. أن بنية التوكن سليمة
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'التوكن غير صالح أو منتهي الصلاحية.' });
    }
    req.user = user;
    next();
  });
};

// ============================================================
// 🔒  Middleware: صلاحيات مختلفة
// ============================================================

// فقط الـ primary admin (المدير الأساسي) يقدر يوصل
export const isPrimaryAdmin = (req: any, res: any, next: any) => {
  const isPrimary = req.user?.role === 'primary' || req.user?.id === 'admin_primary';
  if (!isPrimary) {
    return res.status(403).json({ error: 'هذه الخاصية متاحة فقط للمدير الأساسي.' });
  }
  next();
};

// أي admin لديه صلاحية إدارة المطاعم
export const canManageRestaurants = (req: any, res: any, next: any) => {
  const ok = req.user?.canManageRestaurants || req.user?.role === 'primary' || req.user?.id === 'admin_primary';
  if (!ok) {
    return res.status(403).json({ error: 'ليس لديك صلاحية لإدارة المطاعم.' });
  }
  next();
};

// أي admin لديه صلاحية إدارة المنيو
export const canManageMenu = (req: any, res: any, next: any) => {
  const ok = req.user?.canManageMenu || req.user?.role === 'primary' || req.user?.id === 'admin_primary';
  if (!ok) {
    return res.status(403).json({ error: 'ليس لديك صلاحية لإدارة المنيو.' });
  }
  next();
};

// ============================================================
// 🏭  توليد JWT Token
// ============================================================
// دالة مساعدة مركزية لتوليد التوكن — بدل تكرار jwt.sign في كل مكان
export const generateToken = (payload: object, expiresIn = '24h'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
};
export const canUseAIScanner = (req: any, res: any, next: any) => {
  const ok = req.user?.role === 'primary' || req.user?.id === 'admin_primary' || req.user?.canUseAIScanner === true;
  if (!ok) return res.status(403).json({ error: 'ليس لديك صلاحية استخدام ماسح الذكاء الاصطناعي.' });
  next();
};
