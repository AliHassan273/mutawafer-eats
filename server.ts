import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";
import * as XLSX from "xlsx";
import crypto from "crypto";
import {
  admins, users, restaurants, orders, reviews,
  settings
} from "./src/db.ts";
import {
  hashPassword, comparePassword,
  authenticateToken, isPrimaryAdmin,
  canManageRestaurants, canManageMenu,
  generateToken
} from "./src/auth";
import { initDB } from "./src/db.ts";

dotenv.config();

declare global {
  namespace Express {
    interface Request { user?: any; }
  }
}

console.log(process.env.TURSO_DATABASE_URL);

const app  = express();
const PORT = Number(process.env.PORT) || 3000;

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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: *; " +
    "connect-src 'self' ws://localhost:* https://*.googleapis.com https://api.mutafer.com; " +
    "frame-src 'self'; " +
    "object-src 'none'"
  );
  next();
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
  await initDB();

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
})();

// ────────────────────────────────────────────────────────────
// 🛠️  HELPERS
// ────────────────────────────────────────────────────────────
async function getSettings() {
  const data = await settings.get("main");
  if (!data) {
    const defaults = {
      whatsappNumber: "201095452533", deliveryPricingType: "area",
      distanceBaseFee: 10, distanceFeePerKm: 5,
      deliveryCommissionType: "flat", deliveryCommissionValue: 15,
      aboutUsContent: "تطبيق متوفر إيتس هو المنصة الرائدة لتوصيل الطعام الفاخر والوجبات الطازجة بأقصى سرعة واحترافية.", deliveryOptions: [], coupons: [], categories: [],
    };
    await settings.set("main", defaults);
    return defaults;
  }
  return data;
}

