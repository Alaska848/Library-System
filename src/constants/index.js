/**
 * تعريفات موحدة للثوابت والقيم المستخدمة في التطبيق
 * هدفها: توحيد القيم لتجنب الأخطاء والتناقضات
 */

// 👤 الأدوار
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  DOCTOR: "doctor",
};

// 📊 حالات الإعارة
export const LOAN_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  BORROWED: "borrowed",
  RETURNED: "returned",
  OVERDUE: "overdue",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
};

// 📚 حالات الكتاب
export const BOOK_STATUS = {
  AVAILABLE: "available",
  BORROWED: "borrowed",
  ARCHIVED: "archived",
};

// 📤 حالات طلبات الدكاترة
export const FACULTY_REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUBMITTED: "submitted",
};

// ⏱️ مدة الإعارة والتأخير
export const LOAN_DURATION = {
  DEFAULT_DAYS: 14,
  DOCTOR_DAYS: 21,
  RENEWAL_DAYS: 7,
  MAX_RENEWALS: 3,
};

// ⚠️ رسائل الأخطاء الموحدة
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "أنت غير مصرح للوصول إلى هذا المورد",
  AUTHENTICATION_REQUIRED: "يجب تسجيل الدخول أولاً",
  NOT_FOUND: "لم يتم العثور على السجل المطلوب",
  INVALID_ROLE: "الدور المحدد غير صحيح",
  OPERATION_FAILED: "فشلت العملية، حاول مرة أخرى",
  PERMISSION_DENIED: "ليس لديك صلاحية لإجراء هذه العملية",
};

// ✅ رسائل النجاح الموحدة
export const SUCCESS_MESSAGES = {
  LOAN_CREATED: "تم إنشاء الإعارة بنجاح",
  LOAN_APPROVED: "تمت الموافقة على الإعارة",
  LOAN_RETURNED: "تم استرجاع الكتاب",
  OPERATION_COMPLETED: "تمت العملية بنجاح",
};

// 🔍 القيم الافتراضية
export const DEFAULTS = {
  PAGE_SIZE: 10,
  TIMEOUT_MS: 5000,
  RETRY_ATTEMPTS: 3,
};

// ✨ قوائم مشتركة
export const ROLE_OPTIONS = [ROLES.ADMIN, ROLES.USER, ROLES.DOCTOR];
export const LOAN_STATUS_OPTIONS = Object.values(LOAN_STATUS);
export const BOOK_STATUS_OPTIONS = Object.values(BOOK_STATUS);

// 🎨 تعريفات الألوان للحالات
export const STATUS_COLORS = {
  pending: "#FFA500",
  approved: "#4CAF50",
  borrowed: "#2196F3",
  returned: "#8BC34A",
  overdue: "#F44336",
  rejected: "#9C27B0",
  suspended: "#FF6B6B",
  available: "#4CAF50",
  archived: "#9E9E9E",
};
