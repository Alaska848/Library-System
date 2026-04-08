import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import Swal from "sweetalert2";

function browserNotify(title, body) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.ico" });
    } catch {
      /* ignore */
    }
  }
}

/**
 * For students only: listens to their loans and shows accept/reject alerts + optional browser notification.
 */
export default function LoanNotifications() {
  const navigate = useNavigate();
  const prevStatus = useRef(new Map());
  const initialized = useRef(false);
  const unsubLoanRef = useRef(null);

  useEffect(() => {
    let unsubAuth = () => {};

    unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubLoanRef.current?.();
      unsubLoanRef.current = null;
      initialized.current = false;
      prevStatus.current = new Map();

      if (!user || localStorage.getItem("role") !== "user") {
        return;
      }

      const q = query(
        collection(db, "loans"),
        where("userId", "==", user.uid),
      );

      unsubLoanRef.current = onSnapshot(
        q,
        (snap) => {
          if (!initialized.current) {
            snap.docs.forEach((d) => {
              prevStatus.current.set(d.id, d.data().status);
            });
            initialized.current = true;
            return;
          }

          snap.docChanges().forEach((change) => {
            const id = change.doc.id;
            const data = change.doc.data();
            const next = data.status;

            if (change.type === "added") {
              prevStatus.current.set(id, next);
              return;
            }

            if (change.type === "removed") {
              prevStatus.current.delete(id);
              return;
            }

            if (change.type === "modified") {
              const prev = prevStatus.current.get(id);
              const bookTitle = data.book || "الكتاب";

              if (prev === "Pending" && next === "Active") {
                browserNotify(
                  "تم قبول طلب الاستعارة",
                  `تمت الموافقة على: ${bookTitle}`,
                );
                Swal.fire({
                  title: "تم القبول",
                  html: `تمت الموافقة على طلبك لاستعارة: <strong>${bookTitle}</strong>. يمكنك متابعة الإعارة من صفحة كتبي المستعارة.`,
                  icon: "success",
                  confirmButtonText: "كتبي المستعارة",
                  confirmButtonColor: "#633a19",
                  showCancelButton: true,
                  cancelButtonText: "البقاء هنا",
                }).then((r) => {
                  if (r.isConfirmed) navigate("/my-borrowed-books");
                });
              } else if (prev === "Pending" && next === "Rejected") {
                browserNotify("تم رفض الطلب", bookTitle);
                Swal.fire({
                  title: "تم الرفض",
                  html: `لم تُقبل طلب الاستعارة لـ <strong>${bookTitle}</strong>. يمكنك المحاولة مرة أخرى لاحقًا أو التواصل مع إدارة المكتبة.`,
                  icon: "info",
                  confirmButtonColor: "#633a19",
                });
              }

              prevStatus.current.set(id, next);
            }
          });
        },
        (err) => {
          console.error("loans listener (user):", err);
        },
      );
    });

    return () => {
      unsubLoanRef.current?.();
      unsubAuth();
    };
  }, [navigate]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  return null;
}
