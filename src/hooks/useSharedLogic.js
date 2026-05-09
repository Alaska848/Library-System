/**
 * Custom Hooks للعمليات المشتركة
 * تقليل تكرار الكود بين Components
 */

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "../components/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { LOAN_STATUS } from "../constants";
import logger from "../utils/logger";

/**
 * Hook لإدارة Wishlist الخاص بالمستخدم
 */
export const useUserWishlist = (userId) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const wishlistRef = collection(db, "wishlists", userId, "books");
    const unsub = onSnapshot(wishlistRef, (snap) => {
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setWishlist(items);
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  const addToWishlist = useCallback(async (bookId, bookData) => {
    if (!userId) return;

    try {
      const wishlistRef = collection(db, "wishlists", userId, "books");
      const existingQuery = query(wishlistRef, where("bookId", "==", bookId));
      const existing = await getDocs(existingQuery);

      if (!existing.empty) {
        logger.warn("useUserWishlist", "الكتاب موجود بالفعل في قائمة الرغبات");
        return;
      }

      await addDoc(wishlistRef, {
        bookId,
        ...bookData,
        addedAt: serverTimestamp(),
      });

      logger.log("useUserWishlist", "تم إضافة الكتاب إلى قائمة الرغبات");
    } catch (error) {
      logger.error("useUserWishlist", error);
      throw error;
    }
  }, [userId]);

  const removeFromWishlist = useCallback(async (itemId) => {
    if (!userId) return;

    try {
      const itemRef = doc(db, "wishlists", userId, "books", itemId);
      await deleteDoc(itemRef);
      logger.log("useUserWishlist", "تم حذف الكتاب من قائمة الرغبات");
    } catch (error) {
      logger.error("useUserWishlist", error);
      throw error;
    }
  }, [userId]);

  return { wishlist, loading, addToWishlist, removeFromWishlist };
};

/**
 * Hook لإدارة الإعارات الخاصة بالمستخدم
 */
export const useUserLoans = (userId) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const loansRef = collection(db, "loans");
    const q = query(loansRef, where("userId", "==", userId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLoans(items);
        setLoading(false);
      },
      (error) => {
        logger.error("useUserLoans", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  return { loans, loading };
};

/**
 * Hook لإنشاء طلب إعارة (مع Transaction)
 */
export const useCreateLoan = () => {
  const [loading, setLoading] = useState(false);

  const createLoan = useCallback(
    async (bookId, userId, loanData) => {
      setLoading(true);

      try {
        await runTransaction(db, async (transaction) => {
          // 1. إنشاء سجل الإعارة
          const loansRef = collection(db, "loans");
          const loanDocRef = doc(loansRef);

          transaction.set(loanDocRef, {
            userId,
            bookId,
            status: LOAN_STATUS.PENDING,
            createdAt: serverTimestamp(),
            ...loanData,
          });

          // 2. تحديث عدد الإعارات في الكتاب
          const bookRef = doc(db, "books", bookId);
          const bookSnap = await transaction.get(bookRef);

          if (bookSnap.exists()) {
            transaction.update(bookRef, {
              borrowCount: (bookSnap.data().borrowCount || 0) + 1,
            });
          }

          logger.log("useCreateLoan", "تم إنشاء الإعارة بنجاح");
        });
      } catch (error) {
        logger.error("useCreateLoan", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createLoan, loading };
};

/**
 * Hook لجميع الكتب (مع Pagination)
 */
export const useBooks = (pageSize = 10) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);

  useEffect(() => {
    setLoading(true);
    const booksRef = collection(db, "books");

    onSnapshot(
      query(booksRef, /* limit(pageSize) */),
      (snap) => {
        const items = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBooks(items);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setLoading(false);
      },
      (error) => {
        logger.error("useBooks", error);
        setLoading(false);
      }
    );
  }, [pageSize]);

  return { books, loading, lastDoc };
};

/**
 * Hook للتحقق من الصلاحيات
 */
export const useAuthCheck = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    const user = JSON.parse(sessionStorage.getItem("user") || "null");

    if (role && user) {
      setRole(role);
      setUser(user);
    }

    setLoading(false);
  }, []);

  const canAccess = useCallback((allowedRoles) => {
    if (!allowedRoles) return true;
    if (!role) return false;

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return rolesArray.includes(role) || (rolesArray.includes("user") && role === "doctor");
  }, [role]);

  return { user, role, loading, canAccess };
};
