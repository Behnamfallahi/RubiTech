# Ambassador Dashboard - Quick Start Guide

## 🚀 Getting Started

### Step 1: Registration
1. Navigate to `http://localhost:3000/ambassador/register`
2. Fill in the registration form:
   - Full name
   - Email or phone number
   - National ID
   - Father's name
   - Birth date (Shamsi calendar)
   - City and region
   - Password (min 8 characters)
3. Click "ثبت‌نام" (Register)
4. You'll be redirected after successful registration

### Step 2: Login
1. Go to `http://localhost:3000/login`
2. Enter your email/phone and password
3. Click "ورود به داشبورد" (Login)
4. System will automatically redirect based on your role

### Step 3: Identity Verification (First Time Only)
When you first login, you'll be redirected to `/ambassador/verify`

**Phase 1: Contract (مرحله ۱)**
- Click "📥 دانلود قرارداد" to download the contract
- Click "✍️ ورود به سیستم امضای دیجیتال" to sign via DocuSign
- Upload the signed contract (PDF, JPG, or PNG, max 5MB)
- Click "مرحله بعد ←" to proceed

**Phase 2: National ID (مرحله ۲)**
- Upload front photo of your national ID card
- Upload back photo of your national ID card
- Make sure photos are clear and readable
- Click "مرحله بعد ←" to proceed

**Phase 3: Selfie (مرحله ۳)**
- Click "📸 باز کردن دوربین" to open camera
- Allow browser to access your camera
- Position yourself in the frame
- Click "📷 گرفتن عکس" to capture
- Review the photo
- Click "✓ تأیید" if satisfied, or "🔄 گرفتن مجدد" to retake
- Click "✓ ارسال برای تأیید" to submit all documents

**Phase 4: Waiting**
- Your documents are now under admin review
- Please wait for admin approval
- You'll be automatically redirected once approved

## 📊 Using the Dashboard

### Main Dashboard
Once verified, you'll see:
- **Stats Cards**: Students count, donations, etc.
- **Quick Actions**: Add student, view list, profile
- **Recent Students**: Last 5 students added
- **Achievements**: Your badges and progress

### Managing Students

#### Adding a Student
1. Click "➕ افزودن دانش‌آموز" button
2. Fill in the form:
   - Full name *
   - Father name *
   - National ID * (10 digits)
   - Birth date *
   - City *
   - Phone number * (09xxxxxxxxx format)
   - Address (optional)
3. Click "✓ افزودن دانش‌آموز"

#### Searching Students
- Use the search box at the top
- Search by: name, national ID, city, or father name
- Results update in real-time

#### Editing a Student
1. Click the "✏️" button next to a student
2. Modify the information
3. Click "✓ ذخیره تغییرات"

#### Deleting a Student
1. Click the "🗑️" button next to a student
2. Confirm deletion in the dialog
3. Student will be removed

### Profile Management
1. Click "👤 پروفایل" in the sidebar
2. Click "✏️ ویرایش" button
3. Update your information
4. Click "✓ ذخیره تغییرات"

**Note**: National ID cannot be changed

### Viewing Donations
1. Click "💝 اهداها" in the sidebar
2. View all donations related to your students
3. See donation status (verified/pending)
4. Check total donation value

## 🎨 Interface Guide

### Sidebar Menu
- **📊 داشبورد**: Main dashboard
- **👤 پروفایل**: Your profile
- **🎓 مدیریت دانش‌آموزان**: Student management
- **💝 اهداها**: Donations tracking

### Status Indicators
- **✅ تأیید شده** (Green): Approved/Verified
- **⏳ در انتظار** (Yellow): Pending approval

### Mobile Usage
- Tap the "☰" hamburger menu to open sidebar
- Tap anywhere outside sidebar to close it
- Tables convert to cards on mobile
- All features work on touch devices

## 🔐 Security Tips

1. **Keep your password secure** - Don't share it
2. **Logout when done** - Click "خروج" button
3. **Verify URLs** - Make sure you're on the correct site
4. **Update profile** - Keep your contact info current

## ⚠️ Common Issues & Solutions

### "Not Verified" Warning
- **Issue**: You see a warning about verification
- **Solution**: Complete the verification process first

### Camera Not Working
- **Issue**: Webcam doesn't open
- **Solution**: Allow camera permission in browser settings

### Upload Failed
- **Issue**: File upload doesn't work
- **Solution**: Check file size (max 5MB) and format (JPG/PNG/PDF)

### Can't Login
- **Issue**: Login fails
- **Solution**: 
  1. Check email/phone format
  2. Verify password (min 6 characters)
  3. Make sure you're registered

### Search Not Working
- **Issue**: Search doesn't find students
- **Solution**: Try different keywords or check spelling

## 📱 Browser Support

### Recommended Browsers:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Camera Requirements:
- Modern browser with WebRTC support
- Camera permission granted
- HTTPS connection (for production)

## 🆘 Getting Help

If you encounter issues:
1. Check this guide first
2. Look for error messages (red toasts)
3. Try refreshing the page
4. Clear browser cache
5. Contact admin support

## 📞 Contact

For technical support or questions:
- Email admin through the system
- Use the notification bell for updates

## 🎯 Quick Tips

### Productivity Tips:
1. Use search to quickly find students
2. Check dashboard stats regularly
3. Keep profile updated
4. Add students as soon as identified
5. Follow up on pending students

### Best Practices:
1. Enter complete student information
2. Verify national IDs carefully
3. Use correct phone formats
4. Keep accurate records
5. Update status promptly

## 🌟 Features at a Glance

| Feature | Status | Location |
|---------|--------|----------|
| Registration | ✅ | /ambassador/register |
| Login | ✅ | /login |
| Verification | ✅ | /ambassador/verify |
| Dashboard | ✅ | /ambassador/dashboard |
| Profile | ✅ | /ambassador/profile |
| Students CRUD | ✅ | /ambassador/students |
| Search | ✅ | Students page |
| Donations | ✅ | /ambassador/donations |
| Mobile Support | ✅ | All pages |
| RTL Persian | ✅ | All pages |

## 🎊 Success!

You're now ready to use the Ambassador Dashboard! Start by completing your verification, then add your first student.

**Happy managing! 🚀**

---

*Last updated: 2025*
*Version: 1.0.0*











