import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { PrismaClient, Prisma, UserStatus, DonationType } from "@prisma/client"; // اضافه کردن UserStatus
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { authenticate, register, verifyOTP, forgotPassword, resetPassword, login, sendOTPToPhone, verifyPhoneOTP, generateOTP, generateToken, getGoogleAuthURL, exchangeCodeForToken, getGoogleUserInfo, findOrCreateGoogleUser, getGoogleOAuthInfo } from "./utils/auth";
import multer from "multer";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ZarinpalCheckout = require("zarinpal-checkout");

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: string };
      file?: Express.Multer.File;
    }
  }
}

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// ZarinPal setup via env (guard against invalid Merchant ID to prevent startup crash)
const ZARINPAL_MERCHANT_ID = String(process.env.ZARINPAL_MERCHANT_ID || "");
const ZARINPAL_SANDBOX = String(process.env.ZARINPAL_SANDBOX || "true").toLowerCase() === "true";
const ZARINPAL_ENABLED = /^[a-f0-9-]{36}$/i.test(ZARINPAL_MERCHANT_ID);

// Create a safe shim when not configured, so app can boot without payment
const zarinpal = ZARINPAL_ENABLED
  ? ZarinpalCheckout.create(ZARINPAL_MERCHANT_ID, ZARINPAL_SANDBOX)
  : {
      PaymentRequest: async () => {
        throw new Error("ZarinPal is not configured: invalid ZARINPAL_MERCHANT_ID");
      },
      PaymentVerification: async () => {
        throw new Error("ZarinPal is not configured: invalid ZARINPAL_MERCHANT_ID");
      },
    };
if (!ZARINPAL_ENABLED) {
  console.warn("[WARN] ZarinPal disabled: set a valid 36-char ZARINPAL_MERCHANT_ID in .env to enable payments.");
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, './uploads/contracts');
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Use the correct route param if available; fall back to generic id or authenticated user id
    const routeAmbassadorId = (req.params as Record<string, string | undefined>)?.ambassadorId;
    const routeIdFallback = (req.params as Record<string, string | undefined>)?.id;
    const ownerId = routeAmbassadorId || routeIdFallback || String(req.user?.id || 'unknown');
    const timestamp = Date.now();
    cb(null, `contract-${ownerId}-${timestamp}.pdf`);
  },
});
const upload = multer({ storage });

// Ensure upload directory exists on startup (non-blocking)
(async () => {
  try {
    await fs.mkdir(path.join(process.cwd(), 'uploads', 'contracts'), { recursive: true });
  } catch {
    // ignore directory creation errors; routes will handle errors if folder missing
  }
})();

// Global validation helpers
function isValidNationalId(id: string): boolean {
  return /^\d{10}$/.test(id);
}

function isValidPhoneNumber(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json());

// Auth routes
app.post("/register", register);
app.post("/verify-otp", verifyOTP);
app.post("/login", login);
app.post("/forgot-password", forgotPassword);
app.post("/reset-password", resetPassword);

// Admin login route
app.post("/api/auth/admin-login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "ایمیل و رمز عبور الزامی است" 
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        status: true,
        name: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "اطلاعات ورود نادرست است" 
      });
    }

    // Check if user role is ADMIN
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized for admin" 
      });
    }

    // Verify password
    const bcrypt = await import('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "اطلاعات ورود نادرست است" 
      });
    }

    // Check if admin is approved
    if (user.status !== 'APPROVED') {
      return res.status(403).json({ 
        success: false, 
        message: "حساب شما در انتظار تأیید است" 
      });
    }

    // Generate JWT token with role
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET || 'your-secret', 
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email
      }
    });

  } catch (error: unknown) {
    console.error("Admin login error:", (error as Error).message);
    res.status(500).json({ 
      success: false, 
      message: "خطا در ورود", 
      details: (error as Error).message 
    });
  }
});

// Google OAuth routes
app.get("/auth/google", (req: Request, res: Response) => {
  try {
    const authUrl = getGoogleAuthURL();
    res.redirect(authUrl);
  } catch (error) {
    console.error("Google OAuth error:", (error as Error).message);
    res.status(500).json({ error: "خطا در تنظیمات OAuth گوگل", details: (error as Error).message });
  }
});

// Get Google OAuth URL for frontend
app.get("/auth/google/info", getGoogleOAuthInfo);

app.get("/auth/google/callback", async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      return res.status(400).json({ error: "خطا در احراز هویت گوگل", details: error });
    }
    
    if (!code) {
      return res.status(400).json({ error: "کد تأیید از گوگل دریافت نشد" });
    }

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code as string);
    
    // Get user info from Google
    const googleUser = await getGoogleUserInfo(tokenData.access_token);
    
    // Find or create user in our database
    const user = await findOrCreateGoogleUser(googleUser);
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Redirect to dashboard or return token
    const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
    res.redirect(`${dashboardUrl}?token=${token}&user=${JSON.stringify({ id: user.id, role: user.role })}`);
    
  } catch (error) {
    console.error("Google OAuth callback error:", (error as Error).message);
    res.status(500).json({ error: "خطا در پردازش احراز هویت گوگل", details: (error as Error).message });
  }
});

// Phone login routes
app.post("/login/phone", async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: "شماره تلفن الزامی است" });

  // Validate phone number format
  if (!/^09\d{9}$/.test(phoneNumber)) {
    return res.status(400).json({ error: "فرمت شماره تلفن نامعتبر است" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      return res.status(404).json({ error: "کاربر با این شماره تلفن یافت نشد" });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { phoneNumber },
      data: { otp, otpExpiry }
    });

    await sendOTPToPhone(phoneNumber, otp);

    res.json({ message: "کد تأیید به شماره تلفن شما ارسال شد" });
  } catch (error) {
    console.error("خطا در ارسال OTP:", (error as Error).message);
    res.status(500).json({ error: "خطا در ارسال کد تأیید", details: (error as Error).message });
  }
});

app.post("/login/phone/verify", async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: "شماره تلفن و کد تأیید الزامی است" });
  }

  try {
    const userData = await verifyPhoneOTP(phoneNumber, otp);
    if (!userData) {
      return res.status(400).json({ error: "کد تأیید نامعتبر یا منقضی شده است" });
    }

    // Update user status if needed (for new registrations)
    const user = await prisma.user.findUnique({ where: { id: userData.id } });
    if (user && user.status === "PENDING") {
      await prisma.user.update({
        where: { id: userData.id },
        data: { status: "APPROVED" }
      });
    }

    const token = generateToken(userData);
    res.json({ 
      message: "ورود موفق", 
      token,
      user: {
        id: userData.id,
        role: userData.role
      }
    });
  } catch (error) {
    console.error("خطا در تأیید OTP:", (error as Error).message);
    res.status(500).json({ error: "خطا در تأیید کد", details: (error as Error).message });
  }
});

// Student registration route
app.post("/api/student/register", async (req: Request, res: Response) => {
  try {
    const { fullName, email, fatherName, nationalId, birthDate, city, region, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "نام کامل، ایمیل و رمز عبور الزامی است" });
    }

    // Email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "فرمت ایمیل نامعتبر است" });
    }

    // National ID validation (if provided)
    if (nationalId && !/^\d{10}$/.test(nationalId)) {
      return res.status(400).json({ message: "کد ملی باید 10 رقم باشد" });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({ message: "رمز عبور باید حداقل 8 کاراکتر باشد" });
    }

    // Check if email already exists
    const existingEmail = await prisma.student.findFirst({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: "ایمیل قبلاً ثبت شده است" });
    }

    // Check if nationalId already exists (if provided)
    if (nationalId) {
      const existingNationalId = await prisma.student.findFirst({ where: { nationalId } });
      if (existingNationalId) {
        return res.status(400).json({ message: "کد ملی قبلاً ثبت شده است" });
      }
    }

    // Hash password
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const student = await prisma.student.create({
      data: {
        name: fullName,
        email,
        password: hashedPassword,
        fatherName: fatherName || null,
        nationalId: nationalId || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        city: city || null,
        region: region || null,
        location: city || region || "نامشخص"
      }
    });

    // Generate JWT token for the student
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign({ id: student.id, role: 'STUDENT' }, process.env.JWT_SECRET || 'your-secret', { expiresIn: '7d' });

    res.status(201).json({ 
      success: true, 
      message: "ثبت‌نام با موفقیت انجام شد",
      token: token,
      student: {
        id: student.id,
        name: student.name,
        email: student.email
      }
    });
  } catch (error: unknown) {
    console.error("Student registration error:", (error as Error).message);
    res.status(500).json({ message: "خطا در ثبت‌نام دانشجو", details: (error as Error).message });
  }
});

