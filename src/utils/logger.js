/**
 * Logger Utility
 * يتحكم في جميع رسائل الـ console بناءً على البيئة
 * Development: logs كاملة
 * Production: logs من النوع error/warn فقط
 */

const isDev = process.env.NODE_ENV === "development";

const logger = {
  /**
   * رسالة عادية (يتم طباعتها في Development فقط)
   */
  log: (label, data) => {
    if (isDev) {
      console.log(`[${label}]`, data);
    }
  },

  /**
   * تحذير (يتم طباعته في كل الأوقات)
   */
  warn: (label, message) => {
    console.warn(`⚠️ [${label}]`, message);
  },

  /**
   * خطأ (يتم طباعته في كل الأوقات)
   */
  error: (label, error) => {
    console.error(`❌ [${label}]`, error);
    // في Production يمكن إرسال الخطأ إلى خدمة مراقبة
    if (!isDev && error instanceof Error) {
      // مثال: sendToErrorTracker(label, error);
    }
  },

  /**
   * معلومات (في Development فقط)
   */
  info: (label, message) => {
    if (isDev) {
      console.info(`ℹ️ [${label}]`, message);
    }
  },

  /**
   * جدول (في Development فقط)
   */
  table: (label, data) => {
    if (isDev) {
      console.log(`[${label}]`);
      console.table(data);
    }
  },
};

export default logger;
