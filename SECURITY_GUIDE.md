# 🔒 Security & Implementation Guide

## تم إضافته وإصلاحه:

### 1. **Fixed Routing Bug** ✅

- **المشكلة**: `allowedRoles` في App.js بينما ProtectedRoute تتوقع `allowedRole`
- **الحل**: تحديث ProtectedRoute ليدعم كلاً من الصيغتين
- **الملف**: [src/components/ProtectedRoute.jsx](../src/components/ProtectedRoute.jsx)

### 2. **Firestore Security Rules** ✅

- **الملف**: [firestore.rules](../firestore.rules)
- **المحتوى**:
  - ✅ Role-based access control (RBAC)
  - ✅ Validation على مستوى Database
  - ✅ Collection-specific permissions
  - ✅ Owner-based access

**للتفعيل**:

```bash
# تثبيت Firebase CLI
npm install -g firebase-tools

# تسجيل الدخول
firebase login

# نشر الـ Rules
firebase deploy --only firestore:rules
```

### 3. **Unified Constants/Enums** ✅

- **الملف**: [src/constants/index.js](../src/constants/index.js)
- **المحتوى**:
  - Roles: ADMIN, USER, DOCTOR
  - Loan Status: PENDING, APPROVED, BORROWED, RETURNED, OVERDUE, etc.
  - Book Status: AVAILABLE, BORROWED, ARCHIVED
  - Error & Success messages
  - Colors mapping

**الاستخدام**:

```javascript
import { ROLES, LOAN_STATUS, ERROR_MESSAGES } from "../constants";

// بدلاً من:
if (role === "admin") {
}
if (status === "borrowed") {
}

// استخدم:
if (role === ROLES.ADMIN) {
}
if (status === LOAN_STATUS.BORROWED) {
}
```

### 4. **Logger Utility** ✅

- **الملف**: [src/utils/logger.js](../src/utils/logger.js)
- **الميزات**:
  - Development mode: logs كاملة
  - Production mode: errors/warnings فقط
  - Prevents data leaks

**الاستخدام**:

```javascript
import logger from "../utils/logger";

logger.log("ComponentName", data);
logger.warn("Feature", "Warning message");
logger.error("API", error);
```

### 5. **Shared Business Logic Hooks** ✅

- **الملف**: [src/hooks/useSharedLogic.js](../src/hooks/useSharedLogic.js)
- **الـ Hooks المتاحة**:
  - `useUserWishlist()` - إدارة قائمة الرغبات
  - `useUserLoans()` - الإعارات الخاصة بالمستخدم
  - `useCreateLoan()` - إنشاء إعارة مع Transaction
  - `useBooks()` - جميع الكتب مع Pagination
  - `useAuthCheck()` - التحقق من الصلاحيات

**الاستخدام**:

```javascript
import { useUserWishlist, useCreateLoan } from "../hooks/useSharedLogic";

function MyComponent() {
  const { wishlist, addToWishlist } = useUserWishlist(userId);
  const { createLoan, loading } = useCreateLoan();

  // ... استخدم الـ hooks
}
```

### 6. **Backend Auth Middleware** ✅

- **الملف**: [Server/middleware/auth.js](../Server/middleware/auth.js)
- **الميزات**:
  - Bearer Token verification
  - Role-based access control
  - Custom Claims support

### 7. **Signed Upload Endpoint** ✅

- **الملف**: [Server/routes/upload.js](../Server/routes/upload.js)
- **الميزات**:
  - Signed uploads بدلاً من unsigned
  - File size limits
  - Allowed formats validation

---

## 📋 الخطوات المتبقية (TODO):

### High Priority

- [ ] تطبيق Transactions على العمليات المتعددة (BorrowingLog, FacultyRequests)
- [ ] تحسين onSnapshot queries (إضافة pagination و filtering)
- [ ] حذف console.log من الملفات الحالية
- [ ] إضافة اختبارات للـ guards والـ workflows

### Medium Priority

- [ ] تقسيم UserProfile.jsx إلى modules
- [ ] توحيد الـ status values في القاعدة البيانات
- [ ] استخراج shared components
- [ ] إضافة error boundaries

### Low Priority

- [ ] حذف السكريبت Chatbase من index.html (أو إضافة consent)
- [ ] تنظيف Server/uploads directory
- [ ] إضافة performance monitoring

---

## 🔐 Security Checklist

- [x] Firestore Rules in place
- [x] Role-based access control
- [x] Backend auth middleware
- [ ] Firebase Custom Claims setup
- [ ] Rate limiting (TODO)
- [ ] CORS configuration review (TODO)
- [ ] Input validation (TODO)
- [ ] SQL Injection prevention (N/A - Firestore)
- [ ] XSS prevention (TODO - review React safety)

---

## 📝 ملاحظات مهمة

1. **Firebase Custom Claims**: لتفعيل الـ Custom Claims بشكل كامل:

   ```bash
   # استخدم Firebase Admin SDK لتعيين role
   admin.auth().setCustomUserClaims(uid, { role: 'admin' })
   ```

2. **Environment Variables**: تأكد من وجود:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `FIREBASE_SERVICE_ACCOUNT_KEY` (في Backend)

3. **Database Migration**: عند التحويل إلى الـ Constants الجديدة:

   ```javascript
   // استخدم Cloud Functions لـ Migration
   // أو قم بـ Manual update للـ Collections القديمة
   ```

4. **Testing**: بعد التطبيق:
   - اختبر صفحات محمية مع DevTools
   - حاول تغيير role من sessionStorage
   - تأكد من عدم الوصول (يجب أن تعيد الـ Rules الخطأ)

---

## 🚀 Next Steps

1. **تطبيق الـ Transactions**:

   ```javascript
   // في BorrowingLog وFacultyRequests
   await runTransaction(db, async (transaction) => {
     // Multiple doc updates
   });
   ```

2. **تحسين Queries**:

   ```javascript
   // بدلاً من:
   onSnapshot(collection(db, "loans"), ...)

   // استخدم:
   const q = query(collection(db, "loans"),
     where("userId", "==", uid),
     limit(10)
   );
   onSnapshot(q, ...)
   ```

3. **حذف Debug Logs**:
   ```bash
   # استخدم أداة find/replace
   # ابحث عن: console.log
   # استبدل بـ: logger.log()
   ```
