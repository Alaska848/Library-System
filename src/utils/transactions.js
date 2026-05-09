/**
 * Firestore Transactions & Batch Operations
 * Guide & Examples
 */

import {
  runTransaction,
  writeBatch,
  doc,
  collection,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../components/firebase";
import { LOAN_STATUS } from "../constants";
import logger from "../utils/logger";

/**
 * ✅ Example 1: Approve Loan (Multi-step transaction)
 * العملية:
 * 1. تحديث حالة الإعارة إلى APPROVED
 * 2. تحديث حالة الكتاب إلى BORROWED
 * 3. تحديث عداد الإعارات في الـ user
 */
export const approveLoan = async (loanId, userId, bookId) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. الحصول على بيانات الإعارة الحالية
      const loanRef = doc(db, "loans", loanId);
      const loanSnap = await transaction.get(loanRef);

      if (!loanSnap.exists()) {
        throw new Error("Loan not found");
      }

      // 2. تحديث الإعارة
      transaction.update(loanRef, {
        status: LOAN_STATUS.APPROVED,
        approvedAt: new Date(),
        approvedBy: userId, // الأدمن اللي وافق
      });

      // 3. تحديث الكتاب
      const bookRef = doc(db, "books", bookId);
      transaction.update(bookRef, {
        status: "borrowed",
        lastBorrowedAt: new Date(),
      });

      // 4. تحديث إحصائيات المستخدم
      const userRef = doc(db, "users", loanSnap.data().userId);
      const userSnap = await transaction.get(userRef);

      transaction.update(userRef, {
        activeBorrows: (userSnap.data().activeBorrows || 0) + 1,
      });

      logger.log("approveLoan", `Loan ${loanId} approved successfully`);
    });
  } catch (error) {
    logger.error("approveLoan", error);
    throw error;
  }
};

/**
 * ✅ Example 2: Return Book (Multi-step transaction)
 * العملية:
 * 1. تحديث حالة الإعارة إلى RETURNED
 * 2. تحديث حالة الكتاب إلى AVAILABLE
 * 3. تحديث عداد الإعارات في الـ user
 * 4. حساب الغرامة إن وجدت
 */
export const returnBook = async (loanId, bookId, userId) => {
  try {
    await runTransaction(db, async (transaction) => {
      const loanRef = doc(db, "loans", loanId);
      const loanSnap = await transaction.get(loanRef);

      if (!loanSnap.exists()) {
        throw new Error("Loan not found");
      }

      const loanData = loanSnap.data();
      const borrowDate = loanData.borrowedDate.toDate();
      const today = new Date();
      const daysOverdue = Math.max(
        0,
        Math.floor((today - borrowDate) / (1000 * 60 * 60 * 24)) - 14
      );
      const fine = daysOverdue * 5; // 5 ريال لكل يوم تأخير

      // 1. تحديث الإعارة
      transaction.update(loanRef, {
        status: LOAN_STATUS.RETURNED,
        returnedAt: new Date(),
        daysOverdue,
        fine,
      });

      // 2. تحديث الكتاب
      const bookRef = doc(db, "books", bookId);
      transaction.update(bookRef, {
        status: "available",
        borrowCount: (loanData.borrowCount || 0),
      });

      // 3. تحديث user stats
      const userRef = doc(db, "users", userId);
      const userSnap = await transaction.get(userRef);

      transaction.update(userRef, {
        activeBorrows: Math.max(0, (userSnap.data().activeBorrows || 1) - 1),
        totalReturns: (userSnap.data().totalReturns || 0) + 1,
      });

      logger.log("returnBook", `Book ${bookId} returned successfully`);
    });
  } catch (error) {
    logger.error("returnBook", error);
    throw error;
  }
};

/**
 * ✅ Example 3: Batch Operation (إضافة عدة كتب دفعة واحدة)
 * استخدم writeBatch عندما لا تحتاج إلى قراءة البيانات
 */
export const addBooksInBatch = async (booksArray) => {
  try {
    const batch = writeBatch(db);

    booksArray.forEach((book) => {
      const bookRef = doc(collection(db, "books"));
      batch.set(bookRef, {
        ...book,
        createdAt: new Date(),
        borrowCount: 0,
        status: "available",
      });
    });

    await batch.commit();
    logger.log("addBooksInBatch", `${booksArray.length} books added`);
  } catch (error) {
    logger.error("addBooksInBatch", error);
    throw error;
  }
};

/**
 * ✅ Example 4: Reject Loan Request
 * العملية:
 * 1. تحديث الإعارة إلى REJECTED
 * 2. إرسال notification للمستخدم
 */
export const rejectLoanRequest = async (
  loanId,
  userId,
  rejectionReason
) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. تحديث الإعارة
      const loanRef = doc(db, "loans", loanId);
      transaction.update(loanRef, {
        status: LOAN_STATUS.REJECTED,
        rejectionReason,
        rejectedAt: new Date(),
      });

      // 2. إرسال notification (اختياري)
      // يمكن إضافة notification document هنا
      const notificationRef = doc(collection(db, "notifications", userId, "items"));
      transaction.set(notificationRef, {
        type: "loan_rejected",
        loanId,
        reason: rejectionReason,
        createdAt: new Date(),
        read: false,
      });

      logger.log("rejectLoanRequest", `Loan ${loanId} rejected`);
    });
  } catch (error) {
    logger.error("rejectLoanRequest", error);
    throw error;
  }
};

/**
 * ✅ Example 5: Suspend User Account
 * العملية:
 * 1. تحديث حالة المستخدم إلى suspended
 * 2. إلغاء جميع الإعارات المعلقة
 */
export const suspendUserAccount = async (userId, reason) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. تحديث المستخدم
      const userRef = doc(db, "users", userId);
      transaction.update(userRef, {
        suspended: true,
        suspensionReason: reason,
        suspendedAt: new Date(),
      });

      // 2. إلغاء الإعارات المعلقة
      // ملاحظة: في Firestore لا يمكن عمل sub-collection query داخل transaction
      // لذلك يجب الحصول على البيانات قبل transaction
      logger.log("suspendUserAccount", `User ${userId} suspended`);
    });
  } catch (error) {
    logger.error("suspendUserAccount", error);
    throw error;
  }
};

/**
 * Best Practices:
 *
 * 1. ✅ استخدم runTransaction عندما تحتاج إلى:
 *    - قراءة البيانات أولاً
 *    - ضمان Atomicity (الكل أو لا شيء)
 *    - العمليات المترابطة
 *
 * 2. ✅ استخدم writeBatch عندما:
 *    - لا تحتاج إلى قراءة البيانات
 *    - تريد تحديثات متعددة متزامنة
 *    - كفاءة أعلى مقابل runTransaction
 *
 * 3. ❌ لا تستخدم Transactions لـ:
 *    - قراءة بيانات بسيطة
 *    - عمليات مفردة
 *    - شاشات عرض فقط (استخدم onSnapshot)
 *
 * 4. ⚠️ حدود Firestore Transactions:
 *    - حد أقصى 500 عملية كتابة
 *    - لا يمكن الكتابة إلى نفس الوثيقة أكثر من مرة
 *    - مهلة زمنية: 30 ثانية
 *
 * 5. 🔄 إعادة المحاولة:
 *    - Firestore يعيد محاولة Transactions تلقائياً عند التضارب
 *    - تأكد من أن الكود idempotent (آمن للتكرار)
 */

// Export للاستخدام
export default {
  approveLoan,
  returnBook,
  addBooksInBatch,
  rejectLoanRequest,
  suspendUserAccount,
};
