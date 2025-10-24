"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateGoogleUser = exports.getGoogleUserInfo = exports.exchangeCodeForToken = exports.getGoogleAuthURL = exports.getGoogleOAuthInfo = exports.login = exports.verifyPhoneOTP = exports.sendOTPToPhone = exports.resetPassword = exports.forgotPassword = exports.verifyOTP = exports.register = exports.sendEmailOTP = exports.sendOTP = exports.generateOTP = exports.generateToken = exports.comparePassword = exports.hashPassword = exports.authenticateAdmin = exports.authenticate = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const kavenegar_1 = __importDefault(require("kavenegar"));
const client_1 = require("@prisma/client");
const nodemailer_1 = __importDefault(require("nodemailer"));
const pdf_lib_1 = require("pdf-lib");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const prisma = new client_1.PrismaClient();
// تبدیل Kavenegar Send به Promise
const kavenegarApi = kavenegar_1.default.KavenegarApi({ apikey: process.env.KAVENEGAR_API_KEY });
const sendAsync = (0, util_1.promisify)(kavenegarApi.Send).bind(kavenegarApi);
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "نیاز به توکن" });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error("خطا در احراز هویت:", err.message);
        res.status(401).json({ error: "توکن نامعتبر", details: err.message });
    }
};
exports.authenticate = authenticate;
// Admin-specific authentication middleware
const authenticateAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "نیاز به توکن" });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
    }
    catch (err) {
        console.error("خطا در احراز هویت ادمین:", err.message);
        res.status(401).json({ error: "توکن نامعتبر", details: err.message });
    }
};
exports.authenticateAdmin = authenticateAdmin;
const hashPassword = async (password) => {
    if (!password || password.length < 6)
        throw new Error("رمز باید حداقل ۶ کاراکتر باشد");
    return await bcrypt_1.default.hash(password, 10);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    return await bcrypt_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
exports.generateToken = generateToken;
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOTP = generateOTP;
const sendOTP = async (phoneNumber, otp) => {
    try {
        await sendAsync({
            sender: "1000596446",
            receptor: phoneNumber,
            message: `کد تأیید روبیتک: ${otp}. این کد تا 10 دقیقه معتبر است.`,
        });
    }
    catch (error) {
        console.error("خطا در ارسال OTP:", error);
        throw new Error("خطا در ارسال OTP");
    }
};
exports.sendOTP = sendOTP;
const sendEmailOTP = async (email, otp) => {
    const transporter = nodemailer_1.default.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "کد تأیید روبیتک",
            text: `کد تأیید شما: ${otp}. این کد تا 10 دقیقه معتبر است.`,
        });
    }
    catch (error) {
        console.error("خطا در ارسال ایمیل OTP:", error);
        throw new Error("خطا در ارسال ایمیل OTP");
    }
};
exports.sendEmailOTP = sendEmailOTP;
// ✅ نسخه نهایی register
const register = async (req, res) => {
    try {
        const { name, email, phoneNumber, password, role, extra, familyName, nationalId, birthDate, city, region, location, } = req.body;
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
        let birthDateValue = null;
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
        const otp = (0, exports.generateOTP)();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        const hashed = await (0, exports.hashPassword)(password);
        // 👇 مستقیم OTP و فیلدهای جدید را داخل create ذخیره می‌کنیم
        let user;
        try {
            const createData = {
                name,
                familyName: familyName || null,
                email: email || null,
                phoneNumber: phoneNumber || null,
                password: hashed,
                role: role,
                status: "PENDING",
                nationalId: nationalId || null,
                birthDate: birthDateValue,
                city: city || null,
                region: region || null,
                location: location || null,
                otp,
                otpExpiry,
            };
            user = await prisma.user.create({
                data: createData,
            });
        }
        catch (err) {
            // Handle unique constraint errors gracefully
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                err.code === "P2002") {
                const target = err.meta?.target || [];
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
            if (!extra?.location)
                return res.status(400).json({ error: "خطا در ثبت‌نام", details: "موقعیت برای دانش‌آموز الزامی است" });
            await prisma.student.create({ data: { name, location: extra.location } });
            console.log("✅ دانش‌آموز جدید ایجاد شد:", { name, location: extra.location });
        }
        if (role === "AMBASSADOR") {
            const pdfDoc = await pdf_lib_1.PDFDocument.create();
            const page = pdfDoc.addPage([600, 400]);
            page.drawText("قرارداد تعهد روبیتک", { x: 50, y: 350, size: 20 });
            page.drawText(`سفیر: ${name}`, { x: 50, y: 320, size: 12 });
            const pdfBytes = await pdfDoc.save();
            const pdfPath = path_1.default.join(__dirname, "../../uploads", `contract_${user.id}.pdf`);
            await promises_1.default.mkdir(path_1.default.dirname(pdfPath), { recursive: true });
            await promises_1.default.writeFile(pdfPath, pdfBytes);
            await prisma.contract.create({
                data: { userId: user.id, pdfUrl: pdfPath },
            });
            console.log("✅ قرارداد برای سفیر ایجاد شد:", { userId: user.id, pdfPath });
        }
        // 🚀 ارسال OTP در بک‌گراند (تأثیری روی ثبت‌نام نداره)
        if (phoneNumber) {
            (0, exports.sendOTP)(phoneNumber, otp)
                .then(() => console.log("📲 OTP SMS ارسال شد"))
                .catch((err) => console.error("❌ خطا در ارسال OTP SMS:", err));
        }
        else if (email) {
            (0, exports.sendEmailOTP)(email, otp)
                .then(() => console.log("📧 OTP ایمیل ارسال شد"))
                .catch((err) => console.error("❌ خطا در ارسال OTP ایمیل:", err));
        }
        return res.json({ message: "کد تأیید ارسال شد", userId: user.id });
    }
    catch (error) {
        console.error("❌ خطا در ثبت‌نام:", error?.message ?? error);
        return res.status(500).json({ error: "خطا در ثبت‌نام", details: error?.message ?? String(error) });
    }
};
exports.register = register;
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp)
        return res.status(400).json({ error: "ایمیل و کد OTP الزامی است" });
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ error: "کاربر یافت نشد" });
        if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
            return res.status(400).json({ error: "کد OTP نامعتبر یا منقضی شده" });
        }
        await prisma.user.update({ where: { email }, data: { otp: null, otpExpiry: null } });
        res.json({ message: "OTP تأیید شد" });
    }
    catch (error) {
        console.error("خطا در تأیید OTP:", error.message);
        res.status(500).json({ error: "خطا در تأیید کد", details: error.message });
    }
};
exports.verifyOTP = verifyOTP;
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: "ایمیل الزامی است" });
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ error: "کاربر یافت نشد" });
        const otp = (0, exports.generateOTP)();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await prisma.user.update({ where: { id: user.id }, data: { otp, otpExpiry } });
        if (user.phoneNumber)
            await (0, exports.sendOTP)(user.phoneNumber, otp);
        else
            await (0, exports.sendEmailOTP)(email, otp);
        res.json({ message: "کد تأیید ارسال شد", userId: user.id });
    }
    catch (error) {
        console.error("خطا در ارسال کد:", error.message);
        res.status(500).json({ error: "خطا در ارسال کد", details: error.message });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: "ایمیل، کد و رمز جدید الزامی است" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.otp !== otp || (user.otpExpiry && new Date() > user.otpExpiry)) {
            return res.status(400).json({ error: "کد نامعتبر یا منقضی شده" });
        }
        const hashed = await (0, exports.hashPassword)(newPassword);
        await prisma.user.update({ where: { email }, data: { password: hashed, otp: null, otpExpiry: null } });
        res.json({ message: "رمز با موفقیت تغییر کرد" });
    }
    catch (error) {
        console.error("خطا در تغییر رمز:", error.message);
        res.status(500).json({ error: "خطا در تغییر رمز", details: error.message });
    }
};
exports.resetPassword = resetPassword;
const sendOTPToPhone = async (phoneNumber, otp) => {
    try {
        await sendAsync({
            sender: "1000596446",
            receptor: phoneNumber,
            message: `کد تأیید روبیتک: ${otp}. این کد تا 10 دقیقه معتبر است.`,
        });
    }
    catch (error) {
        console.error("خطا در ارسال OTP به تلفن:", error);
        throw new Error("خطا در ارسال OTP به تلفن");
    }
};
exports.sendOTPToPhone = sendOTPToPhone;
const verifyPhoneOTP = async (phoneNumber, otp) => {
    try {
        const user = await prisma.user.findUnique({ where: { phoneNumber } });
        if (!user)
            return null;
        if (user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
            return null;
        }
        // Clear OTP after successful verification
        await prisma.user.update({
            where: { phoneNumber },
            data: { otp: null, otpExpiry: null }
        });
        return { id: user.id, role: user.role };
    }
    catch (error) {
        console.error("خطا در تأیید OTP تلفن:", error.message);
        throw new Error("خطا در تأیید OTP تلفن");
    }
};
exports.verifyPhoneOTP = verifyPhoneOTP;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "ایمیل و رمز الزامی است" });
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await (0, exports.comparePassword)(password, user.password))) {
            return res.status(401).json({ error: "ایمیل یا رمز اشتباه است" });
        }
        res.json({ message: "ورود موفق", token: (0, exports.generateToken)({ id: user.id, role: user.role }) });
    }
    catch (error) {
        console.error("خطا در ورود:", error.message);
        res.status(500).json({ error: "خطا در ورود", details: error.message });
    }
};
exports.login = login;
// Get Google OAuth URL for frontend
const getGoogleOAuthInfo = (req, res) => {
    try {
        const authUrl = (0, exports.getGoogleAuthURL)();
        res.json({
            googleAuthUrl: authUrl,
            message: "برای ورود با گوگل، از این URL استفاده کنید"
        });
    }
    catch (error) {
        console.error("Google OAuth info error:", error.message);
        res.status(500).json({ error: "خطا در دریافت اطلاعات OAuth گوگل", details: error.message });
    }
};
exports.getGoogleOAuthInfo = getGoogleOAuthInfo;
// Google OAuth helper functions
const getGoogleAuthURL = () => {
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
exports.getGoogleAuthURL = getGoogleAuthURL;
const exchangeCodeForToken = async (code) => {
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
exports.exchangeCodeForToken = exchangeCodeForToken;
const getGoogleUserInfo = async (accessToken) => {
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
exports.getGoogleUserInfo = getGoogleUserInfo;
const findOrCreateGoogleUser = async (googleUser) => {
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
    }
    catch (error) {
        console.error("Error in findOrCreateGoogleUser:", error.message);
        throw new Error("Failed to create or find user");
    }
};
exports.findOrCreateGoogleUser = findOrCreateGoogleUser;
