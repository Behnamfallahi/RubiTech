# پنل مدیریت روبیتک اسپارک - Admin Panel

## 🎯 معرفی

پنل مدیریت کامل و حرفه‌ای برای سیستم روبیتک اسپارک با قابلیت‌های زیر:

### ✨ ویژگی‌های اصلی

#### 1. **داشبورد اصلی (AdminDashboard)**
- نمایش آمار کلی سیستم (تعداد سفیرها، دانش‌آموزان، اهداکنندگان، لپ‌تاپ‌ها)
- کارت‌های آماری با نمایش درصد تغییرات
- جدول فعالیت‌های اخیر با قابلیت مرتب‌سازی
- عملیات سریع (Quick Actions)
- نمودارهای تحلیلی (در حال توسعه)

#### 2. **مدیریت سفیرها (AdminAmbassadors)**
- نمایش لیست کامل سفیرها با جزئیات
- جستجو بر اساس نام، ایمیل، کدملی، شهر
- فیلتر بر اساس وضعیت (در انتظار، تأیید شده، رد شده)
- تأیید یا رد سفیرها با یک کلیک
- مشاهده پروفایل و اطلاعات کامل هر سفیر
- مودال جزئیات با نمایش تمام اطلاعات

#### 3. **مدیریت دانش‌آموزان (AdminStudents)**
- لیست کامل دانش‌آموزان
- جستجو بر اساس نام، محل اقامت، شماره تماس
- اختصاص لپ‌تاپ به دانش‌آموز
- ویرایش اطلاعات دانش‌آموز
- نمایش وضعیت لپ‌تاپ (دارد/ندارد)

#### 4. **مدیریت اهداکنندگان (AdminDonors)**
- لیست کامل اهداکنندگان
- لیست اهداها با جزئیات (لپ‌تاپ، آموزش، پول)
- آمار تفکیک‌شده بر اساس نوع اهدا
- فیلتر بر اساس نوع اهدا
- تأیید و پردازش اهداها
- نمایش مبلغ برای اهداهای مالی

#### 5. **نقشه لپ‌تاپ‌ها (AdminLaptopsMap)**
- نمایش جدولی لیست لپ‌تاپ‌ها
- نمایش نقشه تعاملی ایران با Leaflet
- پین‌های آبی برای موقعیت لپ‌تاپ‌ها
- جستجو بر اساس سریال، نام، محل
- ویرایش موقعیت جغرافیایی لپ‌تاپ‌ها
- تبدیل بین نمای جدول و نقشه

#### 6. **مدیریت قراردادها (AdminContracts)**
- لیست کامل قراردادها
- فیلتر بر اساس وضعیت (در انتظار امضا، امضا شده)
- دانلود فایل PDF قرارداد
- تأیید یا رد قراردادها
- نمایش تاریخ امضا

#### 7. **گزارشات (AdminReports)**
- تولید گزارش CSV با پشتیبانی کامل فارسی
- گزارش‌های مختلف:
  - گزارش سفیرها
  - گزارش دانش‌آموزان
  - گزارش اهداکنندگان
  - گزارش اهداها
  - گزارش لپ‌تاپ‌ها
- نمایش آمار کلی
- راهنمای استفاده از گزارش‌ها

#### 8. **تنظیمات (AdminSettings)**
- مدیریت کامل کاربران
- افزودن کاربر جدید با نقش دلخواه
- حذف کاربران
- نمایش آمار تفکیک‌شده بر اساس نقش
- جدول کاربران با نمایش نقش و وضعیت

### 🎨 طراحی و UI/UX

- **رنگ‌بندی:** تم آبی برای تمامی المان‌ها (bg-blue-600)
- **فونت:** فونت Vazir برای تمام متون فارسی
- **جهت:** RTL کامل برای تمام صفحات
- **Responsive:** طراحی کاملاً ریسپانسیو برای موبایل، تبلت و دسکتاپ
- **Sidebar:** سایدبار تاشو با آیکون‌های واضح
- **Animations:** انیمیشن‌های نرم برای hover و transition
- **Icons:** استفاده از ایموجی‌های مناسب برای هر بخش

### 🔒 امنیت

- احراز هویت با JWT Token
- بررسی نقش کاربر (فقط ADMIN)
- بررسی وضعیت تأیید (APPROVED)
- محافظت از تمام مسیرها با middleware
- Rate limiting برای جلوگیری از حملات
- Validation کامل در سمت سرور

## 📦 نصب و راه‌اندازی

### پیش‌نیازها

- Node.js v18+
- PostgreSQL
- npm یا yarn

### مراحل نصب

#### 1. نصب وابستگی‌ها

```bash
# Backend
npm install

# Frontend
cd robitic-frontend
npm install
```

#### 2. تنظیم متغیرهای محیطی

فایل `.env` در ریشه پروژه ایجاد کنید:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/rubitech"
JWT_SECRET="your-secret-key-here"
PORT=4000
```

#### 3. اجرای Migration

```bash
npx prisma migrate dev
```

#### 4. ایجاد کاربر ادمین

```bash
npx ts-node seed-admin.ts
```

اطلاعات ادمین پیش‌فرض:
- **ایمیل:** admin@rubitech.com
- **رمز عبور:** admin123

#### 5. اجرای سرور

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd robitic-frontend
npm start
```

سرور Backend: http://localhost:4000
سرور Frontend: http://localhost:3000

