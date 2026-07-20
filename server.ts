import express from "express";
import path from "path";
import net from "net";
import { createServer as createViteServer } from "vite";
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";
import * as XLSX from "xlsx";
import crypto from "crypto";
import { Resend } from "resend";
import {
  admins, users, restaurants, orders, reviews,
  settings, setSetting, getSetting
} from "./src/db.ts";
import {
  hashPassword, comparePassword,
  authenticateToken, isPrimaryAdmin,
  canManageRestaurants, canManageMenu,
  generateToken   // ✅ دالة مركزية جديدة بدل تكرار jwt.sign
} from "./src/auth";
import { initDB } from "./src/db.ts";
import { generateOtpCode, normalizeEmail, normalizePhone } from "./src/otp";

dotenv.config();

declare global {
  namespace Express {
    interface Request { user?: any; }
  }
}

console.log(process.env.TURSO_DATABASE_URL);

const app  = express();
const PORT = Number(process.env.PORT) || 3001;

app.set("trust proxy", 1);

// ────────────────────────────────────────────────────────────
// 🛡️  SECURITY HEADERS
// ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: *; " +
    "connect-src 'self' ws://localhost:* https://*.googleapis.com https://api.mutafer.com https://*.tile.openstreetmap.org https://nominatim.openstreetmap.org https://unpkg.com; " +
    "frame-src 'self'; " +
    "object-src 'none'"
  );
  next();
});

// ────────────────────────────────────────────────────────────
// 🏥  HEALTH CHECK
// ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "mutawafer-eats" });
});

// ────────────────────────────────────────────────────────────
// 🛡️  RATE LIMITING
// ────────────────────────────────────────────────────────────
interface RateLimitRecord { count: number; resetAt: number; }
const rateLimiterCache = new Map<string, RateLimitRecord>();

function createRateLimiter(windowMs: number, maxRequests: number, arabicMsg: string, englishMsg: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip  = req.ip || req.headers["x-forwarded-for"] || "unknown_ip";
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    // تنظيف دوري للكاش (5% من الطلبات)
    if (Math.random() < 0.05) {
      for (const [k, v] of rateLimiterCache.entries()) {
        if (now > v.resetAt) rateLimiterCache.delete(k);
      }
    }

    const record = rateLimiterCache.get(key);
    if (!record || now > record.resetAt) {
      rateLimiterCache.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({
        error: arabicMsg,
        errorEn: englishMsg,
        retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000)
      });
    }
    next();
  };
}

const authLimiter = createRateLimiter(
  10 * 60 * 1000, 15,
  "لقد قمت بعدة محاولات متكررة. يرجى الانتظار ١٠ دقائق وإعادة المحاولة حمايةً لحسابك.",
  "Too many attempts. Please wait 10 minutes."
);
const orderLimiter = createRateLimiter(
  5 * 60 * 1000, 15,
  "عفواً، لقد تجاوزت الحد الأقصى لإرسال الطلبات المتتالية. الرجاء المحاولة بعد ٥ دقائق.",
  "Rate limit exceeded for placing orders. Please try again in 5 minutes."
);

interface OtpSession {
  code: string;
  expiresAt: number;
  verified: boolean;
}

const otpSessions = new Map<string, OtpSession>();

