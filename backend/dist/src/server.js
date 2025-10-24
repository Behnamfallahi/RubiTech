"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const ws_1 = require("ws");
const client_1 = require("@prisma/client"); // اضافه کردن UserStatus
const pdf_lib_1 = require("pdf-lib");
const cors_1 = __importDefault(require("cors"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("./utils/auth");
const multer_1 = __importDefault(require("multer"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ZarinpalCheckout = require("zarinpal-checkout");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
// ZarinPal setup via env
const ZARINPAL_MERCHANT_ID = String(process.env.ZARINPAL_MERCHANT_ID || "");
const ZARINPAL_SANDBOX = String(process.env.ZARINPAL_SANDBOX || "true").toLowerCase() === "true";
const zarinpal = ZarinpalCheckout.create(ZARINPAL_MERCHANT_ID, ZARINPAL_SANDBOX);
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/contracts');
    },
    filename: (req, file, cb) => {
        cb(null, `contract-${req.params.id}-${Date.now()}.pdf`);
    },
});
const upload = (0, multer_1.default)({ storage });
// Global validation helpers
function isValidNationalId(id) {
    return /^\d{10}$/.test(id);
}
function isValidPhoneNumber(phone) {
    return /^09\d{9}$/.test(phone);
}
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Auth routes
app.post("/register", auth_1.register);
app.post("/verify-otp", auth_1.verifyOTP);
app.post("/login", auth_1.login);
app.post("/forgot-password", auth_1.forgotPassword);
app.post("/reset-password", auth_1.resetPassword);
// Google OAuth routes
app.get("/auth/google", (req, res) => {
    try {
        const authUrl = (0, auth_1.getGoogleAuthURL)();
        res.redirect(authUrl);
    }
    catch (error) {
        console.error("Google OAuth error:", error.message);
        res.status(500).json({ error: "خطا در تنظیمات OAuth گوگل", details: error.message });
    }
});
// Get Google OAuth URL for frontend
app.get("/auth/google/info", auth_1.getGoogleOAuthInfo);
app.get("/auth/google/callback", async (req, res) => {
    try {
        const { code, error } = req.query;
        if (error) {
            return res.status(400).json({ error: "خطا در احراز هویت گوگل", details: error });
        }
        if (!code) {
            return res.status(400).json({ error: "کد تأیید از گوگل دریافت نشد" });
        }
        // Exchange code for access token
        const tokenData = await (0, auth_1.exchangeCodeForToken)(code);
        // Get user info from Google
        const googleUser = await (0, auth_1.getGoogleUserInfo)(tokenData.access_token);
        // Find or create user in our database
        const user = await (0, auth_1.findOrCreateGoogleUser)(googleUser);
        // Generate JWT token
        const token = (0, auth_1.generateToken)(user);
        // Redirect to dashboard or return token
        const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
        res.redirect(`${dashboardUrl}?token=${token}&user=${JSON.stringify({ id: user.id, role: user.role })}`);
    }
    catch (error) {
        console.error("Google OAuth callback error:", error.message);
        res.status(500).json({ error: "خطا در پردازش احراز هویت گوگل", details: error.message });
    }
});
// Phone login routes
app.post("/login/phone", async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
        return res.status(400).json({ error: "شماره تلفن الزامی است" });
    // Validate phone number format
    if (!/^09\d{9}$/.test(phoneNumber)) {
        return res.status(400).json({ error: "فرمت شماره تلفن نامعتبر است" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { phoneNumber } });
        if (!user) {
            return res.status(404).json({ error: "کاربر با این شماره تلفن یافت نشد" });
        }
        const otp = (0, auth_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await prisma.user.update({
            where: { phoneNumber },
            data: { otp, otpExpiry }
        });
        await (0, auth_1.sendOTPToPhone)(phoneNumber, otp);
        res.json({ message: "کد تأیید به شماره تلفن شما ارسال شد" });
    }
    catch (error) {
        console.error("خطا در ارسال OTP:", error.message);
        res.status(500).json({ error: "خطا در ارسال کد تأیید", details: error.message });
    }
});
app.post("/login/phone/verify", async (req, res) => {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
        return res.status(400).json({ error: "شماره تلفن و کد تأیید الزامی است" });
    }
    try {
        const userData = await (0, auth_1.verifyPhoneOTP)(phoneNumber, otp);
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
        const token = (0, auth_1.generateToken)(userData);
        res.json({
            message: "ورود موفق",
            token,
            user: {
                id: userData.id,
                role: userData.role
            }
        });
    }
    catch (error) {
        console.error("خطا در تأیید OTP:", error.message);
        res.status(500).json({ error: "خطا در تأیید کد", details: error.message });
    }
});
// Student registration route
app.post("/api/student/register", async (req, res) => {
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
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
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
        const jwt = await Promise.resolve().then(() => __importStar(require('jsonwebtoken')));
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
    }
    catch (error) {
        console.error("Student registration error:", error.message);
        res.status(500).json({ message: "خطا در ثبت‌نام دانشجو", details: error.message });
    }
});
// Student registration route
app.post("/api/students/register", async (req, res) => {
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
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
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
        const jwt = await Promise.resolve().then(() => __importStar(require('jsonwebtoken')));
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'your-secret', { expiresIn: '7d' });
        res.json({ success: true, token });
    }
    catch (error) {
        console.error("Student registration error:", error.message);
        res.status(500).json({ message: "خطا در ثبت‌نام دانشجو", details: error.message });
    }
});
// اضافه کردن API برای Student
app.post("/students", auth_1.authenticate, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }
    const { name, location } = req.body;
    try {
        const student = await prisma.student.create({
            data: { name, location },
        });
        res.json(student);
    }
    catch (error) {
        res.status(500).json({ error: "خطا در ایجاد دانشجو", details: error.message });
    }
});
// اضافه کردن API برای Laptop
app.post("/laptops", auth_1.authenticate, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }
    const { serialNumber, laptopName, studentId } = req.body;
    try {
        const laptop = await prisma.laptop.create({
            data: { serialNumber, laptopName, studentId },
        });
        res.json(laptop);
    }
    catch (error) {
        res.status(500).json({ error: "خطا در ایجاد لپ‌تاپ", details: error.message });
    }
});
// دانلود PDF قرارداد
app.get("/contracts/:id/download", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دانلود PDF", details: error.message });
    }
});
// آپلود PDF امضاشده
app.post("/contracts/:id/upload", auth_1.authenticate, upload.single('pdf'), async (req, res) => {
    const { id } = req.params;
    try {
        const contract = await prisma.contract.findUnique({ where: { id: Number(id) } });
        if (!contract || contract.userId !== req.user?.id || req.user?.role !== "AMBASSADOR") {
            return res.status(403).json({ error: "دسترسی غیرمجاز" });
        }
        if (!req.file) {
            return res.status(400).json({ error: "فایل PDF الزامی است" });
        }
        const pdfUrl = path_1.default.join('uploads/contracts', req.file.filename);
        await prisma.contract.update({
            where: { id: Number(id) },
            data: { pdfUrl, signedAt: new Date() },
        });
        res.json({ message: "PDF امضاشده آپلود شد", pdfUrl });
    }
    catch (error) {
        res.status(500).json({ error: "خطا در آپلود PDF", details: error.message });
    }
});
// تغییر وضعیت سفیر (APPROVED یا REJECTED)
app.post("/admin/ambassadors/:id/status", auth_1.authenticate, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }
    if (status !== client_1.UserStatus.APPROVED && status !== client_1.UserStatus.REJECTED) {
        return res.status(400).json({ error: "وضعیت باید APPROVED یا REJECTED باشد" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: Number(id) } });
        if (!user || user.role !== "AMBASSADOR") {
            return res.status(404).json({ error: "سفیر یافت نشد" });
        }
        if (status === client_1.UserStatus.APPROVED) {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در تغییر وضعیت سفیر", details: error.message });
    }
});
// لیست سفیرهای در انتظار (PENDING)
app.get("/admin/ambassadors/pending", auth_1.authenticate, async (req, res) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({ error: "دسترسی فقط برای ادمین" });
    }
    try {
        const pendingAmbassadors = await prisma.user.findMany({
            where: { role: "AMBASSADOR", status: client_1.UserStatus.PENDING },
            select: { id: true, name: true, email: true },
        });
        res.json(pendingAmbassadors);
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت لیست سفیرهای در انتظار", details: error.message });
    }
});
// امضای قرارداد
app.post("/sign-contract/:id", auth_1.authenticate, async (req, res) => {
    const { id } = req.params;
    const { signatureBase64, laptopId } = req.body;
    if (!signatureBase64)
        return res.status(400).json({ error: "امضا الزامی است" });
    try {
        const contract = await prisma.contract.findUnique({ where: { id: Number(id) } });
        if (!contract || contract.userId !== req.user?.id || req.user?.role !== "AMBASSADOR") {
            return res.status(403).json({ error: "دسترسی غیرمجاز" });
        }
        if (laptopId) {
            const laptop = await prisma.laptop.findUnique({ where: { id: laptopId } });
            if (!laptop)
                return res.status(404).json({ error: "لپ‌تاپ یافت نشد" });
            await prisma.contract.update({ where: { id: Number(id) }, data: { laptopId } });
        }
        const pdfBytes = await promises_1.default.readFile(contract.pdfUrl || '');
        const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBytes);
        const page = pdfDoc.getPage(0);
        const sigImage = await pdfDoc.embedPng(Buffer.from(signatureBase64.split(',')[1], 'base64'));
        page.drawImage(sigImage, { x: 50, y: 50, width: 150, height: 50 });
        const updatedBytes = await pdfDoc.save();
        await promises_1.default.writeFile(contract.pdfUrl || '', updatedBytes);
        await prisma.contract.update({
            where: { id: Number(id) },
            data: { signatureBase64, signedAt: new Date() },
        });
        res.json({ message: "قرارداد امضا شد", pdfUrl: contract.pdfUrl });
    }
    catch (error) {
        res.status(500).json({ error: "خطا در امضا", details: error.message });
    }
});
// ایجاد اهدا
app.post("/admin/donations", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return res.status(400).json({ error: "لپ‌تاپ قبلاً به اهدا لینک شده است" });
        }
        else {
            res.status(500).json({ error: "خطا در افزودن اهدا", details: error.message });
        }
    }
});
// Ambassador profile routes
// GET /ambassador/profile - Get ambassador profile
app.get("/ambassador/profile", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت پروفایل", details: error.message });
    }
});
// PUT /ambassador/profile - Update ambassador profile
app.put("/ambassador/profile", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return res.status(400).json({ error: "اطلاعات تکراری است" });
        }
        res.status(500).json({ error: "خطا در به‌روزرسانی پروفایل", details: error.message });
    }
});
// دریافت موقعیت‌ها
app.get("/locations", async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت موقعیت‌ها", details: error.message });
    }
});
// Map data endpoint - returns GeoJSON format for easy frontend mapping
app.get("/map-data", async (req, res) => {
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
        const laptopsWithCoordinates = laptops.filter(laptop => laptop.locationLat !== null && laptop.locationLng !== null);
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت داده‌های نقشه", details: error.message });
    }
});
// Geocoding endpoint for converting student addresses to coordinates
app.post("/students/:id/geocode", auth_1.authenticate, async (req, res) => {
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
        const updatedLaptops = [];
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
    }
    catch (error) {
        console.error("Geocoding error:", error.message);
        res.status(500).json({ error: "خطا در جغرافیایی کردن آدرس", details: error.message });
    }
});
// به‌روزرسانی موقعیت لپ‌تاپ
app.post("/laptops/:id/location", auth_1.authenticate, async (req, res) => {
    const { id } = req.params;
    const { locationLat, locationLng } = req.body;
    if (!locationLat || !locationLng)
        return res.status(400).json({ error: "مختصات الزامی است" });
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در به‌روزرسانی موقعیت", details: error.message });
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
        .catch((error) => {
        console.error("Error sending initial data:", error.message);
    });
    ws.on("close", () => console.log("Client disconnected"));
});
app.get("/", (req, res) => {
    res.send("Server is running ✅");
});
// Ambassador students routes
app.get("/ambassador/students", auth_1.authenticate, async (req, res) => {
    try {
        if (req.user?.role !== "AMBASSADOR") {
            return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
        }
        const me = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { status: true },
        });
        if (!me)
            return res.status(404).json({ error: "کاربر یافت نشد" });
        if (me.status !== "APPROVED") {
            return res.status(403).json({ error: "دسترسی فقط برای سفیران تأیید شده" });
        }
        const students = await prisma.student.findMany({
            where: { introducedByUserId: req.user.id },
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت دانش‌آموزان", details: error.message });
    }
});
app.get("/ambassador/students/search", auth_1.authenticate, async (req, res) => {
    try {
        if (req.user?.role !== "AMBASSADOR") {
            return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
        }
        const me = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { status: true },
        });
        if (!me)
            return res.status(404).json({ error: "کاربر یافت نشد" });
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در جستجوی دانش‌آموزان", details: error.message });
    }
});
app.post("/ambassador/students", auth_1.authenticate, async (req, res) => {
    try {
        if (req.user?.role !== "AMBASSADOR") {
            return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
        }
        const me = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { status: true },
        });
        if (!me)
            return res.status(404).json({ error: "کاربر یافت نشد" });
        if (me.status !== "APPROVED") {
            return res.status(403).json({ error: "دسترسی فقط برای سفیران تأیید شده" });
        }
        const { name, location, nationalId, fatherName, birthDate, phoneNumber } = req.body;
        if (!name || !location) {
            return res.status(400).json({ error: "نام و موقعیت الزامی است" });
        }
        if (nationalId != null && nationalId !== "") {
            const normalizedNationalId = String(nationalId).trim();
            if (!isValidNationalId(normalizedNationalId)) {
                return res.status(400).json({ error: "کد ملی باید ۱۰ رقم باشد" });
            }
        }
        let birthDateValue = null;
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
            },
        });
        res.json(student);
    }
    catch (error) {
        res.status(500).json({ error: "خطا در ایجاد دانش‌آموز", details: error.message });
    }
});
// PUT /ambassador/students/:id - Update student
app.put("/ambassador/students/:id", auth_1.authenticate, async (req, res) => {
    try {
        if (req.user?.role !== "AMBASSADOR") {
            return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
        }
        // Check if user is approved ambassador
        const me = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { status: true },
        });
        if (!me)
            return res.status(404).json({ error: "کاربر یافت نشد" });
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
        const { name, location, nationalId, fatherName, birthDate, phoneNumber } = req.body;
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
        let birthDateValue = null;
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
            },
        });
        res.json(updatedStudent);
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return res.status(400).json({ error: "اطلاعات تکراری است" });
        }
        res.status(500).json({ error: "خطا در به‌روزرسانی دانش‌آموز", details: error.message });
    }
});
// DELETE /ambassador/students/:id - Delete student
app.delete("/ambassador/students/:id", auth_1.authenticate, async (req, res) => {
    try {
        if (req.user?.role !== "AMBASSADOR") {
            return res.status(403).json({ error: "دسترسی فقط برای سفیران" });
        }
        // Check if user is approved ambassador
        const me = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { status: true },
        });
        if (!me)
            return res.status(404).json({ error: "کاربر یافت نشد" });
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در حذف دانش‌آموز", details: error.message });
    }
});
// ========== ADMIN PANEL ROUTES ==========
// GET /admin/users - List all users
app.get("/admin/users", auth_1.authenticate, async (req, res) => {
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
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت لیست کاربران", details: error.message });
    }
});
// PUT /admin/users/:id/approve - Approve user
app.put("/admin/users/:id/approve", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در تأیید کاربر", details: error.message });
    }
});
// DELETE /admin/users/:id - Delete user
app.delete("/admin/users/:id", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در حذف کاربر", details: error.message });
    }
});
// GET /admin/students - List all students
app.get("/admin/students", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت لیست دانش‌آموزان", details: error.message });
    }
});
// POST /admin/students - Create student
app.post("/admin/students", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در ایجاد دانش‌آموز", details: error.message });
    }
});
// GET /admin/donations - List all donations
app.get("/admin/donations", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت لیست اهداها", details: error.message });
    }
});
// GET /admin/laptops - List all laptops
app.get("/admin/laptops", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت لیست لپ‌تاپ‌ها", details: error.message });
    }
});
// ========== DONOR PANEL ROUTES ==========
// GET /donor/profile - Get donor profile
app.get("/donor/profile", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت پروفایل", details: error.message });
    }
});
// PUT /donor/profile - Update donor profile
app.put("/donor/profile", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return res.status(400).json({ error: "اطلاعات تکراری است" });
        }
        res.status(500).json({ error: "خطا در به‌روزرسانی پروفایل", details: error.message });
    }
});
// POST /donor/donations - Create donation
app.post("/donor/donations", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در ایجاد اهدا", details: error.message });
    }
});
// GET /donor/donations - List donor donations
app.get("/donor/donations", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در دریافت لیست اهداها", details: error.message });
    }
});
// PUT /donor/donations/:id - Update donation
app.put("/donor/donations/:id", auth_1.authenticate, async (req, res) => {
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
        const updateData = {};
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در به‌روزرسانی اهدا", details: error.message });
    }
});
// DELETE /donor/donations/:id - Delete donation
app.delete("/donor/donations/:id", auth_1.authenticate, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "خطا در حذف اهدا", details: error.message });
    }
});
// ========== PAYMENT ROUTES (ZarinPal) ==========
// POST /donor/donations/pay
app.post("/donor/donations/pay", auth_1.authenticate, async (req, res) => {
    try {
        if (req.user?.role !== "DONOR") {
            return res.status(403).json({ error: "دسترسی فقط برای اهداکنندگان" });
        }
        const { donationId, amount } = req.body;
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
            const payment = await prisma.payment.create({
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
    }
    catch (error) {
        console.error("Payment error:", error.message);
        return res.status(500).json({ error: "خطا در پرداخت", details: error.message });
    }
});
// GET /donor/donations/verify
app.get("/donor/donations/verify", async (req, res) => {
    try {
        const { Authority, Status } = req.query;
        if (!Authority) {
            return res.status(400).json({ error: "پارامتر Authority الزامی است" });
        }
        // Find payment by authority
        const payment = await prisma.payment.findFirst({ where: { authority: String(Authority) }, include: { donation: true } });
        if (!payment) {
            return res.status(404).json({ error: "پرداخت یافت نشد" });
        }
        if (String(Status || '').toLowerCase() !== "ok") {
            await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
            return res.status(400).json({ error: "پرداخت ناموفق بود" });
        }
        const result = await zarinpal.PaymentVerification({
            Amount: Number(payment.amount),
            Authority: String(Authority),
        });
        if (result.status === 100 || result.status === 101) {
            // Mark success and update donation amount if needed
            await prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS" } });
            if (payment.donation && payment.donation.type === "MONEY") {
                await prisma.donation.update({
                    where: { id: payment.donationId },
                    data: { amount: Number(payment.amount) },
                });
            }
            const refId = result.RefID ?? result.ref_id ?? result.Authority;
            return res.json({ message: "پرداخت موفق", refId });
        }
        else {
            await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
            return res.status(400).json({ error: "پرداخت ناموفق بود", status: result.status });
        }
    }
    catch (error) {
        console.error("Verify error:", error.message);
        return res.status(500).json({ error: "خطا در پرداخت", details: error.message });
    }
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