// Ambassador registration route
app.post("/api/ambassador/register", async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      emailOrPhone,
      fatherName,
      nationalId,
      birthDateDay,
      birthDateMonth,
      birthDateYear,
      city,
      region,
      password
    } = req.body as {
      fullName?: string;
      emailOrPhone?: string;
      fatherName?: string | null;
      nationalId?: string | null;
      birthDateDay?: string | number | null;
      birthDateMonth?: string | number | null;
      birthDateYear?: string | number | null;
      city?: string | null;
      region?: string | null;
      password?: string;
    };

    if (!fullName || !emailOrPhone || !password) {
      return res.status(400).json({ message: "نام کامل، ایمیل/شماره و رمز عبور الزامی است" });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    const phoneRegex = /^09\d{9}$/;
    const isEmail = emailRegex.test(emailOrPhone);
    const isPhone = phoneRegex.test(emailOrPhone);
    if (!isEmail && !isPhone) {
      return res.status(400).json({ message: "ایمیل یا شماره موبایل نامعتبر است" });
    }

    if (nationalId && !/^\d{10}$/.test(nationalId)) {
      return res.status(400).json({ message: "کد ملی باید 10 رقم باشد" });
    }

    if ((password || '').length < 8) {
      return res.status(400).json({ message: "رمز عبور باید حداقل 8 کاراکتر باشد" });
    }

    // Uniqueness checks
    if (isEmail) {
      const existingEmail = await prisma.user.findUnique({ where: { email: emailOrPhone } });
      if (existingEmail) {
        return res.status(400).json({ message: "ایمیل قبلاً ثبت شده است" });
      }
    }
    if (isPhone) {
      const existingPhone = await prisma.user.findUnique({ where: { phoneNumber: emailOrPhone } });
      if (existingPhone) {
        return res.status(400).json({ message: "شماره موبایل قبلاً ثبت شده است" });
      }
    }
    if (nationalId) {
      const existingNationalId = await prisma.user.findFirst({ where: { nationalId } });
      if (existingNationalId) {
        return res.status(400).json({ message: "کد ملی قبلاً ثبت شده است" });
      }
    }

    // Convert Jalali (Shamsi) date (yyyy/mm/dd) from parts to Gregorian Date
    let birthDate: Date | null = null;
    if (birthDateDay && birthDateMonth && birthDateYear) {
      const d = Number(birthDateDay);
      const m = Number(birthDateMonth);
      const y = Number(birthDateYear);
      const valid = y >= 1300 && y <= 1500 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
      if (!valid) {
        return res.status(400).json({ message: "تاریخ تولد نامعتبر است" });
      }
      // Minimal Jalali to Gregorian conversion (algorithmic) to avoid extra deps
      // Source: adapted from well-known JDN conversion formulas
      const jalaliToGregorian = (jy: number, jm: number, jd: number): [number, number, number] => {
        jy -= jy > 0 ? 979 : 980; // shift epoch
        const jDay = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (6 * 31 + (jm - 7) * 30));
        let gDay = jDay + 79;
        const gy = 1600 + 400 * Math.floor(gDay / 146097); gDay %= 146097;
        let leap = true;
        if (gDay >= 36525) { gDay--; const gy4 = Math.floor(gDay / 36524); gDay %= 36524; if (gy4 >= 4) { gDay++; } else { leap = false; } }
        const gy4c = Math.floor(gDay / 1461); let gd = gDay % 1461; const gy2 = Math.floor(gd / 365) - Math.floor(gd / 1460); gd -= gy2 * 365; const gyy = gy + gy4c * 4 + gy2;
        const gMonthDays = [0,31, ( (gyy % 4 === 0 && gyy % 100 !== 0) || (gyy % 400 === 0) ? 29 : 28 ),31,30,31,30,31,31,30,31,30,31];
        let gm = 0; for (gm = 1; gm < 13 && gd >= gMonthDays[gm]; gm++) { gd -= gMonthDays[gm]; }
        const gg = gd + 1;
        return [gyy, gm, gg];
      };

      const [gy, gm, gd] = jalaliToGregorian(y, m, d);
      birthDate = new Date(Date.UTC(gy, gm - 1, gd));
    }

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: isEmail ? emailOrPhone : null,
        phoneNumber: isPhone ? emailOrPhone : null,
        password: hashedPassword,
        role: 'AMBASSADOR',
        status: 'PENDING',
        familyName: fatherName || null, // optional mapping if needed later
        nationalId: nationalId || null,
        birthDate: birthDate,
        city: city || null,
        region: region || null
      }
    });

    res.status(201).json({ success: true, message: 'درخواست ثبت‌نام سفیر ثبت شد', userId: user.id });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json({ message: 'اطلاعات تکراری (ایمیل/شماره/کدملی)'});
    }
    console.error('Ambassador registration error:', (error as Error).message);
    res.status(500).json({ message: 'خطا در ثبت‌نام سفیر', details: (error as Error).message });
  }
});

// Student registration route
app.post("/api/students/register", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: "تمام فیلدها الزامی است" });
    }

    // Email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "فرمت ایمیل نامعتبر است" });
    }

    // Phone validation
    if (!/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ message: "فرمت شماره موبایل نامعتبر است" });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({ message: "رمز عبور باید حداقل 8 کاراکتر باشد" });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: "ایمیل قبلاً ثبت شده است" });
    }

    // Check if phone already exists
    const existingPhone = await prisma.user.findUnique({ where: { phoneNumber: phone } });
    if (existingPhone) {
      return res.status(400).json({ message: "شماره موبایل قبلاً ثبت شده است" });
    }

    // Hash password
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: firstName,
        familyName: lastName,
        email,
        phoneNumber: phone,
        password: hashedPassword,
        role: "STUDENT",
        status: "PENDING"
      }
    });

    // Generate JWT token
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'your-secret', { expiresIn: '7d' });

    res.json({ success: true, token });
  } catch (error: unknown) {
    console.error("Student registration error:", (error as Error).message);
    res.status(500).json({ message: "خطا در ثبت‌نام دانشجو", details: (error as Error).message });
  }
});

// اضافه کردن API برای Student
app.post("/students", authenticate, async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
  }
  const { name, location } = req.body;
  try {
    const student = await prisma.student.create({
      data: { name, location },
    });
    res.json(student);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در ایجاد دانشجو", details: (error as Error).message });
  }
});

// اضافه کردن API برای Laptop
app.post("/laptops", authenticate, async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
  }
  const { serialNumber, laptopName, studentId } = req.body;
  try {
    const laptop = await prisma.laptop.create({
      data: { serialNumber, laptopName, studentId },
    });
    res.json(laptop);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در ایجاد لپ‌تاپ", details: (error as Error).message });
  }
});

// دانلود PDF قرارداد
app.get("/contracts/:id/download", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const contract = await prisma.contract.findUnique({ where: { id: Number(id) } });
    if (!contract || contract.userId !== req.user?.id || req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }
    if (!contract.pdfUrl) {
      return res.status(404).json({ error: "لطفاً ابتدا PDF قرارداد را آپلود کنید" });
    }
    res.download(contract.pdfUrl);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دانلود PDF", details: (error as Error).message });
  }
});

// آپلود PDF امضاشده
app.post("/contracts/:id/upload", authenticate, upload.single('pdf'), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const contract = await prisma.contract.findUnique({ where: { id: Number(id) } });
    if (!contract || contract.userId !== req.user?.id || req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "فایل PDF الزامی است" });
    }
    const pdfUrl = path.join('uploads/contracts', req.file.filename);
    await prisma.contract.update({
      where: { id: Number(id) },
      data: { pdfUrl, signedAt: new Date() },
    });
    res.json({ message: "PDF امضاشده آپلود شد", pdfUrl });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در آپلود PDF", details: (error as Error).message });
  }
});

// ====== Ambassador Verification APIs (new, non-breaking) ======

// GET /api/ambassador/status/:id - Map DB status to UI-friendly status
app.get("/api/ambassador/status/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = Number(id);
    if (!userId) return res.status(400).json({ error: "شناسه نامعتبر است" });

    // Only the same ambassador or admin can query this status
    if (req.user?.role !== "ADMIN" && req.user?.id !== userId) {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true, name: true }
    });
    if (!user || user.role !== "AMBASSADOR") {
      return res.status(404).json({ error: "سفیر یافت نشد" });
    }

    // Optional: include contract existence info
    const contract = await prisma.contract.findFirst({ where: { userId: userId } });

    const mapStatus = (s: string) => {
      if (s === "APPROVED") return "verified";
      if (s === "PENDING") return "pending";
      return "not_verified";
    };

    return res.json({
      id: user.id,
      name: user.name,
      status: mapStatus(String(user.status)),
      hasContract: Boolean(contract?.pdfUrl),
      signedAt: contract?.signedAt ?? null
    });
  } catch (error: unknown) {
    return res.status(500).json({ error: "خطا در دریافت وضعیت", details: (error as Error).message });
  }
});

// GET /api/ambassadors/status - Current ambassador status (for convenience in frontend)
app.get("/api/ambassadors/status", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "نیاز به ورود" });
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true, status: true, name: true }
    });
    if (!me || me.role !== "AMBASSADOR") return res.status(403).json({ error: "دسترسی فقط برای سفیران" });

    const contract = await prisma.contract.findFirst({ where: { userId: me.id } });

    const mapStatus = (s: string) => {
      if (s === "APPROVED") return "verified";
      if (s === "PENDING") return "pending";
      return "not_verified";
    };
    return res.json({ id: me.id, name: me.name, status: mapStatus(String(me.status)), hasContract: Boolean(contract?.pdfUrl), signedAt: contract?.signedAt ?? null });
  } catch (error: unknown) {
    return res.status(500).json({ error: "خطا در دریافت وضعیت", details: (error as Error).message });
  }
});