// ─── Email OTP Sender ───────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(toEmail: string, code: string): Promise<void> {
  const appName = "مسافر إيتس";
  const { error } = await resend.emails.send({
    from: "Mutawafer Eats <onboarding@resend.dev>",
    to: toEmail,
    subject: `${code} — رمز التحقق لـ ${appName}`,
    html: `
      <div style="direction:rtl;font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:48px;">🛵</span>
          <h2 style="color:#f94c10;margin:8px 0 0;font-size:22px;">${appName}</h2>
        </div>
        <p style="font-size:15px;color:#333;margin-bottom:8px;">مرحباً 👋</p>
        <p style="font-size:14px;color:#555;line-height:1.6;">رمز التحقق الخاص بك هو:</p>
        <div style="background:#fff7f5;border:2px dashed #f94c10;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
          <span style="font-size:40px;font-weight:900;letter-spacing:8px;color:#f94c10;font-family:monospace;">${code}</span>
        </div>
        <p style="font-size:12px;color:#888;text-align:center;">صالح لمدة 5 دقائق فقط — لا تشاركه مع أحد</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="font-size:11px;color:#aaa;text-align:center;">لو ما طلبتش الرمز ده، تجاهل الإيميل ده.</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

function getOtpKey(email: string): string {
  return normalizeEmail(email);
}

function createOtpSession(email: string): string {
  const key = getOtpKey(email);
  const code = generateOtpCode();
  otpSessions.set(key, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    verified: false,
  });
  console.log(`[OTP] code for ${key}: ${code}`);
  return code;
}

function verifyOtpSession(email: string, code: string): boolean {
  const key = getOtpKey(email);
  const session = otpSessions.get(key);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    otpSessions.delete(key);
    return false;
  }
  if (session.code !== code) return false;
  session.verified = true;
  otpSessions.set(key, session);
  return true;
}

app.use("/api/admins/login",    authLimiter);
app.use("/api/users/login",     authLimiter);
app.use("/api/admins/register", authLimiter);
app.use("/api/users/register",  authLimiter);

// ────────────────────────────────────────────────────────────
// 🛡️  INPUT SANITIZATION
// ────────────────────────────────────────────────────────────
function cleanValue(val: any): any {
  if (typeof val === "string") {
    return val
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
      .replace(/on\w+\s*=/gi, "blocked-attr=")
      .replace(/javascript:/gi, "blocked-protocol:")
      .trim();
  }
  if (Array.isArray(val)) return val.map(cleanValue);
  if (val !== null && typeof val === "object") {
    const cleaned: any = {};
    for (const k of Object.keys(val)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      cleaned[k] = cleanValue(val[k]);
    }
    return cleaned;
  }
  return val;
}

// ✅ body parsers أولاً — عشان req.body يكون موجود قبل الـ sanitization
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// ✅ sanitization تانياً — دلوقتي req.body متاح
app.use((req, res, next) => {
  if (req.body) {
    const raw = JSON.stringify(req.body);
    if (raw.includes('"__proto__"') || raw.includes('"constructor"')) {
      return res.status(400).json({ error: "تعديل غير مسموح بالطلب!", errorEn: "Invalid request properties detected." });
    }
    req.body = cleanValue(req.body);
  }
  if (req.query)  req.query  = cleanValue(req.query);
  if (req.params) req.params = cleanValue(req.params);
  next();
});

// ────────────────────────────────────────────────────────────
// 🏭  INITIALIZE DEFAULT DATA
// ────────────────────────────────────────────────────────────
(async function init() {
  try {
    await initDB();

    // ✅ أنشئ الأدمن الافتراضي بس لو مش موجود — لا تـ overwrite البيانات الموجودة
    const existingAdmin = await admins.get("admin_primary");
    if (!existingAdmin) {
      await admins.set("admin_primary", {
        id: "admin_primary",
        name: "عبد الرحمن كشك",
        email: "bdalrhmnkshk412@gmail.com",
        password: await hashPassword("admin"),
        role: "primary",
        canManageRestaurants: 1,
        canManageMenu: 1,
        canUseAIScanner: 1,
      });
      console.log("✅ Default admin created for the first time.");
    } else {
      console.log("✅ Admin already exists — skipping default creation.");
    }
  } catch (error) {
    console.error("❌ Startup initialization failed:", error);
  }
})();

// ────────────────────────────────────────────────────────────
// 🛠️  HELPERS
// ────────────────────────────────────────────────────────────
async function getSettings() {
  const data = await settings.get("main");
  if (!data) {
    const defaults = {
      whatsappNumber: "201016789012", deliveryPricingType: "area",
      distanceBaseFee: 10, distanceFeePerKm: 5,
      deliveryCommissionType: "flat", deliveryCommissionValue: 15,
      aboutUsContent: "تطبيق مسافر...", logoImage: "", deliveryOptions: [], coupons: [], categories: [],
    };
    await settings.set("main", defaults);
    return defaults;
  }
  return data;
}

// ============================================================
// 🧾  حساب سعر الطلب server-side
// ============================================================
// ❌ المشكلة القديمة:
//    const order = req.body;
//    orders.set(order.id, order);
//    → المستخدم يبعت totalAmount=0 ويشتري مجاناً!
//
// ✅ الحل: السيرفر يحسب السعر بنفسه من بيانات المطاعم المحفوظة
//    ولا يثق بأي سعر يجي من الـ frontend.
// ============================================================
async function calculateOrderTotal(
  items: Array<{ menuItem: { id: string }; quantity: number }>,
  restaurantId: string,
  deliveryFee: number
): Promise<{ subtotal: number; total: number; validatedItems: any[] } | null> {

  const restaurant: any = await restaurants.get(restaurantId); // ✅ await
  if (!restaurant) return null;

  const menu: any[] = restaurant.menu || [];
  let subtotal = 0;
  const validatedItems: any[] = [];

  for (const cartItem of items) {
    const menuItem = menu.find((m: any) => m.id === cartItem.menuItem.id);
    if (!menuItem) {
      // صنف غير موجود في المطعم — نرفض الطلب كله
      return null;
    }
    const qty = Math.max(1, Math.floor(cartItem.quantity));
    subtotal += menuItem.price * qty;
    validatedItems.push({ ...cartItem, menuItem, quantity: qty });
  }

  const total = Math.max(0, subtotal + (deliveryFee || 0));
  return { subtotal, total, validatedItems };
}

// ────────────────────────────────────────────────────────────
// 📡  API ENDPOINTS
// ────────────────────────────────────────────────────────────

// ── Settings ─────────────────────────────────────────────────
app.get("/api/settings", async (_req, res) => {
  res.json(await getSettings());
});

app.put("/api/settings", authenticateToken, isPrimaryAdmin, async (req, res) => {
  await settings.set("main", req.body);
  res.json({ success: true, settings: req.body });
});

// ── Admins ───────────────────────────────────────────────────
app.get("/api/admins", authenticateToken, isPrimaryAdmin, async (_req, res) => {
  // ✅ لا نرسل الـ password في القائمة
  const safeAdmins = (await admins.all()).map(({ password, ...rest }: any) => rest);
  res.json(safeAdmins);
});

app.put("/api/admins", authenticateToken, isPrimaryAdmin, async (req, res) => {
  const adminsList: any[] = req.body;

  for (const admin of adminsList) {
    if (!admin.id) continue; // تجاهل أي admin بدون ID

    const existing = await admins.get(admin.id);

    if (!existing) {
      // ✅ أدمن جديد — hash الـ password وحفظه
      const hashedPassword = admin.password
        ? await hashPassword(admin.password)
        : await hashPassword("123456");

      await admins.set(admin.id, {
        ...admin,
        password: hashedPassword,
      });
    } else {
      // ✅ أدمن موجود — حدّث البيانات واحتفظ بالـ password القديم
      const updated = {
        ...existing,
        ...admin,
        password: existing.password, // ← الـ password من الـ DB دايماً
        id: existing.id,
      };
      await admins.set(admin.id, updated);
    }
  }

  res.json({ success: true });
});

// ── Admin Login ───────────────────────────────────────────────
app.post("/api/admins/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "البريد والرقم السري مطلوبان" });

  const found = (await admins.all()).find((a: any) => a.email?.toLowerCase() === email.toLowerCase());
  if (!found) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

  const isMatch = await comparePassword(password, found.password);
  if (!isMatch) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

  // ✅ استخدام generateToken المركزي بدل jwt.sign المكرر
  const token = generateToken({
    id:    found.id,
    email: found.email,
    // ✅ primary admin دايماً role: 'primary' — حتى لو الـ DB مش محدث
    role:  found.role || (found.id === 'admin_primary' ? 'primary' : 'editor'),
    // ✅ primary admin عنده كل الصلاحيات تلقائياً
    canManageRestaurants: found.role === 'primary' || found.id === 'admin_primary' ? true : !!found.canManageRestaurants,
    canManageMenu:        found.role === 'primary' || found.id === 'admin_primary' ? true : !!found.canManageMenu,
    canUseAIScanner:      found.role === 'primary' || found.id === 'admin_primary' ? true : !!found.canUseAIScanner,
  });

  // ✅ لا نرسل الـ password مطلقاً في الـ response
  res.json({
    success: true,
    token,
    admin: { id: found.id, name: found.name, email: found.email, role: found.role }
  });
});

// ── Admin Register ────────────────────────────────────────────
app.post("/api/admins/register", authenticateToken, isPrimaryAdmin, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "جميع الحقول مطلوبة." });

  if ((await admins.all()).find((a: any) => a.email?.toLowerCase() === email.toLowerCase()))
    return res.status(400).json({ error: "البريد الإلكتروني موجود مسبقاً." });

  const newAdmin = {
    id: crypto.randomUUID(), name,
    email: email.toLowerCase(),
    password: await hashPassword(password),
    role: "editor",
    canManageRestaurants: 1, canManageMenu: 1, canUseAIScanner: 1,
  };
  await admins.set(newAdmin.id, newAdmin);
  res.status(201).json({ success: true, admin: { id: newAdmin.id, name: newAdmin.name, email: newAdmin.email } });
});

// ── Users ─────────────────────────────────────────────────────
app.get("/api/users", authenticateToken, async (_req, res) => {
  // ✅ لا نرسل الـ password hash للمستخدمين
  const safeUsers = (await users.all()).map(({ password, ...rest }: any) => rest);
  res.json(safeUsers);
});

app.post("/api/users/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "البريد الإلكتروني مطلوب." });

  const normalizedEmail = normalizeEmail(email);
  const existingUser = (await users.all()).find((u: any) => normalizeEmail(u.email || "") === normalizedEmail);
  if (existingUser) return res.status(400).json({ error: "البريد الإلكتروني مسجل مسبقاً." });

  const code = createOtpSession(normalizedEmail);

  // ✅ إرسال الإيميل دايماً
  if (!process.env.RESEND_API_KEY) {
    console.error("[OTP] RESEND_API_KEY not set");
    return res.status(500).json({ error: "خدمة الإيميل غير مهيأة. تواصل مع الدعم." });
  }
  try {
    await sendOtpEmail(normalizedEmail, code);
    console.log(`[OTP] Email sent to ${normalizedEmail}`);
    res.json({ success: true, message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني. تحقق من صندوق الوارد أو Spam." });
  } catch (emailErr) {
    console.error("[OTP] Failed to send email:", emailErr);
    return res.status(500).json({ error: "تعذّر إرسال الإيميل. تأكد من صحة البريد الإلكتروني." });
  }
});

app.post("/api/users/verify-otp", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "البريد والرمز مطلوبان." });

  const normalizedEmail = normalizeEmail(email);
  const isValid = verifyOtpSession(normalizedEmail, code);
  if (!isValid) {
    return res.status(400).json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية." });
  }

  res.json({ success: true, message: "تم تأكيد البريد الإلكتروني بنجاح." });
});

app.post("/api/users/register", async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "الاسم، البريد الإلكتروني والرقم السري مطلوبون." });

  const normalizedEmail = normalizeEmail(email);
  const otpSession = otpSessions.get(normalizedEmail);
  if (!otpSession?.verified) {
    return res.status(400).json({ error: "يرجى تأكيد البريد الإلكتروني أولاً." });
  }

  if ((await users.all()).find((u: any) => normalizeEmail(u.email || "") === normalizedEmail))
    return res.status(400).json({ error: "البريد الإلكتروني مسجل مسبقاً." });

  const userRole   = role === "captain" ? "captain" : "customer";
  const newUser: any = {
    id: crypto.randomUUID(), name,
    email: normalizedEmail,
    phone: phone || "",
    password: await hashPassword(password),
    role: userRole,
    status: userRole === "captain" ? "pending" : "approved",
  };
  await users.set(newUser.id, newUser);
  otpSessions.delete(normalizedEmail);

  // ✅ لا نرسل الـ password في الـ response
  res.status(201).json({
    success: true,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role, status: newUser.status }
  });
});

app.post("/api/users/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password)
    return res.status(400).json({ error: "رقم الموبايل والرقم السري مطلوبان" });

  const normalizedPhone = normalizePhone(phone);
  const found = (await users.all()).find((u: any) => normalizePhone(u.phone || "") === normalizedPhone);
  if (!found) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

  const isMatch = await comparePassword(password, found.password);
  if (!isMatch) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

  // ✅ استخدام generateToken المركزي
  const token = generateToken({ id: found.id, phone: found.phone, role: found.role || "customer" });

  // ✅ لا نرسل الـ password مطلقاً
  res.json({
    success: true,
    token,
    user: { id: found.id, name: found.name, email: found.email, phone: found.phone, role: found.role, status: found.status }
  });
});

// ── Captain Location Tracking ─────────────────────────────────
// in-memory store للمواقع (زي الـ OTP sessions)
const captainLocations = new Map<string, { lat: number; lng: number; updatedAt: string; orderId?: string }>();

// الكابتن يبعت موقعه
app.post("/api/captain/location", authenticateToken, async (req, res) => {
  const { lat, lng, orderId } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: "lat and lng required" });
  captainLocations.set(req.user.id, {
    lat: Number(lat),
    lng: Number(lng),
    updatedAt: new Date().toISOString(),
    orderId,
  });
  res.json({ success: true });
});

// العميل يجيب موقع الكابتن بتاع أوردره
app.get("/api/captain/location/:orderId", authenticateToken, async (req, res) => {
  const { orderId } = req.params;
  const order: any = await orders.get(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  // بحث عن الكابتن المرتبط بالأوردر ده
  for (const [captainId, loc] of captainLocations.entries()) {
    if (loc.orderId === orderId) {
      return res.json({ success: true, location: loc });
    }
  }
  res.json({ success: true, location: null });
});

// الأدمن يشوف كل المواقع
app.get("/api/captain/locations/all", authenticateToken, isPrimaryAdmin, async (_req, res) => {
  const locs: any[] = [];
  captainLocations.forEach((loc, captainId) => {
    locs.push({ captainId, ...loc });
  });
  res.json(locs);
});

// ── Captains ──────────────────────────────────────────────────
app.get("/api/captains", authenticateToken, isPrimaryAdmin, async (_req, res) => {
  const captains = (await users.all()).filter((u: any) => u.role === "captain")
    .map(({ password, ...rest }: any) => rest); // ✅ بدون password
  res.json(captains);
});

app.put("/api/captains/:id/status", authenticateToken, isPrimaryAdmin, async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  const usersList  = await users.all();
  const idx        = usersList.findIndex((u: any) => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Captain not found" });
  usersList[idx].status = status;
  await users.set(id, usersList[idx]);
  const { password, ...safe } = usersList[idx] as any;
  res.json({ success: true, user: safe });
});

app.delete("/api/captains/:id", authenticateToken, isPrimaryAdmin, async (req, res) => {
  await users.delete(req.params.id);
  res.json({ success: true });
});

// ── Orders ────────────────────────────────────────────────────
app.get("/api/orders", authenticateToken, async (req, res) => {
  const allOrders = await orders.all();
  const isAdmin = req.user?.role === "admin" || req.user?.role === "primary" || req.user?.id === "admin_primary";
  if (isAdmin) return res.json(allOrders);
  res.json(allOrders.filter((o: any) => o.userId === req.user?.id));
});

// ============================================================
// ✅ POST /api/orders — مع حساب الأسعار server-side
// ============================================================
// ❌ الكود القديم (سطر 109 في server.ts الأصلي):
//    app.post("/api/orders", orderLimiter);
//    ← كان route فارغ مكرر — حُذف الآن
//
// ❌ الكود القديم (سطر 467):
//    const order = req.body;
//    orders.set(order.id, order);
//    ← السيرفر يثق بكل حاجة جاية من الـ client!
//
// ✅ الآن: السيرفر يحسب السعر بنفسه ولا يقبل totalAmount من الـ client
// ============================================================
app.post("/api/orders", authenticateToken, orderLimiter, async (req, res) => {
  const body = req.body;

  // 1. التحقق من وجود الحقول الأساسية
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "الطلب يجب أن يحتوي على أصناف." });
  }
  if (!body.restaurantId) {
    return res.status(400).json({ error: "معرّف المطعم مطلوب." });
  }

  // 2. حساب السعر من الـ database (لا نثق بـ body.total أو body.subtotal)
  const deliveryFee = typeof body.deliveryFee === "number" ? body.deliveryFee : 0;
  const calculated  = await calculateOrderTotal(body.items, body.restaurantId, deliveryFee);

  if (!calculated) {
    return res.status(400).json({
      error: "بعض الأصناف في طلبك غير متاحة حالياً أو تم تعديل أسعارها. يرجى تحديث صفحتك وإعادة الطلب."
    });
  }

  // 3. بناء الطلب بالبيانات الموثوقة من الـ server
  const newOrder: any = {
    id:              crypto.randomUUID(),
    userId:          req.user.id,           // من الـ JWT (موثوق)
    restaurantId:    body.restaurantId,
    restaurant:      await restaurants.get(body.restaurantId),
    items:           calculated.validatedItems,
    subtotal:        calculated.subtotal,   // ✅ محسوب server-side
    deliveryFee:     deliveryFee,
    discount:        0,                     // TODO: تطبيق الكوبونات هنا لاحقاً
    total:           calculated.total,      // ✅ محسوب server-side
    status:          "Received",
    createdAt:       new Date().toISOString(),
    customerName:    body.customerName    || "",
    customerPhone:   body.customerPhone   || "",
    deliveryAddress: body.deliveryAddress || "",
    paymentMethod:   body.paymentMethod   || "cash",
    paymentDetails:  body.paymentDetails  || "",
    notes:           body.notes           || "",
    eta:             24,
  };

  await orders.set(newOrder.id, newOrder);
  res.status(201).json(newOrder);
});

app.put("/api/orders/:id/status", authenticateToken, async (req, res) => {
  const { id }                                    = req.params;
  const { status, eta, courierName, courierPhone } = req.body;
  const order: any                                 = await orders.get(id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (status)       order.status       = status;
  if (eta)          order.eta          = eta;
  if (courierName)  order.courierName  = courierName;
  if (courierPhone) order.courierPhone = courierPhone;

  await orders.set(id, order);
  res.json(order);
});

// ── Restaurants ───────────────────────────────────────────────
app.get("/api/restaurants", async (_req, res) => {
  res.json(await restaurants.all());
});

app.post("/api/restaurants", authenticateToken, canManageRestaurants, async (req, res) => {
  const newRest = { ...req.body, id: crypto.randomUUID() };
  await restaurants.set(newRest.id, newRest);
  res.status(201).json(newRest);
});

app.put("/api/restaurants/:id", authenticateToken, canManageRestaurants, async (req, res) => {
  const { id } = req.params;
  const existing: any = await restaurants.get(id);
  if (!existing) return res.status(404).json({ error: "Restaurant not found" });
  const updated = { ...existing, ...req.body, id };
  await restaurants.set(id, updated);
  res.json(updated);
});

app.delete("/api/restaurants/:id", authenticateToken, canManageRestaurants, async (req, res) => {
  await restaurants.delete(req.params.id);
  res.json({ success: true });
});

app.post("/api/restaurants/:id/menu", authenticateToken, canManageMenu, async (req, res) => {
  const { id } = req.params;
  const rest: any = await restaurants.get(id);
  if (!rest) return res.status(404).json({ error: "Restaurant not found" });

  const items = Array.isArray(req.body) ? req.body : [req.body];
  const menu  = rest.menu || [];
  for (const item of items) {
    item.id = item.id || crypto.randomUUID();
    if (item.category) item.category = item.category.toLowerCase(); // ✅ normalize
    // ✅ ضيف id لكل حجم لو مش موجود
    if (item.sizes && Array.isArray(item.sizes)) {
      item.sizes = item.sizes.map((sz: any) => ({
        ...sz,
        id: sz.id || `${item.id || crypto.randomUUID()}_${sz.name}`,
      }));
    }
    menu.push(item);
  }
  rest.menu = menu;
  await restaurants.set(id, rest);
  res.status(201).json(items);
});

// ── Reviews ───────────────────────────────────────────────────
app.get("/api/reviews", async (_req, res) => {
  res.json(await reviews.all());
});

app.post("/api/reviews", authenticateToken, async (req, res) => {
  const newReview = { ...req.body, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await reviews.set(newReview.id, newReview);
  res.status(201).json(newReview);
});

// ────────────────────────────────────────────────────────────
// 🤖  GEMINI / LOCAL PARSER
// ────────────────────────────────────────────────────────────
// (كود الـ parser لم يتغير — فقط نقلناه كما هو)

function parseSpreadsheetLocally(fileDataBase64: string, isCsv: boolean): any[] {
  try {
    const buffer = Buffer.from(fileDataBase64, "base64");
    let rows: any[] = [];

    if (isCsv) {
      const text = buffer.toString("utf-8");
      rows = text.split("\n").map(line => {
        const result: string[] = [];
        let current = "", inQuotes = false;
        for (const char of line) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
          else current += char;
        }
        result.push(current.trim());
        return result;
      });
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      if (workbook.SheetNames.length > 0) {
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[];
      }
    }
    if (!rows || rows.length === 0) return [];

    let headerIdx = -1, nameCol = -1, priceCol = -1, descCol = -1, catCol = -1;
    const nameKeys  = ["name","item","dish","product","الاسم","الوجبة","المنتج","الصنف","العنصر"];
    const priceKeys = ["price","cost","rate","السعر","سعر","القيمة","ثمن"];
    const descKeys  = ["description","desc","ingredient","ingredients","الوصف","المكونات","تفاصيل","شرح"];
    const catKeys   = ["category","group","type","القسم","الفئة","نوع","التصنيف","العائلة"];

    for (let r = 0; r < Math.min(6, rows.length); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || "").toLowerCase().trim();
        if (!cell) continue;
        if (nameKeys.some(k => cell.includes(k))  && nameCol  === -1) { nameCol  = c; headerIdx = r; }
        if (priceKeys.some(k => cell.includes(k)) && priceCol === -1) { priceCol = c; headerIdx = r; }
        if (descKeys.some(k => cell.includes(k))  && descCol  === -1) { descCol  = c; headerIdx = r; }
        if (catKeys.some(k => cell.includes(k))   && catCol   === -1) { catCol   = c; headerIdx = r; }
      }
      if (nameCol !== -1 && priceCol !== -1) break;
    }

    if (nameCol  === -1) nameCol  = 0;
    if (priceCol === -1) priceCol = 1;
    if (descCol  === -1) descCol  = nameCol + 2;
    if (catCol   === -1) catCol   = nameCol + 3;

    const startIndex = headerIdx !== -1 ? headerIdx + 1 : 0;
    const categoriesSeed = ["Burgers","Pizza","Salads","Sushi","Ramen","Dessert","Sides","Drinks","Offers"];
    const items: any[] = [];

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || row.length <= Math.max(nameCol, priceCol)) continue;
      const rawName = String(row[nameCol] || "").trim();
      if (!rawName || rawName.toLowerCase() === "null" || rawName.length < 2) continue;

      const rawPriceVal = row[priceCol];
      let cleanPrice = 50;
      if (typeof rawPriceVal === "number") cleanPrice = rawPriceVal;
      else if (rawPriceVal) cleanPrice = parseFloat(String(rawPriceVal).replace(/[^\d.]/g, ""));
      if (isNaN(cleanPrice) || cleanPrice <= 0) cleanPrice = 45;

      const rawDesc = descCol < row.length ? String(row[descCol] || "").trim() : "";
      const rawCat  = catCol  < row.length ? String(row[catCol]  || "").trim() : "";

      let category = "Sides";
      if (rawCat) {
        const match = categoriesSeed.find(c => c.toLowerCase() === rawCat.toLowerCase());
        category = match || rawCat;
      } else {
        const n = rawName.toLowerCase();
        if (n.includes("برجر")  || n.includes("burger"))  category = "Burgers";
        else if (n.includes("بيتزا") || n.includes("pizza"))   category = "Pizza";
        else if (n.includes("سلط")  || n.includes("salad"))   category = "Salads";
        else if (n.includes("سوشي") || n.includes("sushi"))   category = "Sushi";
        else if (n.includes("رامن") || n.includes("ramen"))   category = "Ramen";
        else if (n.includes("حلو")  || n.includes("dessert")  || n.includes("كيك")) category = "Dessert";
        else if (n.includes("عصير") || n.includes("بيبسي")   || n.includes("drink")) category = "Drinks";
        else if (n.includes("عرض")  || n.includes("وجبة")    || n.includes("offer")) category = "Offers";
      }

      // ✅ دمج الأحجام: لو في صنف بنفس الـ base name موجود، ضيف الحجم ده عليه
      const sizeKeywords = ["صغير","وسط","كبير","صغيرة","وسطة","كبيرة","small","medium","large","فردي","عائلي","عادي","ميديوم","لارج","سمول"];
      const baseName = rawName.replace(new RegExp(`\\s*(${sizeKeywords.join("|")})\\s*`, "i"), "").trim();
      const sizeMatch = rawName.match(new RegExp(`(${sizeKeywords.join("|")})`, "i"));

      if (sizeMatch && baseName && baseName !== rawName) {
        // صنف له حجم — دور على الصنف الأساسي
        const existing = items.find((it: any) => it.name === baseName && it.category === category);
        if (existing) {
          if (!existing.sizes) existing.sizes = [{ name: "عادي", price: existing.price }];
          existing.sizes.push({ name: sizeMatch[1], price: cleanPrice });
          if (cleanPrice < existing.price) existing.price = cleanPrice;
          continue;
        } else {
          items.push({
            name: baseName,
            description: rawDesc || `${baseName} - وجبة شهية غنية بالمكونات الطازجة.`,
            price: cleanPrice,
            category,
            sizes: [{ name: sizeMatch[1], price: cleanPrice }],
          });
        }
      } else {
        items.push({
          name: rawName,
          description: rawDesc || `${rawName} - وجبة شهية غنية بالمكونات الطازجة.`,
          price: cleanPrice,
          category,
        });
      }
    }
    return items;
  } catch (err) {
    console.error("Local spreadsheet fallback parser error:", err);
    return [];
  }
}

app.post("/api/gemini/parse-menu", async (req, res) => {
  let isSpreadsheet = false, isCsvFile = false, fileData = "", fileName = "";

  try {
    const { fileData: rawFileData, mimeType, fileName: rawFileName, customInstructions } = req.body;
    fileData = rawFileData;
    fileName = rawFileName;

    if (!fileData || !mimeType)
      return res.status(400).json({ error: "Missing fileData or mimeType" });

    const fileLower    = fileName ? fileName.toLowerCase() : "";
    const isXmlExcel   = mimeType.includes("sheet") || mimeType.includes("officedocument.spreadsheetml");
    const isBinExcel   = mimeType.includes("excel") || mimeType.includes("vnd.ms-excel") || mimeType.includes("application/octet-stream");
    isCsvFile          = mimeType.includes("csv") || fileLower.endsWith(".csv");
    const isExcelExt   = fileLower.endsWith(".xlsx") || fileLower.endsWith(".xls");
    if (isXmlExcel || isBinExcel || isCsvFile || isExcelExt) isSpreadsheet = true;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      if (isSpreadsheet) {
        const localItems = parseSpreadsheetLocally(fileData, isCsvFile);
        if (localItems.length > 0)
          return res.json({ success: true, items: localItems, isLocalFallback: true,
            warning: "تم استخراج الوجبات محلياً من ملف Excel (لم يُفعَّل مفتاح Gemini API)." });
      }
      return res.status(500).json({ error: "مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مكوّن." });
    }

    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });

    const prompt = `أنت مساعد متخصص في قراءة صور وملفات قوائم طعام المطاعم واستخراجها لتطبيق مسافر إيتس.

## قواعد اللغة — إلزامية:
- name و description بالعربية حصراً.
- أي اسم إنجليزي يُترجم فوراً: Crispy Chicken = دجاج مقرمش، Pizza Margherita = بيتزا مارجريتا.
- ممنوع أي حرف إنجليزي في name أو description.

## قواعد الأحجام — إلزامية:
- كثير من المناطق في المنيو تحتوي على جداول فيها أعمدة للأحجام مثل: ص/و/ك أو صغير/وسط/كبير أو S/M/L أو فردي/عائلي.
- إذا رأيت صنفاً بأكثر من سعر (سواء في أعمدة أو صفوف متعددة)، اجمعها في صنف واحد مع sizes array.
- sizes تحتوي على كل حجم واسمه وسعره.
- price الرئيسي = أقل سعر في الأحجام.
- ممنوع تكرار نفس الصنف كعناصر منفصلة — صنف واحد يضم كل أحجامه.
- إذا الصنف بسعر واحد فقط، sizes تكون array فارغة [].

## مثال على جدول بأحجام (ص=صغير، و=وسط، ك=كبير):
المنيو يقول: ميكس السوري | ص:170 | و:190 | ك:210
الناتج الصح:
{"name":"بيتزا ميكس السوري","description":"بيتزا إيطالية بمكس السوري الشهي","price":170,"category":"Pizza","sizes":[{"name":"صغير","price":170},{"name":"وسط","price":190},{"name":"كبير","price":210}]}

## مثال على صنف بسعر واحد:
{"name":"بطاطس","description":"بطاطس مقلية مقرمشة","price":70,"category":"Sides","sizes":[]}

## قواعد العروض — إلزامية:
- إذا وجدت صنفاً مكتوباً عليه سعران (سعر قديم مشطوب + سعر جديد، أو "بدلاً من X يصبح Y"، أو علامة % خصم، أو كلمة "عرض" بجانبه): اجعل category = "Offers" دائماً مهما كانت فئته الأصلية (برجر، بيتزا، إلخ).
- في هذه الحالة أضف originalPrice = السعر الأعلى (الأصلي)، و price = السعر الأقل (سعر العرض الحالي).
- إذا الصنف بسعر واحد عادي بدون أي إشارة لخصم، لا تضع originalPrice إطلاقاً ولا تضعه في Offers.
- مثال: "برجر دجاج كان 80 بقى 60ج" يصبح: {"name":"برجر دجاج","price":60,"originalPrice":80,"category":"Offers","sizes":[]}

## الفئات المتاحة: Burgers, Pizza, Salads, Sushi, Ramen, Dessert, Sides, Drinks, Offers

أخرج JSON array فقط بدون أي نص أو markdown.`;
    const finalPrompt = customInstructions?.trim()
      ? `${prompt}\n\n## تعليمات إضافية من المستخدم:\n${customInstructions.trim()}`
      : prompt;

    const callWithRetry = async (params: any, retries = 4, delayMs = 1500) => {
      const models = [params.model, "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      for (let attempt = 1; attempt <= retries; attempt++) {
        params.model = models[Math.min(attempt - 1, models.length - 1)] || params.model;
        try {
          return await ai.models.generateContent(params);
        } catch (error: any) {
          const isTemp = error.message?.includes("503") || error.message?.includes("UNAVAILABLE") || error.message?.includes("429");
          if (attempt < retries && isTemp) {
            await new Promise(r => setTimeout(r, delayMs));
            delayMs *= 2;
          } else throw error;
        }
      }
    };

    let response;
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name:        { type: Type.STRING, description: "اسم الصنف بالعربية" },
          description: { type: Type.STRING, description: "وصف شهي قصير بالعربية" },
          price:       { type: Type.NUMBER, description: "السعر الحالي (سعر العرض لو فيه خصم، أو السعر العادي)" },
          originalPrice: { type: Type.NUMBER, description: "السعر الأصلي قبل الخصم فقط لو الصنف عليه عرض. اتركه 0 لو مفيش عرض." },
          category:    { type: Type.STRING, description: "الفئة. لازم تكون Offers لو الصنف عليه خصم/عرض" },
          sizes: {
            type: Type.ARRAY,
            description: "الأحجام أو الأنواع المختلفة. مصفوفة فارغة [] إذا لم يكن للصنف أحجام. لا تتركها فارغة إذا وجدت أحجام مختلفة في المنيو.",
            items: {
              type: Type.OBJECT,
              properties: {
                name:  { type: Type.STRING, description: "اسم الحجم مثل: صغير، وسط، كبير، فردي، عائلي" },
                price: { type: Type.NUMBER, description: "سعر هذا الحجم" },
              },
              required: ["name", "price"],
            },
          },
        },
        required: ["name", "description", "price", "category", "sizes", "originalPrice"],
      },
    };

    if (isSpreadsheet) {
      const buffer = Buffer.from(fileData, "base64");
      let spreadsheetContent = "";
      try {
        if (isCsvFile) {
          spreadsheetContent = buffer.toString("utf-8");
        } else {
          const wb = XLSX.read(buffer, { type: "buffer" });
          for (const sn of wb.SheetNames) {
            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sn]);
            if (csv.trim()) spreadsheetContent += `Sheet: ${sn}\n${csv}\n\n`;
          }
          spreadsheetContent = spreadsheetContent.trim();
        }
      } catch { spreadsheetContent = ""; }

      if (!spreadsheetContent) {
        const localItems = parseSpreadsheetLocally(fileData, isCsvFile);
        if (localItems.length > 0)
          return res.json({ success: true, items: localItems, isLocalFallback: true });
        return res.status(400).json({ error: "الملف فارغ أو غير صحيح." });
      }

      response = await callWithRetry({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: `Here is the CSV/sheet content:\n\`\`\`csv\n${spreadsheetContent}\n\`\`\`` }, { text: finalPrompt }] },
        config: {
          systemInstruction: "أنت مساعد يستخرج قوائم الطعام. اللغة العربية إلزامية. الأحجام المختلفة تُجمع في صنف واحد مع sizes array.",
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
    } else {
      const supported = ["image/png","image/jpeg","image/webp","image/heic","image/heif","image/gif","application/pdf","text/plain","text/csv","text/html"];
      let finalMimeType = mimeType;
      if (!supported.includes(mimeType)) {
        if      (fileLower.endsWith(".png"))            finalMimeType = "image/png";
        else if (fileLower.endsWith(".jpg") || fileLower.endsWith(".jpeg")) finalMimeType = "image/jpeg";
        else if (fileLower.endsWith(".webp"))           finalMimeType = "image/webp";
        else if (fileLower.endsWith(".pdf"))            finalMimeType = "application/pdf";
        else return res.status(400).json({ error: "صيغة الملف غير مدعومة." });
      }

      response = await callWithRetry({
        model: "gemini-2.5-flash",
        contents: { parts: [{ inlineData: { data: fileData, mimeType: finalMimeType } }, { text: finalPrompt }] },
        config: {
          systemInstruction: "أنت مساعد يستخرج قوائم الطعام. اللغة العربية إلزامية. الأحجام المختلفة تُجمع في صنف واحد مع sizes array.",
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
    }

    const text    = (response?.text || "[]").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    console.log("🤖 Gemini raw response (first 2000 chars):", text.substring(0, 2000));
    let parsed  = JSON.parse(text);

    // ✅ تنظيف originalPrice: لو 0 أو مساوي للسعر العادي، يبقى مفيش عرض حقيقي
    parsed = parsed.map((item: any) => {
      if (!item.originalPrice || item.originalPrice <= item.price) {
        delete item.originalPrice;
      } else {
        // ✅ صنف عليه عرض حقيقي — تأكد إنه في فئة Offers
        item.category = "Offers";
      }
      return item;
    });

    console.log(`🤖 Gemini parsed ${parsed.length} items. First item:`, JSON.stringify(parsed[0]));
    res.json({ success: true, items: parsed });

  } catch (error: any) {
    console.error("Gemini Parsing Error:", error);
    if (isSpreadsheet) {
      const localItems = parseSpreadsheetLocally(fileData, isCsvFile);
      if (localItems.length > 0)
        return res.json({ success: true, items: localItems, isLocalFallback: true,
          warning: "تم استخراج الوجبات محلياً بسبب ضغط مؤقت على خوادم الذكاء الاصطناعي." });
    }
    const is503 = (error.message || "").includes("503") || (error.message || "").includes("UNAVAILABLE");
    res.status(500).json({
      error: is503
        ? "خوادم Gemini مشغولة حالياً. يرجى المحاولة لاحقاً أو رفع ملف Excel."
        : `فشل المعالجة: ${error.message || "خطأ غير معروف"}`
    });
  }
});

