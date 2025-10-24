import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import kavenegar from "kavenegar";
import { Prisma, PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import nodemailer from "nodemailer";
import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const prisma = new PrismaClient();

// تبدیل Kavenegar Send به Promise
const kavenegarApi = kavenegar.KavenegarApi({ apikey: process.env.KAVENEGAR_API_KEY as string });
const sendAsync = promisify(kavenegarApi.Send).bind(kavenegarApi);

// Simple rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (!attempts || now > attempts.resetTime) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  attempts.count++;
  return true;
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "نیاز به توکن" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    console.error("خطا در احراز هویت:", (err as Error).message);
    res.status(401).json({ error: "توکن نامعتبر", details: (err as Error).message });
  }
};

// Admin-specific authentication middleware
export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "نیاز به توکن" });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; role: string };
    
    // Check if user exists in database and verify admin role and approved status
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, status: true }
    });
    
    if (!user) {
      return res.status(401).json({ error: "کاربر یافت نشد" });
    }
    
    if (user.role !== 'ADMIN' || user.status !== 'APPROVED') {
      return res.status(403).json({ error: 'دسترسی فقط برای ادمین تأییدشده' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    console.error("خطا در احراز هویت ادمین:", (err as Error).message);
    res.status(401).json({ error: "توکن نامعتبر", details: (err as Error).message });
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  if (!password || password.length < 6) throw new Error("رمز باید حداقل ۶ کاراکتر باشد");
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const generateToken = (user: { id: number; role: string }): string => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (phoneNumber: string, otp: string): Promise<void> => {
  try {
    await sendAsync({
      sender: "1000596446",
      receptor: phoneNumber,
      message: `کد تأیید روبیتک: ${otp}. این کد تا 10 دقیقه معتبر است.`,
    });
  } catch (error) {
    console.error("خطا در ارسال OTP:", error);
    throw new Error("خطا در ارسال OTP");
  }
};

export const sendEmailOTP = async (email: string, otp: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER as string, pass: process.env.EMAIL_PASS as string },
  });
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "کد تأیید روبیتک",
      text: `کد تأیید شما: ${otp}. این کد تا 10 دقیقه معتبر است.`,
    });
  } catch (error) {
    console.error("خطا در ارسال ایمیل OTP:", error);
    throw new Error("خطا در ارسال ایمیل OTP");
  }
};