// GET /api/contract/download/:ambassadorId - Generate/serve pre-filled contract PDF for ambassador
app.get("/api/contract/download/:ambassadorId", authenticate, async (req: Request, res: Response) => {
  try {
    const { ambassadorId } = req.params;
    const userId = Number(ambassadorId);
    if (!userId) return res.status(400).json({ error: "شناسه نامعتبر است" });

    // Only the same ambassador or admin can download
    if (req.user?.role !== "ADMIN" && req.user?.id !== userId) {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, nationalId: true, city: true, region: true }
    });
    if (!user || user.role !== "AMBASSADOR") {
      return res.status(404).json({ error: "سفیر یافت نشد" });
    }

    // Ensure folder exists
    await fs.mkdir(path.join(process.cwd(), 'uploads', 'contracts'), { recursive: true });

    const contractPath = path.join('uploads', 'contracts', `contract-${userId}.pdf`);
    const absolutePath = path.join(process.cwd(), contractPath);

    // Create a simple PDF contract using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const drawText = (text: string, x: number, y: number, size = 14) => {
      page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
    };

    // Header
    drawText("RubiTech Ambassador Agreement", 160, 800, 18);
    drawText("قرارداد همکاری سفیر روبیتک", 170, 775, 16);

    // Ambassador details (Persian RTL text will render left-to-right as glyphs; acceptable for mock)
    drawText(`نام: ${user.name || '-'}`, 60, 720);
    drawText(`کد ملی: ${user.nationalId || '-'}`, 60, 695);
    drawText(`شهر: ${user.city || '-'} - استان: ${user.region || '-'}`, 60, 670);

    // Body
    drawText("این قرارداد جهت تأیید هویت و پذیرش قوانین همکاری با روبیتک تنظیم می‌گردد.", 60, 630, 12);
    drawText("پس از امضای دیجیتال در vinsign.ir، فایل امضاشده را در سامانه بارگذاری کنید.", 60, 610, 12);

    // Signature area placeholder
    drawText("محل امضا:", 60, 560, 12);
    page.drawRectangle({ x: 120, y: 545, width: 200, height: 40, borderWidth: 1, borderColor: rgb(0, 0, 0) });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(absolutePath, pdfBytes);

    // Upsert contract row
    const existing = await prisma.contract.findFirst({ where: { userId } });
    if (existing) {
      await prisma.contract.update({ where: { id: existing.id }, data: { pdfUrl: contractPath } });
    } else {
      await prisma.contract.create({ data: { userId, laptopId: 0 as unknown as number, pdfUrl: contractPath } as any });
    }

    res.setHeader('Content-Type', 'application/pdf');
    return res.download(absolutePath, `contract-${userId}.pdf`);
  } catch (error: unknown) {
    console.error("Contract download error:", (error as Error).message);
    return res.status(500).json({ error: "خطا در تولید/دانلود قرارداد", details: (error as Error).message });
  }
});

// POST /api/contract/upload/:ambassadorId - Upload signed contract PDF (multer)
app.post("/api/contract/upload/:ambassadorId", authenticate, upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    const { ambassadorId } = req.params;
    const userId = Number(ambassadorId);
    if (!userId) return res.status(400).json({ error: "شناسه نامعتبر است" });
    if (!req.file) return res.status(400).json({ error: "فایل PDF الزامی است" });

    // Only the same ambassador or admin can upload
    if (req.user?.role !== "ADMIN" && req.user?.id !== userId) {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user || user.role !== "AMBASSADOR") return res.status(404).json({ error: "سفیر یافت نشد" });

    const pdfUrl = path.join('uploads', 'contracts', req.file.filename);

    const existing = await prisma.contract.findFirst({ where: { userId } });
    if (existing) {
      await prisma.contract.update({ where: { id: existing.id }, data: { pdfUrl, signedAt: null } });
    } else {
      await prisma.contract.create({ data: { userId, laptopId: 0 as unknown as number, pdfUrl } as any });
    }

    // Keep user in PENDING until admin approves
    await prisma.user.update({ where: { id: userId }, data: { status: "PENDING" } });

    return res.json({ message: "فایل قرارداد با موفقیت بارگذاری شد", pdfUrl, status: "pending" });
  } catch (error: unknown) {
    console.error("Contract upload error:", (error as Error).message);
    return res.status(500).json({ error: "خطا در بارگذاری قرارداد", details: (error as Error).message });
  }
});

// تغییر وضعیت سفیر (APPROVED یا REJECTED)
app.post("/admin/ambassadors/:id/status", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
  }
  if (status !== UserStatus.APPROVED && status !== UserStatus.REJECTED) {
    return res.status(400).json({ error: "وضعیت باید APPROVED یا REJECTED باشد" });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user || user.role !== "AMBASSADOR") {
      return res.status(404).json({ error: "سفیر یافت نشد" });
    }
    if (status === UserStatus.APPROVED) {
      const contract = await prisma.contract.findFirst({ where: { userId: Number(id) } });
      if (!contract || !contract.pdfUrl) {
        return res.status(400).json({ error: "سفیر باید ابتدا PDF قرارداد را آپلود کند" });
      }
    }
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { status },
    });
    res.json({ message: `وضعیت سفیر ${updatedUser.name} به ${status} تغییر کرد` });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در تغییر وضعیت سفیر", details: (error as Error).message });
  }
});

// لیست سفیرهای در انتظار (PENDING)
app.get("/admin/ambassadors/pending", authenticate, async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
  }
  try {
    const pendingAmbassadors = await prisma.user.findMany({
      where: { role: "AMBASSADOR", status: UserStatus.PENDING },
      select: { id: true, name: true, email: true },
    });
    res.json(pendingAmbassadors);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست سفیرهای در انتظار", details: (error as Error).message });
  }
});

// امضای قرارداد
app.post("/sign-contract/:id", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { signatureBase64, laptopId } = req.body;
  if (!signatureBase64) return res.status(400).json({ error: "امضا الزامی است" });

  try {
    const contract = await prisma.contract.findUnique({ where: { id: Number(id) } });
    if (!contract || contract.userId !== req.user?.id || req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی غیرمجاز" });
    }

    if (laptopId) {
      const laptop = await prisma.laptop.findUnique({ where: { id: laptopId } });
      if (!laptop) return res.status(404).json({ error: "لپ‌تاپ یافت نشد" });
      await prisma.contract.update({ where: { id: Number(id) }, data: { laptopId } });
    }

    const pdfBytes = await fs.readFile(contract.pdfUrl || '');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPage(0);
    const sigImage = await pdfDoc.embedPng(Buffer.from(signatureBase64.split(',')[1], 'base64'));
    page.drawImage(sigImage, { x: 50, y: 50, width: 150, height: 50 });
    const updatedBytes = await pdfDoc.save();
    await fs.writeFile(contract.pdfUrl || '', updatedBytes);

    await prisma.contract.update({
      where: { id: Number(id) },
      data: { signatureBase64, signedAt: new Date() },
    });

    res.json({ message: "قرارداد امضا شد", pdfUrl: contract.pdfUrl });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در امضا", details: (error as Error).message });
  }
});

// ایجاد اهدا
app.post("/admin/donations", authenticate, async (req: Request, res: Response) => {
  const { type, laptopId, details } = req.body;
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "دسترسی غیرمجاز" });
  }
  try {
    const donation = await prisma.donation.create({
      data: { userId: req.user.id, type, laptopId, details },
    });
    if (laptopId) {
      await prisma.laptop.update({
        where: { id: laptopId },
        data: { donation: { connect: { id: donation.id } } },
      });
    }
    res.json(donation);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(400).json({ error: "لپ‌تاپ قبلاً به اهدا لینک شده است" });
    } else {
      res.status(500).json({ error: "خطا در افزودن اهدا", details: (error as Error).message });
    }
  }
});

// Ambassador profile routes
// GET /ambassador/profile - Get ambassador profile
app.get("/ambassador/profile", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is ambassador with approved status
    if (req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        familyName: true,
        email: true,
        phoneNumber: true,
        nationalId: true,
        birthDate: true,
        city: true,
        region: true,
        status: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    // Check if user status is approved
    if (user.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران تأیید شده" });
    }

    // Remove status from response
    const { status, ...userProfile } = user;
    res.json(userProfile);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت پروفایل", details: (error as Error).message });
  }
});