// ────────────────────────────────────────────────────────────
// 🚀  START SERVER
// ────────────────────────────────────────────────────────────
async function findAvailablePort(startPort: number, maxAttempts = 20): Promise<number> {
  const hosts = ["0.0.0.0", "127.0.0.1", "::1"];

  for (let port = startPort; port < startPort + maxAttempts; port++) {
    let allFree = true;

    for (const host of hosts) {
      const free = await new Promise<boolean>((resolve) => {
        const tester = net.createServer();
        tester.once("error", () => resolve(false));
        tester.once("listening", () => tester.close(() => resolve(true)));
        tester.listen({ port, host, exclusive: true });
      });

      if (!free) {
        allFree = false;
        break;
      }
    }

    if (allFree) return port;
  }
  return startPort;
}

async function createViteServerWithHmr(preferredPort: number, maxAttempts = 50) {
  for (let port = preferredPort; port < preferredPort + maxAttempts; port++) {
    const hmrOptions: any = { protocol: 'ws', host: '127.0.0.1', port, clientPort: port };
    try {
      const viteServer = await createViteServer({
        configFile: false,
        plugins: [react(), tailwindcss()],
        resolve: {
          alias: {
            '@': path.resolve(process.cwd()),
          },
        },
        server: {
          middlewareMode: true,
          host: '127.0.0.1',
          watch: process.env.DISABLE_HMR === 'true' ? null : {},
          hmr: hmrOptions,
        },
        appType: "spa"
      });
      console.log(`ℹ️ Vite HMR websocket listening on ws://127.0.0.1:${port}`);
      return viteServer;
    } catch (error: any) {
      const isEaddrInUse = error?.code === 'EADDRINUSE' || (error?.message || '').includes('EADDRINUSE');
      if (!isEaddrInUse) throw error;
      console.log(`⚠️ HMR port ${port} is busy. Trying next available port...`);
    }
  }
  throw new Error(`Unable to bind a Vite HMR port near ${preferredPort}`);
}