// ✅ نسخه نهایی register
export const register = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      password,
      role,
      extra,
      familyName,
      nationalId,
      birthDate,
      city,
      region,
      location,
    } = req.body as {
      name: string;
      email: string;
      phoneNumber?: string;
      password: string;
      role: "ADMIN" | "AMBASSADOR" | "DONOR" | "STUDENT";
      extra?: { location?: string };
      familyName?: string;
      nationalId?: string;
      birthDate?: string | Date;
      city?: string;
      region?: string;
      location?: string;
    };

    if (!password || !name || !role) {
      return res.status(400).json({ error: "خطا در ثبت‌نام", details: "نام، رمز و نقش الزامی است" });
    }
    
    // Either email or phoneNumber must be provided
    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "خطا در ثبت‌نام", details: "ایمیل یا شماره تلفن الزامی است" });
    }
    if (!["ADMIN", "AMBASSADOR", "DONOR", "STUDENT"].includes(role)) {
      return res.status(400).json({ error: "خطا در ثبت‌نام", details: "نقش نامعتبر" });
    }

    // Basic validations for new optional fields
    if (phoneNumber != null && phoneNumber !== "") {
      const normalizedPhone = String(phoneNumber).trim();
      if (!/^09\d{9}$/.test(normalizedPhone)) {
        return res.status(400).json({ error: "شماره تلفن نامعتبر است" });
      }
    }
    if (nationalId != null && nationalId !== "") {
      const normalizedNationalId = String(nationalId).trim();
      if (!/^\d{10}$/.test(normalizedNationalId)) {
        return res.status(400).json({ error: "خطا در ثبت‌نام", details: "کد ملی باید ۱۰ رقم باشد" });
      }
    }
    let birthDateValue: Date | null = null;
    if (birthDate != null && birthDate !== "") {
      const dateCandidate = new Date(birthDate);
      if (isNaN(dateCandidate.getTime())) {
        return res.status(400).json({ error: "خطا در ثبت‌نام", details: "تاریخ تولد نامعتبر است" });
      }
      birthDateValue = dateCandidate;
    }

    // Check email uniqueness only if email is provided
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ error: "خطا در ثبت‌نام", details: "ایمیل قبلاً ثبت شده" });
      }
    }

    if (nationalId) {
      const existingNationalId = await prisma.user.findUnique({ where: { nationalId } });
      if (existingNationalId) {
        return res.status(409).json({ error: "خطا در ثبت‌نام", details: "کد ملی قبلاً ثبت شده است" });
      }
    }

    // 🔑 تولید OTP و تاریخ انقضا
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const hashed = await hashPassword(password);

    // 👇 مستقیم OTP و فیلدهای جدید را داخل create ذخیره می‌کنیم
    let user;
    try {
      const createData = {
        name,
        familyName: familyName || null,
        email: email || null,
        phoneNumber: phoneNumber || null,
        password: hashed,
        role: role as "ADMIN" | "AMBASSADOR" | "DONOR" | "STUDENT",
        status: "PENDING",
        nationalId: nationalId || null,
        birthDate: birthDateValue,
        city: city || null,
        region: region || null,
        location: location || null,
        otp,
        otpExpiry,
      } as unknown as Prisma.UserUncheckedCreateInput;

      user = await prisma.user.create({
        data: createData,
      });
    } catch (err) {
      // Handle unique constraint errors gracefully
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const target = (err.meta as { target?: string[] } | undefined)?.target || [];
        if (target.includes("nationalId")) {
          return res.status(409).json({ error: "خطا در ثبت‌نام", details: "کد ملی قبلاً ثبت شده است" });
        }
        if (target.includes("email")) {
          return res.status(409).json({ error: "خطا در ثبت‌نام", details: "ایمیل قبلاً ثبت شده" });
        }
        if (target.includes("phoneNumber")) {
          return res.status(409).json({ error: "خطا در ثبت‌نام", details: "شماره موبایل قبلاً ثبت شده است" });
        }
      }
      throw err;
    }

    console.log("✅ کاربر جدید ایجاد شد:", { id: user.id, email, role, otp, otpExpiry });

    if (role === "STUDENT") {
      if (!extra?.location) return res.status(400).json({ error: "خطا در ثبت‌نام", details: "موقعیت برای دانش‌آموز الزامی است" });
      await prisma.student.create({ data: { name, location: extra.location } });
      console.log("✅ دانش‌آموز جدید ایجاد شد:", { name, location: extra.location });
    }

    if (role === "AMBASSADOR") {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      page.drawText("قرارداد تعهد روبیتک", { x: 50, y: 350, size: 20 });
      page.drawText(`سفیر: ${name}` , { x: 50, y: 320, size: 12 });
      const pdfBytes = await pdfDoc.save();
      const pdfPath = path.join(__dirname, "../../uploads", `contract_${user.id}.pdf`);
      await fs.mkdir(path.dirname(pdfPath), { recursive: true });
      await fs.writeFile(pdfPath, pdfBytes);

      await prisma.contract.create({
        data: { userId: user.id, pdfUrl: pdfPath } as Prisma.ContractUncheckedCreateInput,
      });
      console.log("✅ قرارداد برای سفیر ایجاد شد:", { userId: user.id, pdfPath });
    }

    // 🚀 ارسال OTP در بک‌گراند (تأثیری روی ثبت‌نام نداره)
    if (phoneNumber) {
      sendOTP(phoneNumber, otp)
        .then(() => console.log("📲 OTP SMS ارسال شد"))
        .catch((err) => console.error("❌ خطا در ارسال OTP SMS:", err));
    } else if (email) {
      sendEmailOTP(email, otp)
        .then(() => console.log("📧 OTP ایمیل ارسال شد"))
        .catch((err) => console.error("❌ خطا در ارسال OTP ایمیل:", err));
    }

    return res.json({ message: "کد تأیید ارسال شد", userId: user.id });
  } catch (error) {
    console.error("❌ خطا در ثبت‌نام:", (error as Error)?.message ?? error);
    return res.status(500).json({ error: "خطا در ثبت‌نام", details: (error as Error)?.message ?? String(error) });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "ایمیل و کد OTP الزامی است" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });
    if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ error: "کد OTP نامعتبر یا منقضی شده" });
    }
    await prisma.user.update({ where: { email }, data: { otp: null, otpExpiry: null } });
    res.json({ message: "OTP تأیید شد" });
  } catch (error) {
    console.error("خطا در تأیید OTP:", (error as Error).message);
    res.status(500).json({ error: "خطا در تأیید کد", details: (error as Error).message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "ایمیل الزامی است" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { otp, otpExpiry } });

    if (user.phoneNumber) await sendOTP(user.phoneNumber, otp);
    else await sendEmailOTP(email, otp);

    res.json({ message: "کد تأیید ارسال شد", userId: user.id });
  } catch (error) {
    console.error("خطا در ارسال کد:", (error as Error).message);
    res.status(500).json({ error: "خطا در ارسال کد", details: (error as Error).message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "ایمیل، کد و رمز جدید الزامی است" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.otp !== otp || (user.otpExpiry && new Date() > user.otpExpiry)) {
      return res.status(400).json({ error: "کد نامعتبر یا منقضی شده" });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { email }, data: { password: hashed, otp: null, otpExpiry: null } });
    res.json({ message: "رمز با موفقیت تغییر کرد" });
  } catch (error) {
    console.error("خطا در تغییر رمز:", (error as Error).message);
    res.status(500).json({ error: "خطا در تغییر رمز", details: (error as Error).message });
  }
};

export const sendOTPToPhone = async (phoneNumber: string, otp: string): Promise<void> => {
  try {
    await sendAsync({
      sender: "1000596446",
      receptor: phoneNumber,
      message: `کد تأیید روبیتک: ${otp}. این کد تا 10 دقیقه معتبر است.`,
    });
  } catch (error) {
    console.error("خطا در ارسال OTP به تلفن:", error);
    throw new Error("خطا در ارسال OTP به تلفن");
  }
};