// PUT /ambassador/profile - Update ambassador profile
app.put("/ambassador/profile", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is ambassador
    if (req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
    }

    // Check if user exists and has approved status
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (currentUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران تأیید شده" });
    }

    const { familyName, nationalId, phoneNumber, birthDate, city, region } = req.body;

    // Validate nationalId if provided
    if (nationalId) {
      // Check if nationalId is exactly 10 digits
      if (!/^\d{10}$/.test(nationalId)) {
        return res.status(400).json({ error: "شماره ملی باید 10 رقم باشد" });
      }

      // Check if nationalId is unique (excluding current user)
      const existingUser = await prisma.user.findFirst({
        where: {
          nationalId: nationalId,
          id: { not: req.user.id }
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: "شماره ملی نامعتبر" });
      }
    }

    // Validate phoneNumber if provided
    if (phoneNumber) {
      // Check Iranian mobile number format (09xxxxxxxxx)
      if (!/^09\d{9}$/.test(phoneNumber)) {
        return res.status(400).json({ error: "فرمت شماره تلفن نامعتبر است" });
      }

      // Check if phoneNumber is unique (excluding current user)
      const existingPhone = await prisma.user.findFirst({
        where: {
          phoneNumber: phoneNumber,
          id: { not: req.user.id }
        }
      });

      if (existingPhone) {
        return res.status(400).json({ error: "شماره تلفن قبلاً استفاده شده است" });
      }
    }

    // Validate birthDate if provided
    if (birthDate) {
      const parsedBirthDate = new Date(birthDate);
      if (isNaN(parsedBirthDate.getTime())) {
        return res.status(400).json({ error: "تاریخ تولد نامعتبر است" });
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(familyName !== undefined && { familyName }),
        ...(nationalId !== undefined && { nationalId }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(city !== undefined && { city }),
        ...(region !== undefined && { region })
      },
      select: {
        id: true,
        name: true,
        familyName: true,
        email: true,
        phoneNumber: true,
        nationalId: true,
        birthDate: true,
        city: true,
        region: true
      }
    });

    res.json(updatedUser);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(400).json({ error: "اطلاعات تکراری است" });
    }
    res.status(500).json({ error: "خطا در به‌روزرسانی پروفایل", details: (error as Error).message });
  }
});

// دریافت موقعیت‌ها
app.get("/locations", async (req: Request, res: Response) => {
  try {
    const laptops = await prisma.laptop.findMany({
      select: { 
        id: true, 
        serialNumber: true, 
        laptopName: true, 
        locationLat: true, 
        locationLng: true,
        student: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      },
    });
    
    // Transform data to match required format: {id, serialNumber, laptopName, locationLat, locationLng, studentLocation}
    const transformedLaptops = laptops.map(laptop => ({
      id: laptop.id,
      serialNumber: laptop.serialNumber,
      laptopName: laptop.laptopName,
      locationLat: laptop.locationLat,
      locationLng: laptop.locationLng,
      studentLocation: laptop.student?.location || null
    }));
    
    res.json(transformedLaptops);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت موقعیت‌ها", details: (error as Error).message });
  }
});

// Map data endpoint - returns GeoJSON format for easy frontend mapping
app.get("/map-data", async (req: Request, res: Response) => {
  try {
    const laptops = await prisma.laptop.findMany({
      select: { 
        id: true, 
        serialNumber: true, 
        laptopName: true, 
        locationLat: true, 
        locationLng: true,
        student: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      },
    });
    
    // Filter to only include laptops with coordinates
    const laptopsWithCoordinates = laptops.filter(laptop => 
      laptop.locationLat !== null && laptop.locationLng !== null
    );
    
    // Create GeoJSON FeatureCollection
    const geoJsonData = {
      type: "FeatureCollection",
      features: laptopsWithCoordinates.map(laptop => ({
        type: "Feature",
        properties: {
          id: laptop.id,
          serialNumber: laptop.serialNumber,
          laptopName: laptop.laptopName,
          studentName: laptop.student?.name || null,
          studentLocation: laptop.student?.location || null
        },
        geometry: {
          type: "Point",
          coordinates: [laptop.locationLng, laptop.locationLat]
        }
      }))
    };
    
    res.json(geoJsonData);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت داده‌های نقشه", details: (error as Error).message });
  }
});

