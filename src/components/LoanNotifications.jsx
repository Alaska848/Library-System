import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";

/** Prefer explicit uid; fallback when React state lags behind Firebase auth */
function resolveNotificationUid(uid) {
  return uid ?? auth.currentUser?.uid ?? null;
}

function notificationsKey(uid) {
  return `lib_notifications_${uid}`;
}

function notifiedKey(uid) {
  return `ln_notified_${uid}`;
}

function getNotified(uid) {
  if (!uid) return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(notifiedKey(uid)) || "[]"));
  } catch {
    return new Set();
  }
}

function markNotified(uid, id) {
  if (!uid) return;
  const s = getNotified(uid);
  s.add(id);
  localStorage.setItem(notifiedKey(uid), JSON.stringify([...s]));
}

export function addNotification(notification, uid) {
  if (!uid) return;
  const key = notificationsKey(uid);
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  const newNotif = {
    ...notification,
    userId: uid,
    id: Date.now(),
    timestamp: Date.now(),
    read: false,
  };
  existing.unshift(newNotif);
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
  window.dispatchEvent(new Event("notificationsUpdated"));

  window.dispatchEvent(
    new CustomEvent("newToastNotification", { detail: newNotif }),
  );
}

export function getNotifications(uid) {
  const id = resolveNotificationUid(uid);
  if (!id) return [];
  try {
    return JSON.parse(localStorage.getItem(notificationsKey(id)) || "[]");
  } catch {
    return [];
  }
}

export function markAllRead(uid) {
  const id = resolveNotificationUid(uid);
  if (!id) return;
  const key = notificationsKey(id);
  const list = getNotifications(id).map((n) => ({ ...n, read: true }));
  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new Event("notificationsUpdated"));
}

export function clearNotifications(uid) {
  const id = resolveNotificationUid(uid);
  if (!id) return;
  localStorage.setItem(notificationsKey(id), JSON.stringify([]));
  window.dispatchEvent(new Event("notificationsUpdated"));
}

export function removeNotification(id, uid) {
  const idResolved = resolveNotificationUid(uid);
  if (!idResolved) return;
  const key = notificationsKey(idResolved);
  const list = getNotifications(idResolved).filter((n) => n.id !== id);
  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new Event("notificationsUpdated"));
}

export default function LoanNotifications() {
  const unsubLoanRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubLoanRef.current?.();
      unsubLoanRef.current = null;
      initializedRef.current = false;

      const appRole = localStorage.getItem("role");
      if (!user || (appRole !== "user" && appRole !== "doctor")) return;

      const q = query(collection(db, "loans"), where("userId", "==", user.uid));

      unsubLoanRef.current = onSnapshot(
        q,
        (snap) => {
          const uid = user.uid;
          const notified = getNotified(uid);

          if (!initializedRef.current) {
            initializedRef.current = true;

            snap.docs.forEach((d) => {
              const data = d.data();
              const id = d.id;
              const status = data.status;
              const book = data.book || "the book";

              if (status === "Active" && !notified.has(`accept_${id}`)) {
                markNotified(uid, `accept_${id}`);
                addNotification(
                  {
                    type: "accept",
                    book,
                    message: `Your request for "${book}" is approved.`,
                  },
                  uid,
                );
              } else if (
                status === "Rejected" &&
                !notified.has(`reject_${id}`)
              ) {
                markNotified(uid, `reject_${id}`);
                addNotification(
                  {
                    type: "reject",
                    book,
                    message: `Your request for "${book}" was denied.`,
                  },
                  uid,
                );
              }
            });

            return;
          }

          snap.docChanges().forEach((change) => {
            if (change.type !== "modified") return;

            const id = change.doc.id;
            const data = change.doc.data();
            const status = data.status;
            const book = data.book || "the book";
            const notifiedNow = getNotified(uid);

            if (status === "Active" && !notifiedNow.has(`accept_${id}`)) {
              markNotified(uid, `accept_${id}`);
              addNotification(
                {
                  type: "accept",
                  book,
                  message: `Your request for "${book}" is approved.`,
                },
                uid,
              );
            } else if (
              status === "Rejected" &&
              !notifiedNow.has(`reject_${id}`)
            ) {
              markNotified(uid, `reject_${id}`);
              addNotification(
                {
                  type: "reject",
                  book,
                  message: `Your request for "${book}" was denied.`,
                },
                uid,
              );
            }
          });
        },
        (err) => console.error("LoanNotifications:", err),
      );
    });

    return () => {
      unsubLoanRef.current?.();
      unsubAuth();
    };
  }, []);

  return null;
}
