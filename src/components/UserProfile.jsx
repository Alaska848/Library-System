import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

function Alert({ type, msg, onClose }) {
  if (!msg) return null;

  const c = {
    success: { bg: "#dcfce7", border: "#16a34a", text: "#15803d" },
    error: { bg: "#fee2e2", border: "#ef4444", text: "#b91c1c" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
  }[type] || { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" };

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        borderRadius: 10,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}
    >
      <span>{msg}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: c.text,
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

function InfoRow({ icon, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#374151",
        fontSize: 14,
      }}
    >
      <i
        className={icon}
        style={{ color: "#9ca3af", width: 18, textAlign: "center" }}
      />
      <span>{value}</span>
    </div>
  );
}

function BookCard({ book }) {
  return (
    <div
      style={{
        background: "#fdf9f6",
        borderRadius: 12,
        padding: "14px 16px",
        border: "1px solid #f0ece6",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 52,
          height: 70,
          borderRadius: 6,
          flexShrink: 0,
          background: "linear-gradient(135deg,#9e734a,#633a19)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <i
          className="fa-solid fa-book-open"
          style={{ color: "rgba(255,255,255,0.7)", fontSize: 18 }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: "#1f2937",
            marginBottom: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {book.title || book.book}
        </div>

        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
          {book.author || "—"}
        </div>

        {book.returnDate && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            <i className="fa-regular fa-calendar" /> Return by:{" "}
            {new Date(book.returnDate?.seconds * 1000).toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short", year: "numeric" },
            )}
          </div>
        )}
      </div>

      <span
        style={{
          background: "#dcfce7",
          color: "#16a34a",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          padding: "3px 10px",
          flexShrink: 0,
        }}
      >
        ACTIVE
      </span>
    </div>
  );
}

function HistoryCard({ book }) {
  return (
    <div
      style={{
        background: "#fdf9f6",
        borderRadius: 12,
        padding: "14px 16px",
        border: "1px solid #f0ece6",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 52,
          height: 70,
          borderRadius: 6,
          flexShrink: 0,
          background: "linear-gradient(135deg,#aaa,#666)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <i
          className="fa-solid fa-book"
          style={{ color: "rgba(255,255,255,0.7)", fontSize: 18 }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: "#1f2937",
            marginBottom: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {book.title || book.book}
        </div>

        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
          {book.author || "—"}
        </div>

        {book.returnedAt && (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Returned:{" "}
            {new Date(book.returnedAt?.seconds * 1000).toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short", year: "numeric" },
            )}
          </div>
        )}
      </div>

      <span
        style={{
          background: "#f3f4f6",
          color: "#6b7280",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          padding: "3px 10px",
          flexShrink: 0,
        }}
      >
        RETURNED
      </span>
    </div>
  );
}

function SettingsPanel({ userData, authUser }) {
  const [tab, setTab] = useState("email");
  const [newEmail, setNewEmail] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [emailAlert, setEmailAlert] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passAlert, setPassAlert] = useState(null);
  const [passLoading, setPassLoading] = useState(false);
  const [showEP, setShowEP] = useState(false);
  const [showCP, setShowCP] = useState(false);
  const [showNP, setShowNP] = useState(false);
  const [showCNP, setShowCNP] = useState(false);

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    marginTop: 6,
    fontFamily: "inherit",
  };

  const btnStyle = {
    background: "#633a19",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 28px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  };

  const tabBtn = (id, label, icon) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "9px 20px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
        background: tab === id ? "#633a19" : "transparent",
        color: tab === id ? "#fff" : "#6b7280",
      }}
    >
      <i className={`${icon} me-2`} />
      {label}
    </button>
  );

  const reauth = async (pw) => {
    const cred = EmailAuthProvider.credential(authUser.email, pw);
    await reauthenticateWithCredential(authUser, cred);
  };

  const accountCollectionName =
    userData?.role === "doctor"
      ? "doctors"
      : userData?.role === "admin"
        ? "admins"
        : "students";

  const handleEmailChange = async () => {
    if (!newEmail || !emailPass) {
      setEmailAlert({ type: "error", msg: "Please fill all fields." });
      return;
    }

    setEmailLoading(true);
    setEmailAlert(null);

    try {
      await reauth(emailPass);
      await updateEmail(authUser, newEmail);
      await updateDoc(doc(db, accountCollectionName, authUser.uid), {
        email: newEmail,
      });
      setEmailAlert({ type: "success", msg: "Email updated successfully! ✅" });
      setNewEmail("");
      setEmailPass("");
    } catch (e) {
      const m =
        e.code === "auth/wrong-password"
          ? "Wrong current password."
          : e.code === "auth/email-already-in-use"
            ? "Email already in use."
            : e.code === "auth/invalid-email"
              ? "Invalid email format."
              : e.message;

      setEmailAlert({ type: "error", msg: m });
    }

    setEmailLoading(false);
  };

  const handlePasswordChange = async () => {
    if (!curPass || !newPass || !confirmPass) {
      setPassAlert({ type: "error", msg: "Please fill all fields." });
      return;
    }

    if (newPass !== confirmPass) {
      setPassAlert({ type: "error", msg: "New passwords don't match." });
      return;
    }

    if (newPass.length < 6) {
      setPassAlert({
        type: "error",
        msg: "Password must be at least 6 characters.",
      });
      return;
    }

    setPassLoading(true);
    setPassAlert(null);

    try {
      await reauth(curPass);
      await updatePassword(authUser, newPass);
      setPassAlert({
        type: "success",
        msg: "Password updated successfully! ✅",
      });
      setCurPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (e) {
      setPassAlert({
        type: "error",
        msg:
          e.code === "auth/wrong-password"
            ? "Wrong current password."
            : e.message,
      });
    }

    setPassLoading(false);
  };

  const pwField = (label, val, setVal, show, setShow) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
        {label}
      </label>

      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
          style={{ ...inputStyle, paddingRight: 42 }}
        />

        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
            padding: 4,
          }}
        >
          <i className={show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "28px 32px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <i
          className="fa-solid fa-gear"
          style={{ color: "#633a19", fontSize: 18 }}
        />
        <span style={{ fontWeight: 800, fontSize: 20, color: "#1f2937" }}>
          Account Settings
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 28,
          background: "#f9f6f2",
          borderRadius: 10,
          padding: 6,
          width: "fit-content",
          flexWrap: "wrap",
        }}
      >
        {tabBtn("email", "Change Email", "fa-regular fa-envelope")}
        {tabBtn("password", "Change Password", "fa-solid fa-lock")}
        {tabBtn("danger", "Privacy", "fa-solid fa-shield-halved")}
      </div>

      {tab === "email" && (
        <div style={{ maxWidth: 460 }}>
          <Alert
            type={emailAlert?.type}
            msg={emailAlert?.msg}
            onClose={() => setEmailAlert(null)}
          />

          <div
            style={{
              background: "#f9f6f2",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className="fa-regular fa-envelope"
              style={{ color: "#9ca3af" }}
            />
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
                CURRENT EMAIL
              </div>
              <div style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>
                {userData?.email || authUser?.email}
              </div>
            </div>
          </div>

          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
            New Email Address
          </label>

          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter new email"
            style={inputStyle}
          />

          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              marginTop: 16,
              display: "block",
            }}
          >
            Current Password{" "}
            <span style={{ color: "#9ca3af", fontWeight: 400 }}>
              (to confirm)
            </span>
          </label>

          <div style={{ position: "relative" }}>
            <input
              type={showEP ? "text" : "password"}
              value={emailPass}
              onChange={(e) => setEmailPass(e.target.value)}
              placeholder="Enter current password"
              style={{ ...inputStyle, paddingRight: 42 }}
            />

            <button
              type="button"
              onClick={() => setShowEP((s) => !s)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                padding: 4,
              }}
            >
              <i
                className={showEP ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}
              />
            </button>
          </div>

          <button
            onClick={handleEmailChange}
            disabled={emailLoading}
            style={{
              ...btnStyle,
              marginTop: 24,
              opacity: emailLoading ? 0.7 : 1,
            }}
          >
            {emailLoading ? "Updating…" : "Update Email"}
          </button>
        </div>
      )}

      {tab === "password" && (
        <div style={{ maxWidth: 460 }}>
          <Alert
            type={passAlert?.type}
            msg={passAlert?.msg}
            onClose={() => setPassAlert(null)}
          />

          {pwField("Current Password", curPass, setCurPass, showCP, setShowCP)}
          {pwField("New Password", newPass, setNewPass, showNP, setShowNP)}
          {pwField(
            "Confirm New Password",
            confirmPass,
            setConfirmPass,
            showCNP,
            setShowCNP,
          )}

          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12,
              color: "#92400e",
              marginBottom: 20,
            }}
          >
            <i className="fa-solid fa-circle-info me-2" />
            Password must be at least 6 characters long.
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={passLoading}
            style={{ ...btnStyle, opacity: passLoading ? 0.7 : 1 }}
          >
            {passLoading ? "Updating…" : "Update Password"}
          </button>
        </div>
      )}

      {tab === "danger" && (
        <div style={{ maxWidth: 500 }}>
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#b91c1c",
                marginBottom: 8,
              }}
            >
              <i className="fa-solid fa-triangle-exclamation me-2" />
              Privacy & Data
            </div>

            <p
              style={{
                fontSize: 13,
                color: "#6b7280",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              Your data is stored securely. To request account deletion or
              export your data, please contact library administration.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                style={{
                  background: "transparent",
                  border: "1.5px solid #633a19",
                  color: "#633a19",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "fit-content",
                }}
              >
                <i className="fa-solid fa-download" />
                Export My Data
              </button>

              <button
                style={{
                  background: "transparent",
                  border: "1.5px solid #ef4444",
                  color: "#ef4444",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "fit-content",
                }}
              >
                <i className="fa-solid fa-trash" />
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WishlistPanel({ userId }) {
  const [wishlist, setWishlist] = useState([]);
  const [removing, setRemoving] = useState({});

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, "wishlists"), where("userId", "==", userId));

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
      items.sort(
        (a, b) =>
          (b.addedAt?.toMillis?.() || 0) - (a.addedAt?.toMillis?.() || 0),
      );
      setWishlist(items);
    });

    return () => unsub();
  }, [userId]);

  const handleRemove = async (docId) => {
    setRemoving((p) => ({ ...p, [docId]: true }));

    try {
      await deleteDoc(doc(db, "wishlists", docId));
    } catch (e) {
      console.error(e);
    } finally {
      setRemoving((p) => ({ ...p, [docId]: false }));
    }
  };

  if (wishlist.length === 0) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "40px 24px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          textAlign: "center",
          color: "#9ca3af",
        }}
      >
        <i
          className="fa-solid fa-heart"
          style={{ fontSize: 36, marginBottom: 14, display: "block" }}
        />

        <p style={{ fontSize: 15 }}>Your wishlist is empty</p>

        <Link
          to="/catalog"
          className="btn btn-sm rounded-pill px-4"
          style={{
            background: "#633a19",
            color: "#fff",
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Browse Catalog
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "28px 32px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <i
          className="fa-solid fa-heart"
          style={{ color: "#633a19", fontSize: 18 }}
        />

        <span style={{ fontWeight: 800, fontSize: 20, color: "#1f2937" }}>
          My Wishlist
        </span>

        <span
          style={{
            background: "rgba(99,58,25,0.1)",
            color: "#633a19",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            padding: "2px 10px",
          }}
        >
          {wishlist.length}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {wishlist.map((w) => (
          <div
            key={w.docId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #f0ece6",
              background: "#fdf9f6",
            }}
          >
            {w.coverUrl ? (
              <img
                src={w.coverUrl}
                alt={w.title}
                style={{
                  width: 52,
                  height: 70,
                  borderRadius: 6,
                  objectFit: "cover",
                  flexShrink: 0,
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://placehold.co/52x70?text=📖";
                }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 70,
                  borderRadius: 6,
                  flexShrink: 0,
                  background: "linear-gradient(135deg,#9e734a,#633a19)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className="fa-solid fa-book"
                  style={{ color: "rgba(255,255,255,0.7)", fontSize: 18 }}
                />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#1f2937",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {w.title}
              </div>

              <div style={{ fontSize: 13, color: "#6b7280" }}>{w.author}</div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 4,
                  color: w.available ? "#16a34a" : "#f59e0b",
                }}
              >
                {w.available ? "Available Now" : "Not Available"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Link
                to="/catalog"
                style={{
                  background: "#633a19",
                  color: "#fff",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 14px",
                  textDecoration: "none",
                }}
              >
                Borrow
              </Link>

              <button
                onClick={() => handleRemove(w.docId)}
                disabled={removing[w.docId]}
                style={{
                  background: "#fee2e2",
                  color: "#ef4444",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                {removing[w.docId] ? (
                  <span
                    className="spinner-border spinner-border-sm"
                    style={{ width: 12, height: 12, borderWidth: 2 }}
                  />
                ) : (
                  <i className="fa-solid fa-trash" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsPanel({ userId, userName }) {
  const [returnedLoans, setReturnedLoans] = useState([]);
  const [reviews, setReviews] = useState({});
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState({});

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "loans"),
      where("userId", "==", userId),
      where("status", "==", "Returned"),
    );

    return onSnapshot(q, (snap) =>
      setReturnedLoans(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, "reviews"), where("userId", "==", userId));

    return onSnapshot(q, (snap) => {
      const map = {};
      snap.forEach((d) => {
        map[d.data().bookId] = { id: d.id, ...d.data() };
      });
      setReviews(map);
    });
  }, [userId]);

  const handleSubmit = async (loan) => {
    const f = form[loan.bookId] || {};
    if (!f.rating) return;

    setSubmitting((p) => ({ ...p, [loan.bookId]: true }));

    try {
      await addDoc(collection(db, "reviews"), {
        userId,
        userName: userName || "User",
        bookId: loan.bookId,
        bookTitle: loan.book || "",
        rating: f.rating,
        comment: f.comment || "",
        createdAt: serverTimestamp(),
      });

      setForm((p) => ({ ...p, [loan.bookId]: {} }));
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting((p) => ({ ...p, [loan.bookId]: false }));
    }
  };

  const unique = [];
  const seen = new Set();

  returnedLoans.forEach((l) => {
    if (l.bookId && !seen.has(l.bookId)) {
      seen.add(l.bookId);
      unique.push(l);
    }
  });

  if (unique.length === 0) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "40px 24px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          textAlign: "center",
          color: "#9ca3af",
        }}
      >
        <i
          className="fa-solid fa-star"
          style={{ fontSize: 36, marginBottom: 14, display: "block" }}
        />

        <p style={{ fontSize: 15 }}>Return a book first to leave a review</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "28px 32px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <i
          className="fa-solid fa-star"
          style={{ color: "#633a19", fontSize: 18 }}
        />

        <span style={{ fontWeight: 800, fontSize: 20, color: "#1f2937" }}>
          My Reviews
        </span>

        <span
          style={{
            background: "rgba(99,58,25,0.1)",
            color: "#633a19",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            padding: "2px 10px",
          }}
        >
          {unique.length} books
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {unique.map((loan) => {
          const existing = reviews[loan.bookId];
          const f = form[loan.bookId] || {};

          return (
            <div
              key={loan.id}
              style={{
                borderRadius: 12,
                border: "1px solid #f0ece6",
                padding: "18px 20px",
                background: "#fdf9f6",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#1f2937",
                  marginBottom: 10,
                }}
              >
                {loan.book}
              </div>

              {existing ? (
                <div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <i
                        key={s}
                        className={
                          s <= existing.rating
                            ? "fa-solid fa-star"
                            : "fa-regular fa-star"
                        }
                        style={{ color: "#f59e0b", fontSize: 18 }}
                      />
                    ))}
                  </div>

                  {existing.comment && (
                    <p
                      style={{
                        fontSize: 14,
                        color: "#374151",
                        margin: "0 0 6px 0",
                        lineHeight: 1.6,
                      }}
                    >
                      {existing.comment}
                    </p>
                  )}

                  <div
                    style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}
                  >
                    ✓ Review submitted
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            [loan.bookId]: { ...p[loan.bookId], rating: s },
                          }))
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                        }}
                      >
                        <i
                          className={
                            s <= (f.rating || 0)
                              ? "fa-solid fa-star"
                              : "fa-regular fa-star"
                          }
                          style={{ color: "#f59e0b", fontSize: 22 }}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    placeholder="Share your thoughts about this book..."
                    value={f.comment || ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        [loan.bookId]: {
                          ...p[loan.bookId],
                          comment: e.target.value,
                        },
                      }))
                    }
                    style={{
                      width: "100%",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 14,
                      resize: "vertical",
                      minHeight: 80,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />

                  <button
                    disabled={!f.rating || submitting[loan.bookId]}
                    onClick={() => handleSubmit(loan)}
                    style={{
                      marginTop: 10,
                      background: "#633a19",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 22px",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      opacity: !f.rating || submitting[loan.bookId] ? 0.6 : 1,
                    }}
                  >
                    {submitting[loan.bookId]
                      ? "Submitting..."
                      : "Submit Review"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryPanel({ history }) {
  if (history.length === 0) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "40px 24px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          textAlign: "center",
          color: "#9ca3af",
        }}
      >
        <i
          className="fa-solid fa-clock-rotate-left"
          style={{ fontSize: 36, marginBottom: 14, display: "block" }}
        />

        <p style={{ fontSize: 15 }}>No borrowing history yet</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "28px 32px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <i
          className="fa-solid fa-clock-rotate-left"
          style={{ color: "#633a19", fontSize: 18 }}
        />

        <span style={{ fontWeight: 800, fontSize: 20, color: "#1f2937" }}>
          Borrowing History
        </span>

        <span
          style={{
            background: "rgba(99,58,25,0.1)",
            color: "#633a19",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            padding: "2px 10px",
          }}
        >
          {history.length} books
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {history.map((b, i) => (
          <HistoryCard key={i} book={b} />
        ))}
      </div>
    </div>
  );
}

function UserProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [borrowed, setBorrowed] = useState([]);
  const [history, setHistory] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [photoURL, setPhotoURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoAlert, setPhotoAlert] = useState(null);

  const activeTab = searchParams.get("tab") || "profile";
  const setActiveTab = (tab) => setSearchParams({ tab });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login");
        return;
      }

      setAuthUser(u);

      try {
        const collectionsToCheck = ["students", "doctors", "admins"];
        let foundSnap = null;
        let foundCollection = "students";

        for (const collectionName of collectionsToCheck) {
          const snap = await getDoc(doc(db, collectionName, u.uid));

          if (snap.exists()) {
            foundSnap = snap;
            foundCollection = collectionName;
            break;
          }
        }

        const data = foundSnap
          ? {
              uid: u.uid,
              email: u.email,
              collectionName: foundCollection,
              ...foundSnap.data(),
            }
          : { uid: u.uid, email: u.email, collectionName: "students" };

        setUserData(data);
        setPhotoURL(data.photoURL || null);
      } catch (error) {
        console.error("Profile data error:", error);
        setUserData({ uid: u.uid, email: u.email, collectionName: "students" });
      }

      try {
        const q = query(
          collection(db, "loans"),
          where("userId", "==", u.uid),
          where("status", "==", "Active"),
        );

        const s = await getDocs(q);
        setBorrowed(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {}

      try {
        const q2 = query(
          collection(db, "loans"),
          where("userId", "==", u.uid),
          where("status", "==", "Returned"),
        );

        const s2 = await getDocs(q2);
        setHistory(s2.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {}

      setLoading(false);
    });

    return () => unsub();
  }, [navigate]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];

    if (!file || !authUser) return;

    if (!file.type.startsWith("image/")) {
      setPhotoAlert({ type: "error", msg: "Please select an image file." });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setPhotoAlert({ type: "error", msg: "Image must be less than 3 MB." });
      return;
    }

    setUploading(true);
    setPhotoAlert(null);

    try {
      const imageFormData = new FormData();
      imageFormData.append("image", file);

      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: imageFormData,
      });

      if (!res.ok) {
        throw new Error("Image upload failed");
      }

      const data = await res.json();
      const url = data.imageUrl;

      if (!url) {
        throw new Error("Upload server did not return imageUrl");
      }

      const collectionName =
        userData?.collectionName ||
        (userData?.role === "doctor"
          ? "doctors"
          : userData?.role === "admin"
            ? "admins"
            : "students");

      await updateDoc(doc(db, collectionName, authUser.uid), {
        photoURL: url,
      });

      setPhotoURL(url);
      setUserData((prev) => ({ ...prev, photoURL: url, collectionName }));
      setPhotoAlert({ type: "success", msg: "Photo updated! ✅" });
    } catch (error) {
      console.error("Photo upload error:", error);
      setPhotoAlert({
        type: "error",
        msg: "Upload failed. Make sure the backend server is running.",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async () => {
    if (!authUser || !photoURL) return;

    setUploading(true);

    try {
      const collectionName =
        userData?.collectionName ||
        (userData?.role === "doctor"
          ? "doctors"
          : userData?.role === "admin"
            ? "admins"
            : "students");

      await updateDoc(doc(db, collectionName, authUser.uid), {
        photoURL: null,
      });

      setPhotoURL(null);
      setUserData((prev) => ({ ...prev, photoURL: null, collectionName }));
      setPhotoAlert({ type: "info", msg: "Photo removed." });
    } catch (error) {
      console.error("Photo delete error:", error);
      setPhotoAlert({ type: "error", msg: "Could not delete photo." });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="spinner-border"
          style={{ color: "#633a19" }}
          role="status"
        />
      </div>
    );
  }

  const displayName =
    userData?.name ||
    userData?.displayName ||
    userData?.email?.split("@")[0] ||
    "User";

  const profileId =
    userData?.Userid ||
    userData?.userId ||
    userData?.studentId ||
    userData?.code ||
    authUser?.uid?.slice(0, 8).toUpperCase() ||
    "—";

  const profilePhone =
    userData?.phone ||
    userData?.Phone ||
    userData?.mobile ||
    userData?.phoneNumber ||
    "Not provided";

  const createdAtValue = userData?.createdAt;
  const createdAtDate = createdAtValue?.toDate
    ? createdAtValue.toDate()
    : createdAtValue?.seconds
      ? new Date(createdAtValue.seconds * 1000)
      : createdAtValue instanceof Date
        ? createdAtValue
        : null;

  const memberSince = createdAtDate
    ? createdAtDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";

  const SIDEBAR = [
    {
      icon: "fa-solid fa-user",
      label: "Profile",
      action: () => setActiveTab("profile"),
    },
    {
      icon: "fa-solid fa-book-open",
      label: "My Books",
      action: () => navigate("/my-borrowed-books"),
    },
    {
      icon: "fa-solid fa-heart",
      label: "Wishlist",
      action: () => setActiveTab("wishlist"),
    },
    {
      icon: "fa-solid fa-clock-rotate-left",
      label: "History",
      action: () => setActiveTab("history"),
    },
    {
      icon: "fa-solid fa-star",
      label: "Reviews",
      action: () => setActiveTab("reviews"),
    },
    {
      icon: "fa-solid fa-gear",
      label: "Settings",
      action: () => setActiveTab("settings"),
    },
  ];

  const tabLabel =
    {
      profile: "Profile",
      wishlist: "Wishlist",
      history: "History",
      reviews: "Reviews",
      settings: "Settings",
    }[activeTab] || "Profile";

  return (
    <div style={{ minHeight: "100vh", background: "#f9f6f2", paddingTop: 70 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePhotoChange}
      />

      <div
        className="container-fluid"
        style={{ maxWidth: 1200, padding: "32px 24px" }}
      >
        <div className="row g-4">
          <div className="col-12 col-md-3">
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 20,
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                position: "sticky",
                top: 82,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 24,
                  paddingBottom: 20,
                  borderBottom: "1px solid #f0ece6",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    flexShrink: 0,
                    overflow: "hidden",
                    background: "linear-gradient(135deg,#9e734a,#633a19)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt="avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={() => setPhotoURL(null)}
                    />
                  ) : (
                    <i
                      className="fa-solid fa-user"
                      style={{ color: "#fff", fontSize: 18 }}
                    />
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#1f2937",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {displayName}
                  </div>

                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    ID: {profileId}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {SIDEBAR.map((item) => {
                  const active = item.label === tabLabel;

                  return (
                    <div
                      key={item.label}
                      onClick={item.action}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "11px 18px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: active
                          ? "rgba(99,58,25,0.1)"
                          : "transparent",
                        color: active ? "#633a19" : "#374151",
                        fontWeight: active ? 700 : 500,
                        fontSize: 15,
                        transition: "background 0.2s",
                      }}
                    >
                      <i
                        className={item.icon}
                        style={{
                          width: 20,
                          textAlign: "center",
                          color: active ? "#633a19" : "#9ca3af",
                        }}
                      />

                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-12 col-md-9 d-flex flex-column gap-4">
            {activeTab === "profile" && (
              <>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "28px 32px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  {photoAlert && (
                    <Alert
                      type={photoAlert.type}
                      msg={photoAlert.msg}
                      onClose={() => setPhotoAlert(null)}
                    />
                  )}

                  <div className="d-flex align-items-start gap-4 flex-wrap">
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div
                        style={{
                          width: 110,
                          height: 110,
                          borderRadius: 16,
                          overflow: "hidden",
                          background: "linear-gradient(135deg,#c9a07a,#633a19)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {photoURL ? (
                          <img
                            src={photoURL}
                            alt="profile"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={() => setPhotoURL(null)}
                          />
                        ) : (
                          <i
                            className="fa-solid fa-user"
                            style={{ color: "#fff", fontSize: 42 }}
                          />
                        )}
                      </div>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        title="Change photo"
                        style={{
                          position: "absolute",
                          bottom: -8,
                          right: -8,
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#633a19",
                          border: "2px solid #fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        {uploading ? (
                          <span
                            className="spinner-border spinner-border-sm text-white"
                            style={{ width: 12, height: 12, borderWidth: 2 }}
                          />
                        ) : (
                          <i
                            className="fa-solid fa-camera"
                            style={{ color: "#fff", fontSize: 12 }}
                          />
                        )}
                      </button>

                      {photoURL && (
                        <button
                          onClick={handleDeletePhoto}
                          disabled={uploading}
                          title="Delete photo"
                          style={{
                            position: "absolute",
                            bottom: -8,
                            left: -8,
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "#ef4444",
                            border: "2px solid #fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <i
                            className="fa-solid fa-trash"
                            style={{ color: "#fff", fontSize: 11 }}
                          />
                        </button>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 24,
                          color: "#1f2937",
                          marginBottom: 2,
                        }}
                      >
                        {displayName}
                      </div>

                      <div
                        style={{
                          display: "inline-block",
                          background: "rgba(99,58,25,0.1)",
                          color: "#633a19",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "3px 12px",
                          marginBottom: 20,
                        }}
                      >
                        {userData?.role === "doctor"
                          ? "Faculty Member"
                          : userData?.role === "admin"
                            ? "Administrator"
                            : "Member"}
                      </div>

                      <div className="row g-3">
                        <div className="col-12 col-sm-6">
                          <InfoRow
                            icon="fa-solid fa-id-badge"
                            value={`ID: ${profileId}`}
                          />
                        </div>

                        <div className="col-12 col-sm-6">
                          <InfoRow
                            icon="fa-regular fa-envelope"
                            value={userData?.email || "—"}
                          />
                        </div>

                        <div className="col-12 col-sm-6">
                          <InfoRow
                            icon="fa-solid fa-phone"
                            value={profilePhone}
                          />
                        </div>

                        <div className="col-12 col-sm-6">
                          <InfoRow
                            icon="fa-regular fa-calendar-check"
                            value={`Member since: ${memberSince}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-12 col-lg-6">
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        padding: "22px 24px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 18,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <i
                            className="fa-solid fa-bookmark"
                            style={{ color: "#633a19" }}
                          />

                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 17,
                              color: "#1f2937",
                            }}
                          >
                            Currently Borrowing
                          </span>
                        </div>

                        <Link
                          to="/my-borrowed-books"
                          style={{
                            fontSize: 13,
                            color: "#633a19",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          View All
                        </Link>
                      </div>

                      {borrowed.length === 0 ? (
                        <div className="text-center mt-10 text-gray-400">
                          <h2 className="text-2xl font-bold">
                            No Borrowed Books
                          </h2>
                          <p className="mt-2">
                            You haven't borrowed any books yet.
                          </p>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          {borrowed.slice(0, 3).map((book) => (
                            <BookCard key={book.id} book={book} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        padding: "22px 24px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 18,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <i
                            className="fa-solid fa-heart"
                            style={{ color: "#633a19" }}
                          />

                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 17,
                              color: "#1f2937",
                            }}
                          >
                            Wishlist
                          </span>
                        </div>

                        <span
                          onClick={() => setActiveTab("wishlist")}
                          style={{
                            fontSize: 13,
                            color: "#633a19",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Manage
                        </span>
                      </div>

                      {wishlist.length === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "32px 0",
                            color: "#9ca3af",
                          }}
                        >
                          <i
                            className="fa-solid fa-heart"
                            style={{
                              fontSize: 32,
                              marginBottom: 12,
                              display: "block",
                            }}
                          />

                          <p style={{ fontSize: 14 }}>No books in wishlist</p>

                          <Link
                            to="/catalog"
                            className="btn btn-sm rounded-pill px-4"
                            style={{
                              background: "#633a19",
                              color: "#fff",
                              fontSize: 13,
                              textDecoration: "none",
                            }}
                          >
                            Browse Catalog
                          </Link>
                        </div>
                      ) : (
                        wishlist.slice(0, 3).map((w, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 14,
                              padding: "12px 0",
                              borderBottom:
                                i < 2 ? "1px solid #f5f5f5" : "none",
                            }}
                          >
                            <div
                              style={{
                                width: 44,
                                height: 58,
                                borderRadius: 6,
                                flexShrink: 0,
                                background:
                                  "linear-gradient(135deg,#9e734a,#4a2c13)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <i
                                className="fa-solid fa-book"
                                style={{
                                  color: "rgba(255,255,255,0.6)",
                                  fontSize: 14,
                                }}
                              />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 14,
                                  color: "#1f2937",
                                }}
                              >
                                {w.title}
                              </div>

                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {w.author}
                              </div>

                              <div
                                style={{
                                  fontSize: 12,
                                  color: w.available ? "#16a34a" : "#f59e0b",
                                  fontWeight: 600,
                                  marginTop: 2,
                                }}
                              >
                                {w.available
                                  ? "Available Now"
                                  : "Not Available"}
                              </div>
                            </div>

                            <Link
                              to="/catalog"
                              style={{
                                background: "#f3f4f6",
                                color: "#374151",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                padding: "5px 14px",
                                textDecoration: "none",
                                flexShrink: 0,
                              }}
                            >
                              Borrow
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "22px 28px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 18 }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "rgba(99,58,25,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i
                        className="fa-solid fa-lightbulb"
                        style={{ color: "#633a19", fontSize: 20 }}
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          color: "#1f2937",
                        }}
                      >
                        Need a recommendation?
                      </div>

                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        Based on your history, we think you'll love contemporary
                        sci-fi.
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/catalog"
                    className="btn fw-semibold rounded-pill px-4 py-2"
                    style={{
                      background: "#633a19",
                      color: "#fff",
                      fontSize: 14,
                      textDecoration: "none",
                    }}
                  >
                    Explore Catalog
                  </Link>
                </div>
              </>
            )}

            {activeTab === "wishlist" && (
              <WishlistPanel userId={authUser?.uid} />
            )}

            {activeTab === "history" && <HistoryPanel history={history} />}

            {activeTab === "reviews" && (
              <ReviewsPanel userId={authUser?.uid} userName={displayName} />
            )}

            {activeTab === "settings" && authUser && (
              <SettingsPanel userData={userData} authUser={authUser} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