// Geocoding endpoint for converting student addresses to coordinates
app.post("/students/:id/geocode", authenticate, async (req: Request, res: Response) => {
  try {
    // Check authentication and authorization
    if (req.user?.role !== "ADMIN" && req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین و سفیران" });
    }

    const { id } = req.params;
    const studentId = Number(id);

    // Find the student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, location: true }
    });

    if (!student) {
      return res.status(404).json({ error: "دانش‌آموز یافت نشد" });
    }

    if (!student.location) {
      return res.status(400).json({ error: "آدرس دانش‌آموز موجود نیست" });
    }

    // Check if user is ambassador and owns this student
    if (req.user?.role === "AMBASSADOR") {
      const studentWithAmbassador = await prisma.student.findUnique({
        where: { id: studentId },
        select: { introducedByUserId: true }
      });

      if (!studentWithAmbassador || studentWithAmbassador.introducedByUserId !== req.user.id) {
        return res.status(403).json({ error: "شما فقط می‌توانید دانش‌آموزان خود را جغرافیایی کنید" });
      }
    }

    // Check if Google Maps API key is configured
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleMapsApiKey) {
      return res.status(500).json({ error: "کلید API گوگل مپ‌ز تنظیم نشده است" });
    }

    // Call Google Maps Geocoding API
    const encodedAddress = encodeURIComponent(student.location);
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}&components=country:IR`;
    
    const response = await fetch(geocodingUrl);
    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return res.status(400).json({ 
        error: "آدرس قابل جغرافیایی نیست", 
        details: data.error_message || data.status 
      });
    }

    const result = data.results[0];
    const location = result.geometry.location;
    const lat = location.lat;
    const lng = location.lng;

    // Find all laptops linked to this student
    const laptops = await prisma.laptop.findMany({
      where: { studentId: studentId },
      select: { id: true, serialNumber: true, laptopName: true }
    });

    if (laptops.length === 0) {
      return res.status(400).json({ error: "هیچ لپ‌تاپی به این دانش‌آموز اختصاص داده نشده است" });
    }

    // Update all laptops with the geocoded coordinates
    const updatedLaptops: Array<{
      id: number;
      serialNumber: string;
      laptopName: string;
      locationLat: number | null;
      locationLng: number | null;
    }> = [];
    for (const laptop of laptops) {
      const updatedLaptop = await prisma.laptop.update({
        where: { id: laptop.id },
        data: { locationLat: lat, locationLng: lng },
        select: { id: true, serialNumber: true, laptopName: true, locationLat: true, locationLng: true }
      });
      updatedLaptops.push(updatedLaptop);
    }

    // Broadcast update via WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({ type: "map-update", data: updatedLaptops }));
      }
    });

    res.json({ 
      message: "مختصات جغرافیایی با موفقیت به‌روزرسانی شد",
      student: { id: student.id, name: student.name, location: student.location },
      coordinates: { lat, lng },
      updatedLaptops: updatedLaptops.length
    });

  } catch (error: unknown) {
    console.error("Geocoding error:", (error as Error).message);
    res.status(500).json({ error: "خطا در جغرافیایی کردن آدرس", details: (error as Error).message });
  }
});

// به‌روزرسانی موقعیت لپ‌تاپ
app.post("/laptops/:id/location", authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { locationLat, locationLng } = req.body;
  if (!locationLat || !locationLng) return res.status(400).json({ error: "مختصات الزامی است" });

  try {
    const updated = await prisma.laptop.update({
      where: { id: Number(id) },
      data: { locationLat, locationLng },
      select: { id: true, serialNumber: true, laptopName: true, locationLat: true, locationLng: true },
    });
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({ type: "map-update", data: [updated] }));
      }
    });
    res.json(updated);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در به‌روزرسانی موقعیت", details: (error as Error).message });
  }
});

// WebSocket
wss.on("connection", (ws) => {
  console.log("Client connected");
  prisma.laptop
    .findMany({
      select: { 
        id: true, 
        serialNumber: true, 
        laptopName: true, 
        locationLat: true, 
        locationLng: true,
        student: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      },
    })
    .then((laptops) => {
      // Transform data to match required format: {id, serialNumber, laptopName, locationLat, locationLng, studentLocation}
      const transformedLaptops = laptops.map(laptop => ({
        id: laptop.id,
        serialNumber: laptop.serialNumber,
        laptopName: laptop.laptopName,
        locationLat: laptop.locationLat,
        locationLng: laptop.locationLng,
        studentLocation: laptop.student?.location || null
      }));
      ws.send(JSON.stringify({ type: "initial", data: transformedLaptops }));
    })
    .catch((error: unknown) => {
      console.error("Error sending initial data:", (error as Error).message);
    });
  ws.on("close", () => console.log("Client disconnected"));
});

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running ✅");
});

// Ambassador students routes
// CHANGED: Enforce ambassador-only visibility and add minimal filtering and limit support
app.get("/ambassador/students", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
    }

    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true },
    });
    if (!me) return res.status(404).json({ error: "کاربر یافت نشد" });
    if (me.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران تأیید شده" });
    }

    // Optional filters and pagination (minimal)
    const { limit, city, q } = req.query as { limit?: string; city?: string; q?: string };
    const take = Math.max(1, Math.min(Number(limit) || 50, 100));

    const where: Prisma.StudentWhereInput = {
      introducedByUserId: req.user.id,
      ...(city ? { city: { contains: String(city), mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: String(q), mode: "insensitive" } },
              { nationalId: { contains: String(q) } },
              { fatherName: { contains: String(q), mode: "insensitive" } },
              { city: { contains: String(q), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        name: true,
        nationalId: true,
        location: true,
        fatherName: true,
        birthDate: true,
        phoneNumber: true,
        city: true,
      },
      orderBy: { id: "desc" },
      take,
    });

    res.json(students);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت دانش‌آموزان", details: (error as Error).message });
  }
});

app.get("/ambassador/students/search", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
    }

    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true },
    });
    if (!me) return res.status(404).json({ error: "کاربر یافت نشد" });
    if (me.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران تأیید شده" });
    }

    const query = String(req.query.query ?? "").trim();
    if (!query) {
      return res.status(400).json({ error: "کوئری الزامی است" });
    }

    const students = await prisma.student.findMany({
      where: {
        introducedByUserId: req.user.id,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { nationalId: { contains: query } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        nationalId: true,
        location: true,
        fatherName: true,
        birthDate: true,
        phoneNumber: true,
      },
    });

    res.json(students);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در جستجوی دانش‌آموزان", details: (error as Error).message });
  }
});

app.post("/ambassador/students", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
    }

    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true },
    });
    if (!me) return res.status(404).json({ error: "کاربر یافت نشد" });
    if (me.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران تأیید شده" });
    }

    const { name, location, nationalId, fatherName, birthDate, phoneNumber, city } = req.body as {
      name?: string;
      location?: string;
      nationalId?: string | null;
      fatherName?: string | null;
      birthDate?: string | Date | null;
      phoneNumber?: string | null;
      city?: string | null;
    };

    if (!name || !location) {
      return res.status(400).json({ error: "نام و موقعیت الزامی است" });
    }

    if (nationalId != null && nationalId !== "") {
      const normalizedNationalId = String(nationalId).trim();
      if (!isValidNationalId(normalizedNationalId)) {
        return res.status(400).json({ error: "کد ملی باید ۱۰ رقم باشد" });
      }
    }

    let birthDateValue: Date | null = null;
    if (birthDate != null && birthDate !== "") {
      const dateCandidate = new Date(birthDate);
      if (isNaN(dateCandidate.getTime())) {
        return res.status(400).json({ error: "تاریخ تولد نامعتبر است" });
      }
      birthDateValue = dateCandidate;
    }

    const student = await prisma.student.create({
      data: {
        name,
        location,
        nationalId: nationalId ? String(nationalId).trim() : null,
        fatherName: fatherName ?? null,
        birthDate: birthDateValue,
        phoneNumber: phoneNumber ?? null,
        city: city ?? null,
        introducedByUserId: req.user.id,
      },
      select: {
        id: true,
        name: true,
        nationalId: true,
        location: true,
        fatherName: true,
        birthDate: true,
        phoneNumber: true,
        city: true,
      },
    });

    res.json(student);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در ایجاد دانش‌آموز", details: (error as Error).message });
  }
});

// PUT /ambassador/students/:id - Update student
app.put("/ambassador/students/:id", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
    }

    // Check if user is approved ambassador
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true },
    });
    if (!me) return res.status(404).json({ error: "کاربر یافت نشد" });
    if (me.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران تأیید شده" });
    }

    const { id } = req.params;
    const studentId = Number(id);

    // Check ownership first
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      select: { introducedByUserId: true },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: "دانش‌آموز یافت نشد" });
    }

    if (existingStudent.introducedByUserId !== req.user.id) {
      return res.status(403).json({ error: "شما فقط می‌توانید دانش‌آموزان خود را ویرایش کنید" });
    }

    const { name, location, nationalId, fatherName, birthDate, phoneNumber, city } = req.body as {
      name?: string;
      location?: string;
      nationalId?: string | null;
      fatherName?: string | null;
      birthDate?: string | Date | null;
      phoneNumber?: string | null;
      city?: string | null;
    };

    // Validate required fields if provided
    if (name !== undefined && (!name || name.trim() === "")) {
      return res.status(400).json({ error: "نام نمی‌تواند خالی باشد" });
    }

    if (location !== undefined && (!location || location.trim() === "")) {
      return res.status(400).json({ error: "موقعیت نمی‌تواند خالی باشد" });
    }

    // Validate nationalId if provided
    if (nationalId !== undefined && nationalId !== null && nationalId !== "") {
      const normalizedNationalId = String(nationalId).trim();
      if (!isValidNationalId(normalizedNationalId)) {
        return res.status(400).json({ error: "کد ملی باید ۱۰ رقم باشد" });
      }

      // Check if nationalId is unique (excluding current student)
      const existingNationalId = await prisma.student.findFirst({
        where: {
          nationalId: normalizedNationalId,
          id: { not: studentId }
        }
      });

      if (existingNationalId) {
        return res.status(400).json({ error: "کد ملی قبلاً استفاده شده است" });
      }
    }

    // Validate phoneNumber if provided
    if (phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== "") {
      if (!isValidPhoneNumber(phoneNumber)) {
        return res.status(400).json({ error: "فرمت شماره تلفن نامعتبر است" });
      }

      // Check if phoneNumber is unique (excluding current student)
      const existingPhone = await prisma.student.findFirst({
        where: {
          phoneNumber: phoneNumber,
          id: { not: studentId }
        }
      });

      if (existingPhone) {
        return res.status(400).json({ error: "شماره تلفن قبلاً استفاده شده است" });
      }
    }

    // Validate birthDate if provided
    let birthDateValue: Date | null = null;
    if (birthDate !== undefined && birthDate !== null && birthDate !== "") {
      const dateCandidate = new Date(birthDate);
      if (isNaN(dateCandidate.getTime())) {
        return res.status(400).json({ error: "تاریخ تولد نامعتبر است" });
      }
      birthDateValue = dateCandidate;
    }

    // Update student
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(city !== undefined && { city: city ?? null }),
        ...(nationalId !== undefined && { nationalId: nationalId ? String(nationalId).trim() : null }),
        ...(fatherName !== undefined && { fatherName: fatherName ?? null }),
        ...(birthDate !== undefined && { birthDate: birthDateValue }),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber ?? null }),
      },
      select: {
        id: true,
        name: true,
        nationalId: true,
        location: true,
        fatherName: true,
        birthDate: true,
        phoneNumber: true,
        city: true,
      },
    });

    res.json(updatedStudent);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(400).json({ error: "اطلاعات تکراری است" });
    }
    res.status(500).json({ error: "خطا در به‌روزرسانی دانش‌آموز", details: (error as Error).message });
  }
});

// DELETE /ambassador/students/:id - Delete student
app.delete("/ambassador/students/:id", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
    }

    // Check if user is approved ambassador
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true },
    });
    if (!me) return res.status(404).json({ error: "کاربر یافت نشد" });
    if (me.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران تأیید شده" });
    }

    const { id } = req.params;
    const studentId = Number(id);

    // Check ownership first
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      select: { introducedByUserId: true },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: "دانش‌آموز یافت نشد" });
    }

    if (existingStudent.introducedByUserId !== req.user.id) {
      return res.status(403).json({ error: "شما فقط می‌توانید دانش‌آموزان خود را حذف کنید" });
    }

    // Delete the student
    await prisma.student.delete({
      where: { id: studentId },
    });

    res.json({ message: "دانش‌آموز با موفقیت حذف شد" });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در حذف دانش‌آموز", details: (error as Error).message });
  }
});

// CHANGED: Add password change endpoint for ambassadors
app.post("/api/ambassadors/change-password", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "AMBASSADOR") {
      return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
    }

    const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string };
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "رمز فعلی و رمز جدید الزامی است" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "رمز جدید باید حداقل ۶ کاراکتر باشد" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

    const bcrypt = await import("bcrypt");
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "رمز فعلی نادرست است" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    return res.json({ message: "رمز عبور با موفقیت تغییر کرد" });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در تغییر رمز عبور", details: (error as Error).message });
  }
});

// ========== ADMIN PANEL ROUTES ==========

// GET /api/admin/stats - Get dashboard statistics
app.get("/api/admin/stats", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser || adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    // Get counts
    const [
      totalAmbassadors,
      totalStudents,
      totalDonors,
      totalLaptops,
      pendingApprovals,
      approvedAmbassadors,
      pendingContracts
    ] = await Promise.all([
      prisma.user.count({ where: { role: "AMBASSADOR" } }),
      prisma.student.count(),
      prisma.user.count({ where: { role: "DONOR" } }),
      prisma.laptop.count(),
      prisma.user.count({ where: { status: "PENDING", role: { in: ["AMBASSADOR", "DONOR"] } } }),
      prisma.user.count({ where: { role: "AMBASSADOR", status: "APPROVED" } }),
      prisma.contract.count({ where: { signedAt: null } })
    ]);

    // Get recent activities (last 10 users)
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, role: true, status: true, createdAt: true }
    });

    const recentActivities = recentUsers.map(user => ({
      type: user.role === 'AMBASSADOR' ? 'ثبت‌نام سفیر' : user.role === 'DONOR' ? 'ثبت‌نام اهداکننده' : 'ثبت‌نام',
      description: `${user.name || 'کاربر جدید'} ثبت‌نام کرد`,
      date: new Date(user.createdAt).toLocaleDateString('fa-IR'),
      status: user.status === 'APPROVED' ? 'موفق' : 'در انتظار'
    }));

    res.json({
      stats: {
        totalAmbassadors,
        totalStudents,
        totalDonors,
        totalLaptops,
        pendingApprovals,
        approvedAmbassadors,
        pendingContracts
      },
      recentActivities
    });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت آمار", details: (error as Error).message });
  }
});

// GET /api/admin/ambassadors - List all ambassadors
app.get("/api/admin/ambassadors", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser || adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const ambassadors = await prisma.user.findMany({
      where: { role: "AMBASSADOR" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        nationalId: true,
        city: true,
        region: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(ambassadors);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست سفیرها", details: (error as Error).message });
  }
});

// PUT /api/admin/ambassadors/:id/approve - Approve/Reject ambassador
app.put("/api/admin/ambassadors/:id/approve", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser || adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const { id } = req.params;
    const { status } = req.body;
    
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "وضعیت نامعتبر است" });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!user || user.role !== "AMBASSADOR") {
      return res.status(404).json({ error: "سفیر یافت نشد" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { status }
    });

    res.json({ message: `سفیر ${status === 'APPROVED' ? 'تأیید' : 'رد'} شد`, user: updatedUser });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در به‌روزرسانی وضعیت", details: (error as Error).message });
  }
});

// GET /api/admin/donors - List all donors
app.get("/api/admin/donors", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser || adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const donors = await prisma.user.findMany({
      where: { role: "DONOR" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(donors);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست اهداکنندگان", details: (error as Error).message });
  }
});

// POST /api/admin/donors/:id/confirm - Confirm donation
app.post("/api/admin/donors/:id/confirm", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const { id } = req.params;
    
    // This endpoint can be used to confirm donations or donor status
    res.json({ message: "تأیید شد", id });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در تأیید", details: (error as Error).message });
  }
});

// GET /api/admin/contracts - List all contracts
app.get("/api/admin/contracts", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser || adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const contracts = await prisma.contract.findMany({
      select: {
        id: true,
        userId: true,
        laptopId: true,
        pdfUrl: true,
        signedAt: true
      },
      orderBy: { id: 'desc' }
    });

    res.json(contracts);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت قراردادها", details: (error as Error).message });
  }
});

// PATCH /api/admin/laptops/:id - Update laptop location
app.patch("/api/admin/laptops/:id", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const { id } = req.params;
    const { locationLat, locationLng } = req.body;

    const updatedLaptop = await prisma.laptop.update({
      where: { id: Number(id) },
      data: {
        ...(locationLat !== undefined && { locationLat: parseFloat(locationLat) }),
        ...(locationLng !== undefined && { locationLng: parseFloat(locationLng) })
      }
    });

    res.json(updatedLaptop);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در به‌روزرسانی لپ‌تاپ", details: (error as Error).message });
  }
});

// PATCH /api/admin/students/:id - Update student (assign laptop)
app.patch("/api/admin/students/:id", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const { id } = req.params;
    const { laptopId } = req.body;

    if (laptopId) {
      // Update laptop to assign to student
      await prisma.laptop.update({
        where: { id: laptopId },
        data: { studentId: Number(id) }
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: Number(id) }
    });

    res.json({ message: "دانش‌آموز به‌روزرسانی شد", student });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در به‌روزرسانی دانش‌آموز", details: (error as Error).message });
  }
});

// POST /api/admin/users - Create new user (for admin settings)
app.post("/api/admin/users", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "تمام فیلدها الزامی است" });
    }

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        status: "APPROVED"
      }
    });

    res.json({ message: "کاربر ایجاد شد", user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json({ error: "ایمیل قبلاً ثبت شده است" });
    }
    res.status(500).json({ error: "خطا در ایجاد کاربر", details: (error as Error).message });
  }
});

// GET /api/admin/users - List all users
app.get("/api/admin/users", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin with approved status
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phoneNumber: true,
        location: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.user.count();
    res.json({ users, total });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست کاربران", details: (error as Error).message });
  }
});

// PUT /api/admin/users/:id/approve - Approve user
app.put("/api/admin/users/:id/approve", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin with approved status
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const { id } = req.params;
    const userId = Number(id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, status: true }
    });

    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    // Check if user role is AMBASSADOR or DONOR
    if (!["AMBASSADOR", "DONOR"].includes(user.role)) {
      return res.status(400).json({ error: "فقط سفیران و اهداکنندگان قابل تأیید هستند" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: "APPROVED" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phoneNumber: true,
        location: true
      }
    });

    res.json({ message: `کاربر ${updatedUser.name} تأیید شد`, user: updatedUser });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در تأیید کاربر", details: (error as Error).message });
  }
});

// DELETE /api/admin/users/:id - Delete user
app.delete("/api/admin/users/:id", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin with approved status
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const { id } = req.params;
    const userId = Number(id);

    // Check if trying to delete self
    if (userId === req.user.id) {
      return res.status(400).json({ error: "نمی‌توانید خود را حذف کنید" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: `کاربر ${user.name} حذف شد` });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در حذف کاربر", details: (error as Error).message });
  }
});

// GET /admin/students - List all students
app.get("/admin/students", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin with approved status
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        location: true,
        phoneNumber: true
      },
      orderBy: { id: 'desc' }
    });

    res.json(students);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست دانش‌آموزان", details: (error as Error).message });
  }
});

// POST /admin/students - Create student
app.post("/admin/students", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin with approved status
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const { name, location } = req.body;

    if (!name || !location) {
      return res.status(400).json({ error: "نام و موقعیت الزامی است" });
    }

    const student = await prisma.student.create({
      data: {
        name,
        location
      },
      select: {
        id: true,
        name: true,
        location: true,
        phoneNumber: true
      }
    });

    res.json(student);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در ایجاد دانش‌آموز", details: (error as Error).message });
  }
});

// GET /admin/donations - List all donations
app.get("/admin/donations", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin with approved status
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const donations = await prisma.donation.findMany({
      select: {
        id: true,
        type: true,
        userId: true,
        studentId: true,
        amount: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(donations);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست اهداها", details: (error as Error).message });
  }
});

// GET /admin/laptops - List all laptops
app.get("/admin/laptops", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin with approved status
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!adminUser) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const laptops = await prisma.laptop.findMany({
      select: {
        id: true,
        studentId: true,
        locationLat: true,
        locationLng: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(laptops);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست لپ‌تاپ‌ها", details: (error as Error).message });
  }
});

// ========== DONOR PANEL ROUTES ==========

// GET /api/donors/profile - Get donor profile with stats
app.get("/api/donors/profile", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        nationalId: true,
        birthDate: true,
        city: true,
        region: true,
        status: true,
        teachingAreas: true
      }
    });

    if (!user || user.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان تأیید شده" });
    }

    // Get donation stats
    const donations = await prisma.donation.findMany({
      where: { userId: req.user.id },
      include: {
        student: {
          select: { id: true, name: true, location: true }
        },
        laptop: {
          select: { id: true, laptopName: true }
        }
      }
    });

    const totalDonations = donations.length;
    const assignedStudents = new Set(donations.filter(d => d.studentId).map(d => d.studentId)).size;
    const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

    res.json({
      ...user,
      totalDonations,
      assignedStudents,
      totalAmount,
      teachingAreas: user.teachingAreas || []
    });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت پروفایل", details: (error as Error).message });
  }
});

// GET /api/donors/donations - List donor donations
app.get("/api/donors/donations", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    console.log(`Fetching donations for donor user ID: ${req.user.id}`);

    const donations = await prisma.donation.findMany({
      where: { userId: req.user.id },
      include: {
        student: {
          select: { id: true, name: true, location: true }
        },
        laptop: {
          select: { id: true, laptopName: true, serialNumber: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${donations.length} donations for user ${req.user.id}`);

    // Transform data for frontend
    const transformedDonations = donations.map(donation => ({
      id: donation.id,
      type: donation.type,
      laptopName: donation.laptop?.laptopName || null,
      studentName: donation.student?.name || null,
      studentLocation: donation.student?.location || null,
      amount: donation.amount,
      experienceField: donation.experienceField,
      details: donation.details,
      status: 'APPROVED', // Default status for donor view
      createdAt: donation.createdAt
    }));

    res.json(transformedDonations);
  } catch (error: unknown) {
    console.error("Error fetching donations:", (error as Error).message);
    res.status(500).json({ error: "خطا در دریافت لیست اهداها", details: (error as Error).message });
  }
});