## 🚀 استفاده

### ورود به پنل مدیریت

1. به آدرس http://localhost:3000/login بروید
2. ایمیل و رمز عبور ادمین را وارد کنید:
   - ایمیل: admin@rubitech.com
   - رمز: admin123
3. پس از ورود موفق، به طور خودکار به `/admin/dashboard` منتقل می‌شوید

### مسیرهای پنل ادمین

| مسیر | توضیحات |
|------|---------|
| `/admin` یا `/admin/dashboard` | داشبورد اصلی |
| `/admin/ambassadors` | مدیریت سفیرها |
| `/admin/students` | مدیریت دانش‌آموزان |
| `/admin/donors` | مدیریت اهداکنندگان |
| `/admin/laptops` | نقشه لپ‌تاپ‌ها |
| `/admin/contracts` | مدیریت قراردادها |
| `/admin/reports` | گزارشات |
| `/admin/settings` | تنظیمات |

## 🔧 API Endpoints

### احراز هویت

```
POST /login
Body: { email, password }
Response: { success, token, user: { id, role, name, email } }
```

### آمار داشبورد

```
GET /api/admin/stats
Headers: Authorization: Bearer <token>
Response: { stats, recentActivities }
```

### سفیرها

```
GET /api/admin/ambassadors
PUT /api/admin/ambassadors/:id/approve
Body: { status: "APPROVED" | "REJECTED" }
```

### دانش‌آموزان

```
GET /api/admin/students
POST /api/admin/students
PATCH /api/admin/students/:id
```

### اهداکنندگان

```
GET /api/admin/donors
POST /api/admin/donors/:id/confirm
```

### اهداها

```
GET /api/admin/donations
```

### لپ‌تاپ‌ها

```
GET /api/admin/laptops
PATCH /api/admin/laptops/:id
Body: { locationLat, locationLng }
```

### قراردادها

```
GET /api/admin/contracts
```

### کاربران

```
GET /api/admin/users
POST /api/admin/users
DELETE /api/admin/users/:id
```

## 📊 ساختار فایل‌ها

```
robitic-frontend/src/
├── components/
│   └── admin/
│       ├── AdminLayout.jsx          # لی‌اوت اصلی با sidebar و header
│       ├── AdminDashboard.jsx       # داشبورد با آمار و نمودار
│       ├── AdminAmbassadors.jsx     # مدیریت سفیرها
│       ├── AdminStudents.jsx        # مدیریت دانش‌آموزان
│       ├── AdminDonors.jsx          # مدیریت اهداکنندگان
│       ├── AdminLaptopsMap.jsx      # نقشه لپ‌تاپ‌ها با Leaflet
│       ├── AdminContracts.jsx       # مدیریت قراردادها
│       ├── AdminReports.jsx         # تولید گزارشات
│       └── AdminSettings.jsx        # تنظیمات کاربران
```

## 🎯 ویژگی‌های تکنیکی

### Frontend
- **React 19.2** با Hooks
- **React Router v7** برای مسیریابی
- **React Hook Form** برای مدیریت فرم‌ها
- **Axios** برای ارتباط با API
- **React Hot Toast** برای نمایش پیام‌ها
- **Leaflet** برای نقشه
- **Tailwind CSS** برای استایل‌دهی
- **useMemo** برای بهینه‌سازی

### Backend
- **Express** با TypeScript
- **Prisma ORM** برای دیتابیس
- **JWT** برای احراز هویت
- **bcrypt** برای هش کردن رمز
- **PostgreSQL** دیتابیس

## 🐛 رفع مشکلات رایج

### مشکل در ورود

1. مطمئن شوید کاربر ادمین ایجاد شده است
2. نقش کاربر باید `ADMIN` باشد
3. وضعیت کاربر باید `APPROVED` باشد
4. JWT_SECRET در `.env` تنظیم شده باشد

### مشکل در نمایش نقشه

1. مطمئن شوید `leaflet` نصب شده است
2. CSS لیفلت import شده باشد
3. لپ‌تاپ‌ها باید `locationLat` و `locationLng` داشته باشند

### مشکل در دانلود CSV

1. مطمئن شوید مرورگر شما دانلود فایل را مسدود نکرده
2. فایل با UTF-8 BOM ذخیره می‌شود برای پشتیبانی از فارسی

## 📝 نکات مهم

1. **امنیت:** همیشه JWT_SECRET را تغییر دهید
2. **رمز عبور:** پس از اولین ورود، رمز ادمین را تغییر دهید
3. **Backup:** از دیتابیس به طور منظم backup بگیرید
4. **Performance:** برای داده‌های زیاد از pagination استفاده کنید
5. **Testing:** قبل از production حتماً تست کامل انجام دهید

## 🚀 توسعه‌های آینده

- [ ] افزودن نمودارهای Chart.js
- [ ] پیاده‌سازی React Table برای جداول
- [ ] افزودن Pagination
- [ ] اعلان‌های Real-time با WebSocket
- [ ] افزودن فیلترهای پیشرفته
- [ ] Export گزارش‌ها به PDF
- [ ] تاریخچه تغییرات (Audit Log)
- [ ] آپلود دسته‌جمعی

## 📞 پشتیبانی

برای گزارش باگ یا پیشنهادات، لطفاً Issue ایجاد کنید.

---

**ساخته شده با ❤️ برای روبیتک اسپارک**