// ============================================================
// 🧾  حساب سعر الطلب server-side
// ============================================================
async function calculateOrderTotal(
  items: Array<{ menuItem: { id: string }; quantity: number }>,
  restaurantId: string,
  deliveryFee: number
): Promise<{ subtotal: number; total: number; validatedItems: any[] } | null> {

  const restaurant: any = await restaurants.get(restaurantId);
  if (!restaurant) return null;

  const menu: any[] = restaurant.menu || [];
  let subtotal = 0;
  const validatedItems: any[] = [];

  for (const cartItem of items) {
    const menuItem = menu.find((m: any) => m.id === cartItem.menuItem.id);
    if (!menuItem) {
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
  const safeAdmins = (await admins.all()).map(({ password, ...rest }: any) => rest);
  res.json(safeAdmins);
});

app.put("/api/admins", authenticateToken, isPrimaryAdmin, async (req, res) => {
  const adminsList: any[] = req.body;

  const currentAdmins = await admins.all();
  const idsToKeep = new Set(adminsList.map(a => a.id).filter(Boolean));

  for (const existing of currentAdmins) {
    if (!idsToKeep.has(existing.id)) {
      if (existing.role === 'primary') {
        console.warn(`⛔️ Cannot delete primary admin: ${existing.id}`);
        continue;
      }
      await admins.delete(existing.id);
      console.log(`🗑️ Deleted admin: ${existing.id}`);
    }
  }

  for (const admin of adminsList) {
    if (!admin.id) continue;

    const existing = await admins.get(admin.id);
    if (!existing) {
      const hashedPassword = admin.password
        ? await hashPassword(admin.password)
        : await hashPassword("123456");

      await admins.set(admin.id, {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        role: admin.role || 'editor',
        canManageRestaurants: admin.canManageRestaurants ? 1 : 0,
        canManageMenu: admin.canManageMenu ? 1 : 0,
        canUseAIScanner: admin.canUseAIScanner ? 1 : 0,
      });
    } else {
      const updated = {
        ...existing,
        name: admin.name || existing.name,
        email: admin.email || existing.email,
        role: admin.role || existing.role,
        canManageRestaurants: admin.canManageRestaurants !== undefined ? (admin.canManageRestaurants ? 1 : 0) : existing.canManageRestaurants,
        canManageMenu: admin.canManageMenu !== undefined ? (admin.canManageMenu ? 1 : 0) : existing.canManageMenu,
        canUseAIScanner: admin.canUseAIScanner !== undefined ? (admin.canUseAIScanner ? 1 : 0) : existing.canUseAIScanner,
        password: existing.password,
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
  console.log('[Login] Attempt for:', email);

  const found = (await admins.all()).find((a: any) => a.email?.toLowerCase() === email.toLowerCase());
  if (!found) {
    console.log('[Login] User not found');
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }

  console.log('[Login] Found user:', found.id, found.role);

  const isMatch = await comparePassword(password, found.password);
  if (!isMatch) {
    console.log('[Login] Password mismatch');
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }

  const token = generateToken({
    id: found.id,
    email: found.email,
    role: found.role,
    canManageRestaurants: found.canManageRestaurants === 1 || found.canManageRestaurants === true,
    canManageMenu: found.canManageMenu === 1 || found.canManageMenu === true,
    canUseAIScanner: found.canUseAIScanner === 1 || found.canUseAIScanner === true,
  });

  console.log('[Login] Token generated successfully');
  res.json({
    success: true,
    token,
    admin: {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      canManageRestaurants: found.canManageRestaurants === 1 || found.canManageRestaurants === true,
      canManageMenu: found.canManageMenu === 1 || found.canManageMenu === true,
      canUseAIScanner: found.canUseAIScanner === 1 || found.canUseAIScanner === true
    }
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
  res.status(201).json({
    success: true,
    admin: {
      id: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      canManageRestaurants: true,
      canManageMenu: true,
      canUseAIScanner: true
    }
  });
});

// ── Users ─────────────────────────────────────────────────────
app.get("/api/users", authenticateToken, async (_req, res) => {
  const safeUsers = (await users.all()).map(({ password, ...rest }: any) => rest);
  res.json(safeUsers);
});

app.post("/api/users/register", async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !phone || !password)
    return res.status(400).json({ error: "الاسم، رقم الهاتف والرقم السري مطلوبون." });

  if ((await users.all()).find((u: any) => u.phone === phone))
    return res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً." });

  const userRole   = role === "captain" ? "captain" : "customer";
  const newUser: any = {
    id: crypto.randomUUID(), name,
    email: email || "",
    phone,
    password: await hashPassword(password),
    role: userRole,
    status: userRole === "captain" ? "pending" : "approved",
  };
  await users.set(newUser.id, newUser);

  res.status(201).json({
    success: true,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role, status: newUser.status }
  });
});

app.post("/api/users/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password)
    return res.status(400).json({ error: "رقم الموبايل والرقم السري مطلوبان" });

  const found = (await users.all()).find((u: any) => u.phone === phone);
  if (!found) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

  const isMatch = await comparePassword(password, found.password);
  if (!isMatch) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

  const token = generateToken({ id: found.id, phone: found.phone, role: found.role || "customer" });

  res.json({
    success: true,
    token,
    user: { id: found.id, name: found.name, email: found.email, phone: found.phone, role: found.role, status: found.status }
  });
});

// ── Captains ──────────────────────────────────────────────────
app.get("/api/captains", authenticateToken, isPrimaryAdmin, async (_req, res) => {
  const captains = (await users.all()).filter((u: any) => u.role === "captain")
    .map(({ password, ...rest }: any) => rest);
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
  if (req.user?.role === "admin" || req.user?.role === "primary") {
    return res.json(allOrders);
  }
  res.json(allOrders.filter((o: any) => o.userId === req.user?.id));
});

app.post("/api/orders", authenticateToken, orderLimiter, async (req, res) => {
  const body = req.body;

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "الطلب يجب أن يحتوي على أصناف." });
  }
  if (!body.restaurantId) {
    return res.status(400).json({ error: "معرّف المطعم مطلوب." });
  }

  const deliveryFee = typeof body.deliveryFee === "number" ? body.deliveryFee : 0;
  const calculated  = await calculateOrderTotal(body.items, body.restaurantId, deliveryFee);

  if (!calculated) {
    return res.status(400).json({
      error: "بعض الأصناف في طلبك غير متاحة حالياً أو تم تعديل أسعارها. يرجى تحديث صفحتك وإعادة الطلب."
    });
  }

  const newOrder: any = {
    id:              crypto.randomUUID(),
    userId:          req.user.id,
    restaurantId:    body.restaurantId,
    restaurant:      await restaurants.get(body.restaurantId),
    items:           calculated.validatedItems,
    subtotal:        calculated.subtotal,
    deliveryFee:     deliveryFee,
    discount:        0,
    total:           calculated.total,
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
  const restList = await restaurants.all();
  // تطبيع البيانات: تأكد من أن menu و categories مصفوفات
  const normalized = restList.map((r: any) => ({
    ...r,
    menu: Array.isArray(r.menu) ? r.menu : [],
    categories: Array.isArray(r.categories) ? r.categories : [],
  }));
  res.json(normalized);
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
  // تأكد من أن menu مصفوفة
  if (!Array.isArray(updated.menu)) updated.menu = [];
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

// قائمة كلمات الأحجام (معطلة للبحث في النص)
const sizeKeywords = [
  // Arabic with "ال" prefix (long ones first)
  { key: "الصغير جدا", id: "xsmall" },
  { key: "الصغير جداً", id: "xsmall" },
  { key: "الكبير جدا", id: "xlarge" },
  { key: "الكبير جداً", id: "xlarge" },
  { key: "الصغير", id: "small" },
  { key: "الوسط", id: "medium" },
  { key: "الكبير", id: "large" },
  { key: "العائلي", id: "family" },
  { key: "العائلية", id: "family" },
  { key: "النصف", id: "half" },
  { key: "النص", id: "half" },
  { key: "الربع", id: "quarter" },
  { key: "الكامل", id: "whole" },

  // Arabic without "ال" prefix
  { key: "صغير جدا", id: "xsmall" },
  { key: "صغير جداً", id: "xsmall" },
  { key: "كبير جدا", id: "xlarge" },
  { key: "كبير جداً", id: "xlarge" },
  { key: "صغير", id: "small" },
  { key: "وسط", id: "medium" },
  { key: "كبير", id: "large" },
  { key: "عائلي", id: "family" },
  { key: "عائلية", id: "family" },
  { key: "ربع كيلو", id: "quarter_kg" },
  { key: "نصف كيلو", id: "half_kg" },
  { key: "كيلو", id: "one_kg" },
  { key: "ربع", id: "quarter" },
  { key: "نصف", id: "half" },
  { key: "نص", id: "half" },
  { key: "كامل", id: "whole" },
  { key: "كاملة", id: "whole" },
  { key: "سنجل", id: "single" },
  { key: "دبل", id: "double" },
  { key: "تربل", id: "triple" },

  // English sizes
  { key: "extra large", id: "xlarge" },
  { key: "double", id: "double" },
  { key: "single", id: "single" },
  { key: "triple", id: "triple" },
  { key: "quarter", id: "quarter" },
  { key: "small", id: "small" },
  { key: "medium", id: "medium" },
  { key: "large", id: "large" },
  { key: "family", id: "family" },
  { key: "half", id: "half" },
  { key: "whole", id: "whole" },
  { key: "full", id: "whole" },
  { key: "xxl", id: "xxlarge" },
  { key: "xl", id: "xlarge" },
  { key: "lg", id: "large" },
  { key: "md", id: "medium" },
  { key: "sm", id: "small" }
];

/**
 * استخراج اسم الحجم من اسم الصنف
 * @returns { baseName, sizeName, sizeId }
 */
function extractSize(name: string): { baseName: string, sizeName: string, sizeId: string } {
  const nameLower = name.toLowerCase();
  for (const item of sizeKeywords) {
    const index = nameLower.indexOf(item.key.toLowerCase());
    if (index !== -1) {
      const beforeChar = index > 0 ? nameLower[index - 1] : " ";
      const afterChar = index + item.key.length < nameLower.length ? nameLower[index + item.key.length] : " ";
      const boundaries = /[\s\-\/\,\(\)]/;
      if (boundaries.test(beforeChar) && boundaries.test(afterChar)) {
        let base = name.substring(0, index) + name.substring(index + item.key.length);
        base = base.replace(/[\-\/\,\(\)]/g, " ").replace(/\s+/g, " ").trim();
        base = base.replace(/^[\-\/\,\(\)\s\.\_]+|[\-\/\,\(\)\s\.\_]+$/g, "").trim();
        return {
          baseName: base,
          sizeName: item.key,
          sizeId: item.id
        };
      }
    }
  }
  return { baseName: name, sizeName: "", sizeId: "" };
}

/**
 * تجميع الأصناف المتشابهة التي تختلف فقط بالحجم
 * @param items قائمة الأصناف المستخرجة (قد تحتوي على sizes مسبقاً)
 * @returns قائمة مجمعة بحيث كل صنف يحوي مصفوفة sizes
 */
function groupMenuItemsBySizes(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  const grouped: { [key: string]: any } = {};

  items.forEach(item => {
    if (!item || !item.name) return;
    const { baseName, sizeName, sizeId } = extractSize(item.name);

    // استخدام baseName كمفتاح، وإذا لم يوجد حجم استخدم الاسم كاملاً
    const key = baseName || item.name;

    if (!grouped[key]) {
      grouped[key] = {
        name: key,
        description: item.description || "",
        price: item.price || 0,
        category: item.category || "Sides",
        sizes: []
      };
    }

    // إذا كان للصنف sizes مضمّنة من Gemini، ندمجها
    if (item.sizes && Array.isArray(item.sizes)) {
      item.sizes.forEach((sz: any) => {
        if (!sz || !sz.name) return;
        const exists = grouped[key].sizes.some((s: any) => s.name === sz.name);
        if (!exists) {
          grouped[key].sizes.push({
            id: sz.id || sz.name.toLowerCase().replace(/\s+/g, "_"),
            name: sz.name,
            price: Number(sz.price) || item.price
          });
        }
      });
    }

    // إذا كان هناك حجم مستخرج من الاسم، نضيفه
    if (sizeName) {
      const exists = grouped[key].sizes.some((s: any) => s.name === sizeName);
      if (!exists) {
        grouped[key].sizes.push({
          id: sizeId,
          name: sizeName,
          price: Number(item.price)
        });
      }
    }

    // تحديث الوصف إذا كان موجوداً ولم يكن موجوداً سابقاً
    if (item.description && !grouped[key].description) {
      grouped[key].description = item.description;
    }
  });

  // معالجة الناتج: ترتيب الأحجام حسب السعر، وتعيين السعر الأساسي كأقل سعر
  return Object.values(grouped).map((item: any) => {
    if (item.sizes && item.sizes.length > 0) {
      // إزالة التكرارات حسب الاسم
      const uniqueSizes: any[] = [];
      const seenNames = new Set();
      item.sizes.forEach((sz: any) => {
        const nameKey = sz.name.toLowerCase().trim();
        if (!seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          uniqueSizes.push(sz);
        }
      });
      // ترتيب حسب السعر تصاعدياً
      uniqueSizes.sort((a, b) => a.price - b.price);
      // تعيين السعر الأساسي كأقل سعر
      item.price = uniqueSizes[0].price;
      item.sizes = uniqueSizes;
    } else {
      // إذا لم يوجد أحجام، نحذف المفتاح sizes
      delete item.sizes;
    }
    return item;
  });
}

/**
 * تحليل ملفات Excel/CSV محلياً (بدون Gemini)
 * مع تطبيق تجميع الأحجام
 */
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
    const unmergedItems: any[] = [];

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

      unmergedItems.push({
        name: rawName,
        description: rawDesc || `${rawName} - وجبة شهية غنية بالمكونات الطازجة.`,
        price: cleanPrice,
        category,
      });
    }

    return groupMenuItemsBySizes(unmergedItems);
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

    // تعليمات Gemini بالعربية مع التركيز على تجميع الأحجام
    const prompt = `أنت مساعد ذكي متخصص في قراءة قوائم الطعام (منيو المطاعم) واستخراج الأصناف لتطبيق 'متوفر إيتس'.
تعليمات مهمة جداً:
- إذا كان الصنف متوفراً بأحجام أو مقاسات متعددة (مثل: صغير/وسط/كبير، أو ربع/نصف/كامل، أو حسب الوزن مثل ربع كيلو/نصف كيلو/كيلو)، فيجب دمجها في صنف واحد.
- لا تنشئ أصنافاً منفصلة لكل حجم.
- استخرج الصنف كعنصر واحد، واجعل السعر الأساسي (price) هو سعر أصغر حجم (أو الحجم الافتراضي)، وضع قائمة الأحجام مع أسمائها وأسعارها في حقل sizes (مصفوفة).
- استخرج جميع الأطباق والمشروبات المتوفرة مع: الاسم (name)، وصف (description)، السعر (price، رقم عشري)، الفئة (category، واحدة من: Burgers, Pizza, Salads, Sushi, Ramen, Dessert, Sides, Drinks, Offers)، والأحجام (sizes، مصفوفة اختيارية).
- أخرج فقط مصفوفة JSON صالحة بدون أي نصوص إضافية أو تنسيق ماركداون.
- استخدم اللغة العربية في الأسماء والأوصاف إن أمكن، وإذا كانت البيانات بالإنجليزية يمكنك ترجمتها للعربية.

مثال على الصيغة المطلوبة:
[
  {
    "name": "بيتزا سجق",
    "description": "بيتزا بالسجق الإيطالي والجبنة الموزاريلا",
    "price": 120,
    "category": "Pizza",
    "sizes": [
      { "id": "small", "name": "صغير", "price": 120 },
      { "id": "medium", "name": "وسط", "price": 150 },
      { "id": "large", "name": "كبير", "price": 180 }
    ]
  }
]`;

    const finalPrompt = customInstructions?.trim()
      ? `${prompt}\n\nتعليمات إضافية من المستخدم: "${customInstructions.trim()}"`
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
          name:        { type: Type.STRING, description: "اسم الصنف (بالعربية إن أمكن)" },
          description: { type: Type.STRING, description: "وصف مختصر وجذاب للصنف" },
          price:       { type: Type.NUMBER, description: "السعر الأساسي (أقل سعر في حال وجود أحجام)" },
          category:    { type: Type.STRING, description: "الفئة، واحدة من: Burgers, Pizza, Salads, Sushi, Ramen, Dessert, Sides, Drinks, Offers" },
          sizes: {
            type: Type.ARRAY,
            description: "قائمة الأحجام المتوفرة لهذا الصنف (اختياري)",
            items: {
              type: Type.OBJECT,
              properties: {
                id:    { type: Type.STRING, description: "معرف فريد للحجم (مثل: small, medium, large)" },
                name:  { type: Type.STRING, description: "اسم الحجم (مثل: صغير، وسط، كبير، ربع كيلو، نصف كيلو، كيلو)" },
                price: { type: Type.NUMBER, description: "سعر هذا الحجم" }
              },
              required: ["id", "name", "price"]
            }
          }
        },
        required: ["name", "description", "price", "category"],
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
        model: "gemini-3.5-flash",
        contents: { parts: [{ text: `هذا هو محتوى الملف النصي/الإكسل:\n\`\`\`csv\n${spreadsheetContent}\n\`\`\`` }, { text: finalPrompt }] },
        config: { responseMimeType: "application/json", responseSchema: schema },
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
        model: "gemini-3.5-flash",
        contents: { parts: [{ inlineData: { data: fileData, mimeType: finalMimeType } }, { text: finalPrompt }] },
        config: { responseMimeType: "application/json", responseSchema: schema },
      });
    }

    const text    = (response?.text || "[]").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed  = JSON.parse(text);
    const grouped = groupMenuItemsBySizes(parsed);
    res.json({ success: true, items: grouped, menuItems: grouped });

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
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Mutafer Eats server running on port ${PORT}`);
  });
}

startServer();