// POST /api/donors/donations - Create new donation
app.post("/api/donors/donations", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const { type, laptopName, studentId, amount, experienceField, details } = req.body;

    if (!type || !["LAPTOP", "TEACHING", "MONEY"].includes(type)) {
      return res.status(400).json({ error: "نوع اهدا نامعتبر است" });
    }

    // Validate required fields based on type
    if (type === "LAPTOP" && !laptopName) {
      return res.status(400).json({ error: "نام لپ‌تاپ برای اهدای لپ‌تاپ الزامی است" });
    }

    if (type === "MONEY" && (!amount || amount < 1000)) {
      return res.status(400).json({ error: "مبلغ برای اهدای پول الزامی است (حداقل 1000 تومان)" });
    }

    if (type === "TEACHING" && !experienceField) {
      return res.status(400).json({ error: "حوزه تخصص برای اهدای آموزش الزامی است" });
    }

    // Create donation
    const donation = await prisma.donation.create({
      data: {
        userId: req.user.id,
        type,
        ...(studentId && { studentId: Number(studentId) }),
        ...(amount && { amount: Number(amount) }),
        ...(experienceField && { experienceField }),
        ...(details && { details })
      }
    });

    // If it's a laptop donation, create laptop record
    if (type === "LAPTOP" && laptopName) {
      const laptop = await prisma.laptop.create({
        data: {
          laptopName,
          serialNumber: `LAP-${Date.now()}`, // Generate unique serial
          ...(studentId && { studentId: Number(studentId) })
        }
      });

      // Link laptop to donation
      await prisma.donation.update({
        where: { id: donation.id },
        data: { laptopId: laptop.id }
      });
    }

    res.json({ message: "اهدا با موفقیت ثبت شد", donation });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در ثبت اهدا", details: (error as Error).message });
  }
});