async function listenOnPort(port: number, maxAttempts = 20) {
  for (let current = port; current < port + maxAttempts; current++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(current, "0.0.0.0", () => resolve());
        server.once("error", reject);
      });
      return current;
    } catch (error: any) {
      if (error?.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error(`Unable to bind any port between ${port} and ${port + maxAttempts - 1}`);
}

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const preferredPort = process.env.VITE_HMR_PORT ? Number(process.env.VITE_HMR_PORT) : Number(process.env.HMR_PORT || 24678);
      const hmrPort = await findAvailablePort(preferredPort, 50);
      if (hmrPort !== preferredPort) {
        console.log(`⚠️ HMR port ${preferredPort} was busy. Using ${hmrPort} instead.`);
      }
      const vite = await createViteServerWithHmr(hmrPort, 50);
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      const { default: serveStatic } = await import("serve-static");
      app.use(serveStatic(distPath));

      app.get("/sitemap.xml", (_req, res) => {
        res.header("Content-Type", "application/xml");
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mutawafer-eats-production.up.railway.app/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
      });

      app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
    }

    const requestedPort = Number(process.env.PORT) || PORT;
    const bindPort = await listenOnPort(requestedPort, 20);
    if (bindPort !== requestedPort) {
      console.log(`⚠️ Port ${requestedPort} was busy. Listening on ${bindPort} instead.`);
    }

    console.log(`🚀 Mutafer Eats server running on port ${bindPort}`);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();