export const verifyPhoneOTP = async (phoneNumber: string, otp: string): Promise<{ id: number; role: string } | null> => {
  try {
    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) return null;
    
    if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return null;
    }
    
    // Clear OTP after successful verification
    await prisma.user.update({ 
      where: { phoneNumber }, 
      data: { otp: null, otpExpiry: null } 
    });
    
    return { id: user.id, role: user.role };
  } catch (error) {
    console.error("خطا در تأیید OTP تلفن:", (error as Error).message);
    throw new Error("خطا در تأیید OTP تلفن");
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password, phoneNumber } = req.body;

  if ((!email && !phoneNumber) || !password) {
    return res.status(400).json({ success: false, message: "ایمیل یا شماره تلفن و رمز عبور الزامی است" });
  }

  const identifier = email || phoneNumber || "";

  if (!checkRateLimit(identifier)) {
    return res.status(429).json({
      success: false,
      message: "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً 15 دقیقه دیگر تلاش کنید",
    });
  }

  try {
    // 1) تلاش برای ورود به عنوان کاربر (User)
    let authId: number | null = null;
    let authRole: string | null = null;
    let authName: string | null = null;
    let authEmail: string | null = null;
    let passwordHash: string | null = null;

    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        authId = user.id;
        authRole = user.role;
        authName = user.name ?? null;
        authEmail = user.email ?? null;
        passwordHash = user.password;
      }
    } else if (phoneNumber) {
      const user = await prisma.user.findUnique({ where: { phoneNumber } });
      if (user) {
        authId = user.id;
        authRole = user.role;
        authName = user.name ?? null;
        authEmail = user.email ?? null;
        passwordHash = user.password;
      }
    }

    // 2) اگر در User پیدا نشد، تلاش برای Student
    if (authId === null) {
      let student: { id: number; name: string; email: string | null; password: string | null } | null = null;
      if (email) {
        student = await prisma.student.findFirst({ where: { email } });
      } else if (phoneNumber) {
        student = await prisma.student.findFirst({ where: { phoneNumber } });
      }
      if (student) {
        authId = student.id;
        authRole = "STUDENT";
        authName = student.name;
        authEmail = student.email ?? null;
        passwordHash = student.password ?? null;
      }
    }

    // اگر هیچ رکوردی پیدا نشد
    if (authId === null || !passwordHash || !authRole) {
      return res.status(401).json({ success: false, message: "اطلاعات ورود نامعتبر" });
    }

    // 3) بررسی رمز عبور
    const isPasswordValid = await comparePassword(password, passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "اطلاعات ورود نامعتبر" });
    }

    // 4) موفقیت در ورود
    loginAttempts.delete(identifier);
    const token = generateToken({ id: authId, role: authRole });
    res.json({
      success: true,
      token,
      user: {
        id: authId,
        role: authRole,
        name: authName,
        email: authEmail,
      },
    });
  } catch (error) {
    console.error("خطا در ورود:", (error as Error).message);
    res.status(500).json({ success: false, message: "خطا در ورود", details: (error as Error).message });
  }
};

// Get Google OAuth URL for frontend
export const getGoogleOAuthInfo = (req: Request, res: Response) => {
  try {
    const authUrl = getGoogleAuthURL();
    res.json({ 
      googleAuthUrl: authUrl,
      message: "برای ورود با گوگل، از این URL استفاده کنید" 
    });
  } catch (error) {
    console.error("Google OAuth info error:", (error as Error).message);
    res.status(500).json({ error: "خطا در دریافت اطلاعات OAuth گوگل", details: (error as Error).message });
  }
};

// Google OAuth helper functions
export const getGoogleAuthURL = (): string => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.BASE_URL || "http://localhost:4000"}/auth/google/callback`;
  
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<{ access_token: string; id_token?: string }> => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.BASE_URL || "http://localhost:4000"}/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
};

export const getGoogleUserInfo = async (accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  return await response.json();
};

export const findOrCreateGoogleUser = async (googleUser: {
  id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
}): Promise<{ id: number; role: string }> => {
  try {
    // First, try to find existing user by email
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email }
    });

    if (user) {
      return { id: user.id, role: user.role };
    }

    // If no user found, create a new one with AMBASSADOR role by default
    const newUser = await prisma.user.create({
      data: {
        name: googleUser.given_name || googleUser.name,
        familyName: googleUser.family_name || null,
        email: googleUser.email,
        password: '', // No password for OAuth users
        role: 'AMBASSADOR', // Default role as specified
        status: 'PENDING', // New users need approval
        phoneNumber: null,
        nationalId: null,
        birthDate: null,
        city: null,
        region: null,
        location: null,
        otp: null,
        otpExpiry: null,
      }
    });

    return { id: newUser.id, role: newUser.role };
  } catch (error) {
    console.error("Error in findOrCreateGoogleUser:", (error as Error).message);
    throw new Error("Failed to create or find user");
  }
};