// DELETE /api/donors/donations/:id - Delete donation
app.delete("/api/donors/donations/:id", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const { id } = req.params;
    const donationId = Number(id);

    // Check ownership
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { userId: true }
    });

    if (!donation) {
      return res.status(404).json({ error: "اهدا یافت نشد" });
    }

    if (donation.userId !== req.user.id) {
      return res.status(403).json({ error: "شما فقط می‌توانید اهداهای خود را حذف کنید" });
    }

    // Delete donation (and related laptop if exists)
    await prisma.donation.delete({
      where: { id: donationId }
    });

    res.json({ message: "اهدا با موفقیت حذف شد" });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در حذف اهدا", details: (error as Error).message });
  }
});

// PUT /api/donors/teaching-areas - Update teaching areas
app.put("/api/donors/teaching-areas", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const { teachingAreas } = req.body;

    if (!Array.isArray(teachingAreas)) {
      return res.status(400).json({ error: "حوزه‌های تدریس باید آرایه باشد" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { teachingAreas },
      select: { teachingAreas: true }
    });

    res.json({ message: "حوزه‌های تدریس به‌روزرسانی شد", teachingAreas: user.teachingAreas });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در به‌روزرسانی حوزه‌های تدریس", details: (error as Error).message });
  }
});

// GET /api/students - List students for donor selection
app.get("/api/students", authenticate, async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        location: true,
        phoneNumber: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(students);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست دانشجویان", details: (error as Error).message });
  }
});

// GET /api/admin/students - List all students (admin)
app.get("/api/admin/students", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });
    if (!adminUser || adminUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین تأیید شده" });
    }

    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        location: true,
        phoneNumber: true,
      },
      orderBy: { name: 'asc' }
    });

    // Resolve laptop assignment in one query to avoid N+1
    const laptops = await prisma.laptop.findMany({
      where: { studentId: { not: null } },
      select: { id: true, studentId: true }
    });
    const studentIdToLaptopId = new Map<number, number>();
    for (const l of laptops) {
      if (l.studentId != null) studentIdToLaptopId.set(l.studentId, l.id);
    }

    const enriched = students.map((s) => ({
      ...s,
      laptopId: studentIdToLaptopId.get(s.id) ?? null,
    }));

    res.json(enriched);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت دانش‌آموزان", details: (error as Error).message });
  }
});

// GET /api/admin/students/:id - Get single student (admin)
app.get("/api/admin/students/:id", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "شناسه نامعتبر است" });

    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        location: true,
        phoneNumber: true,
        nationalId: true,
        fatherName: true,
        birthDate: true,
      }
    });
    if (!student) return res.status(404).json({ error: "دانش‌آموز یافت نشد" });

    const laptop = await prisma.laptop.findFirst({ where: { studentId: id }, select: { id: true } });
    return res.json({ ...student, laptopId: laptop?.id ?? null });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت دانش‌آموز", details: (error as Error).message });
  }
});

// GET /api/admin/laptops - List laptops (admin)
app.get("/api/admin/laptops", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }
    const laptops = await prisma.laptop.findMany({
      select: {
        id: true,
        serialNumber: true,
        laptopName: true,
        studentId: true,
      },
      orderBy: { id: 'asc' }
    });
    res.json(laptops);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست لپ‌تاپ‌ها", details: (error as Error).message });
  }
});

// GET /api/student/profile - Get current student profile
app.get("/api/student/profile", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "STUDENT") {
      return res.status(403).json({ error: "دسترسی فقط برای دانش‌آموزان" });
    }

    // Important: Students can authenticate either as a Student entity or as a User with STUDENT role.
    // We first try to load from Student by JWT subject id; if not found, fall back to User by id.
    const student = await prisma.student.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        region: true,
        location: true,
        birthDate: true,
        phoneNumber: true,
        nationalId: true,
      }
    });

    if (student) {
      return res.json(student);
    }

    const userAsStudent = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        region: true,
        location: true,
        birthDate: true,
        phoneNumber: true,
        nationalId: true,
      }
    });

    if (!userAsStudent) {
      return res.status(404).json({ error: "پروفایل یافت نشد" });
    }

    res.json(userAsStudent);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت پروفایل", details: (error as Error).message });
  }
});

// GET /api/student/courses - Minimal placeholder to avoid frontend errors
app.get("/api/student/courses", authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "STUDENT") {
      return res.status(403).json({ error: "دسترسی فقط برای دانش‌آموزان" });
    }
    // Return empty list for now; integrate real courses later
    res.json([]);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت دوره‌ها", details: (error as Error).message });
  }
});
// GET /donor/profile - Get donor profile
app.get("/donor/profile", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is donor with approved status
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        nationalId: true,
        birthDate: true,
        city: true,
        region: true,
        status: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    // Check if user status is approved
    if (user.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان تأیید شده" });
    }

    // Remove status from response
    const { status, ...userProfile } = user;
    res.json(userProfile);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت پروفایل", details: (error as Error).message });
  }
});

// PUT /donor/profile - Update donor profile
app.put("/donor/profile", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is donor
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    // Check if user exists and has approved status
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (currentUser.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان تأیید شده" });
    }

    const { phoneNumber, nationalId } = req.body;

    // Validate phoneNumber if provided
    if (phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== "") {
      if (!isValidPhoneNumber(phoneNumber)) {
        return res.status(400).json({ error: "فرمت شماره تلفن نامعتبر است" });
      }

      // Check if phoneNumber is unique (excluding current user)
      const existingPhone = await prisma.user.findFirst({
        where: {
          phoneNumber: phoneNumber,
          id: { not: req.user.id }
        }
      });

      if (existingPhone) {
        return res.status(400).json({ error: "شماره تلفن قبلاً استفاده شده است" });
      }
    }

    // Validate nationalId if provided
    if (nationalId !== undefined && nationalId !== null && nationalId !== "") {
      if (!isValidNationalId(nationalId)) {
        return res.status(400).json({ error: "شماره ملی باید 10 رقم باشد" });
      }

      // Check if nationalId is unique (excluding current user)
      const existingUser = await prisma.user.findFirst({
        where: {
          nationalId: nationalId,
          id: { not: req.user.id }
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: "شماره ملی نامعتبر" });
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(nationalId !== undefined && { nationalId })
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        nationalId: true,
        birthDate: true,
        city: true,
        region: true
      }
    });

    res.json(updatedUser);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(400).json({ error: "اطلاعات تکراری است" });
    }
    res.status(500).json({ error: "خطا در به‌روزرسانی پروفایل", details: (error as Error).message });
  }
});

// POST /donor/donations - Create donation
app.post("/donor/donations", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is donor with approved status
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (user.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان تأیید شده" });
    }

    const { type, studentId, amount, experienceField } = req.body;

    // Validate donation type
    if (!type || !["LAPTOP", "TEACHING", "MONEY"].includes(type)) {
      return res.status(400).json({ error: "نوع اهدا باید LAPTOP، TEACHING یا MONEY باشد" });
    }

    // Validate studentId if provided
    if (studentId !== undefined && studentId !== null) {
      const student = await prisma.student.findUnique({
        where: { id: Number(studentId) }
      });

      if (!student) {
        return res.status(400).json({ error: "دانش‌آموز یافت نشد" });
      }
    }

    // Validate amount for MONEY donations
    if (type === "MONEY") {
      if (amount === undefined || amount === null || amount <= 0) {
        return res.status(400).json({ error: "مبلغ برای اهدای پول الزامی است" });
      }
    }

    // Create donation
    const donation = await prisma.donation.create({
      data: {
        userId: req.user.id,
        type,
        ...(studentId && { studentId: Number(studentId) }),
        ...(amount && { amount: Number(amount) }),
        ...(experienceField && { experienceField })
      }
    });

    res.json(donation);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در ایجاد اهدا", details: (error as Error).message });
  }
});

// GET /donor/donations - List donor donations
app.get("/donor/donations", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is donor with approved status
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (user.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان تأیید شده" });
    }

    // Get donations filtered by userId
    const donations = await prisma.donation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(donations);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در دریافت لیست اهداها", details: (error as Error).message });
  }
});

// PUT /donor/donations/:id - Update donation
app.put("/donor/donations/:id", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is donor with approved status
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (user.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان تأیید شده" });
    }

    const { id } = req.params;
    const donationId = Number(id);

    // Check ownership first
    const existingDonation = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { userId: true }
    });

    if (!existingDonation) {
      return res.status(404).json({ error: "اهدا یافت نشد" });
    }

    if (existingDonation.userId !== req.user.id) {
      return res.status(403).json({ error: "شما فقط می‌توانید اهداهای خود را ویرایش کنید" });
    }

    const { studentId, amount, experienceField } = req.body;

    // Validate studentId if provided
    if (studentId !== undefined && studentId !== null) {
      const student = await prisma.student.findUnique({
        where: { id: Number(studentId) }
      });

      if (!student) {
        return res.status(400).json({ error: "دانش‌آموز یافت نشد" });
      }
    }

    // Update donation
    const updateData: any = {};
    if (studentId !== undefined) {
      updateData.studentId = studentId ? Number(studentId) : null;
    }
    if (amount !== undefined) {
      updateData.amount = amount ? Number(amount) : null;
    }
    if (experienceField !== undefined) {
      updateData.experienceField = experienceField;
    }

    const updatedDonation = await prisma.donation.update({
      where: { id: donationId },
      data: updateData
    });

    res.json(updatedDonation);
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در به‌روزرسانی اهدا", details: (error as Error).message });
  }
});

// DELETE /donor/donations/:id - Delete donation
app.delete("/donor/donations/:id", authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is donor with approved status
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { status: true }
    });

    if (!user) {
      return res.status(404).json({ error: "کاربر یافت نشد" });
    }

    if (user.status !== "APPROVED") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان تأیید شده" });
    }

    const { id } = req.params;
    const donationId = Number(id);

    // Check ownership first
    const existingDonation = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { userId: true }
    });

    if (!existingDonation) {
      return res.status(404).json({ error: "اهدا یافت نشد" });
    }

    if (existingDonation.userId !== req.user.id) {
      return res.status(403).json({ error: "شما فقط می‌توانید اهداهای خود را حذف کنید" });
    }

    // Delete the donation
    await prisma.donation.delete({
      where: { id: donationId }
    });

    res.json({ message: "اهدا با موفقیت حذف شد" });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در حذف اهدا", details: (error as Error).message });
  }
});

// ========== PAYMENT ROUTES (ZarinPal) ==========
// POST /donor/donations/pay
app.post("/donor/donations/pay", authenticate, async (req: Request, res: Response) => {
  try {
    if (!ZARINPAL_ENABLED) {
      return res.status(503).json({ error: "درگاه پرداخت پیکربندی نشده است. لطفاً ZARINPAL_MERCHANT_ID را در .env تنظیم کنید." });
    }
    if (req.user?.role !== "DONOR") {
      return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
    }

    const { donationId, amount } = req.body as { donationId?: number; amount?: number };
    if (!donationId || !amount) {
      return res.status(400).json({ error: "شناسه اهدا و مبلغ الزامی است" });
    }
    if (Number(amount) < 1000) {
      return res.status(400).json({ error: "مبلغ باید حداقل 1000 تومان باشد" });
    }

    const donation = await prisma.donation.findUnique({ where: { id: Number(donationId) } });
    if (!donation) {
      return res.status(404).json({ error: "اهدا یافت نشد" });
    }
    if (donation.userId !== req.user.id) {
      return res.status(403).json({ error: "شما فقط می‌توانید برای اهداهای خود پرداخت کنید" });
    }
    if (String(donation.type) !== "MONEY") {
      return res.status(400).json({ error: "پرداخت فقط برای اهدای پول مجاز است" });
    }

    // ZarinPal expects amount in Tomans (depending on account settings). We pass as-is in sandbox.
    const description = "کمک مالی به روبیتک";
    const callbackURL = `${process.env.BASE_URL || "http://localhost:4000"}/donor/donations/verify`;

    const result = await zarinpal.PaymentRequest({
      Amount: Number(amount),
      CallbackURL: callbackURL,
      Description: description,
      Email: undefined,
      Mobile: undefined,
    });

    if (result.status === 100 && result.authority) {
      const payment = await (prisma as any).payment.create({
        data: {
          donationId: donation.id,
          status: "PENDING",
          authority: String(result.authority),
          amount: Number(amount),
        },
      });
      const baseUrl = ZARINPAL_SANDBOX ? "https://sandbox.zarinpal.com/pg/StartPay" : "https://www.zarinpal.com/pg/StartPay";
      const paymentUrl = `${baseUrl}/${result.authority}`;
      return res.json({ url: paymentUrl, authority: result.authority, paymentId: payment.id });
    }

    return res.status(502).json({ error: "خطا در پرداخت", details: result.errors || result.status });
  } catch (error: unknown) {
    console.error("Payment error:", (error as Error).message);
    return res.status(500).json({ error: "خطا در پرداخت", details: (error as Error).message });
  }
});

// GET /donor/donations/verify
app.get("/donor/donations/verify", async (req: Request, res: Response) => {
  try {
    if (!ZARINPAL_ENABLED) {
      return res.status(503).json({ error: "درگاه پرداخت پیکربندی نشده است. لطفاً ZARINPAL_MERCHANT_ID را در .env تنظیم کنید." });
    }
    const { Authority, Status } = req.query as { Authority?: string; Status?: string };
    if (!Authority) {
      return res.status(400).json({ error: "پارامتر Authority الزامی است" });
    }

    // Find payment by authority
    const payment = await (prisma as any).payment.findFirst({ where: { authority: String(Authority) }, include: { donation: true } });
    if (!payment) {
      return res.status(404).json({ error: "پرداخت یافت نشد" });
    }

    if (String(Status || '').toLowerCase() !== "ok") {
      await (prisma as any).payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      return res.status(400).json({ error: "پرداخت ناموفق بود" });
    }

    const result = await zarinpal.PaymentVerification({
      Amount: Number(payment.amount),
      Authority: String(Authority),
    });

    if (result.status === 100 || result.status === 101) {
      // Mark success and update donation amount if needed
      await (prisma as any).payment.update({ where: { id: payment.id }, data: { status: "SUCCESS" } });
      if (payment.donation && payment.donation.type === "MONEY") {
        await (prisma as any).donation.update({
          where: { id: payment.donationId },
          data: { amount: Number(payment.amount) },
        });
      }
      const refId = (result as any).RefID ?? (result as any).ref_id ?? (result as any).Authority;
      return res.json({ message: "پرداخت موفق", refId });
    } else {
      await (prisma as any).payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      return res.status(400).json({ error: "پرداخت ناموفق بود", status: result.status });
    }
  } catch (error: unknown) {
    console.error("Verify error:", (error as Error).message);
    return res.status(500).json({ error: "خطا در پرداخت", details: (error as Error).message });
  }
});

// POST /api/donor/register - Register new donor
app.post("/api/donor/register", async (req: Request, res: Response) => {
  try {
    const bcrypt = await import('bcrypt');
    const { fullName, emailOrPhone, professionalField, password } = req.body;

    if (!fullName || !emailOrPhone || !password) {
      return res.status(400).json({ error: "تمام فیلدهای الزامی را پر کنید" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phoneNumber: emailOrPhone }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: "کاربر با این ایمیل یا شماره تلفن قبلاً ثبت شده است" });
    }

    // Create new donor user
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: emailOrPhone.includes('@') ? emailOrPhone : null,
        phoneNumber: !emailOrPhone.includes('@') ? emailOrPhone : null,
        password: await bcrypt.hash(password, 10),
        role: "DONOR",
        status: "PENDING"
      }
    });

    res.json({
      success: true,
      message: "ثبت‌نام با موفقیت انجام شد",
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ error: "خطا در ثبت‌نام", details: (error as Error).message });
  }
});

const PORT = Number(process.env.PORT) || 4000;
server
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  })
  .on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EACCES') {
      console.error(`Permission denied binding to port ${PORT}. Try a different PORT.`);
    } else if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Set a different PORT or stop the other process.`);
    } else {
      console.error('Server listen error:', err);
    }
    process.exit(1);
  });