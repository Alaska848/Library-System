import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  getNotifications,
  markAllRead,
  clearNotifications,
  removeNotification,
} from "./LoanNotifications";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Toast component ────────────────────────────────────────────────────────

function Toast({ notif, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const isAccept = notif.type === "accept";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        padding: "14px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        minWidth: 280,
        maxWidth: 340,
        borderLeft: `4px solid ${isAccept ? "#22c55e" : "#ef4444"}`,
        animation: "slideInToast 0.3s ease",
      }}
    >
      <span style={{ fontSize: 20 }}>{isAccept ? "✅" : "❌"}</span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "#1f2937",
            marginBottom: 2,
          }}
        >
          {isAccept ? "Request Approved" : "Request Denied"}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>
          {notif.book}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#9ca3af",
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
          marginTop: -2,
        }}
      >
        ×
      </button>

      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────

function Navbar() {
  const [isOpen, setIsopen] = useState(false);
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [userUid, setUserUid] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [toast, setToast] = useState(null);
  const [navSearch, setNavSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const bellRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const refreshNotifs = useCallback(() => {
    setNotifications(getNotifications(userUid));
  }, [userUid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  // Listen for notification list updates
  useEffect(() => {
    refreshNotifs();
    window.addEventListener("notificationsUpdated", refreshNotifs);
    return () =>
      window.removeEventListener("notificationsUpdated", refreshNotifs);
  }, [refreshNotifs]);

  // Listen for new toast notifications (only for signed-in user)
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail;
      if (d?.userId != null && d.userId !== userUid) return;
      setToast(d);
    };
    window.addEventListener("newToastNotification", handler);
    return () => window.removeEventListener("newToastNotification", handler);
  }, [userUid]);

  // Role sync
  useEffect(() => {
    const handleStorageChange = () => setRole(localStorage.getItem("role"));
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(() => {
      const currentRole = localStorage.getItem("role");
      setRole((prev) => (prev !== currentRole ? currentRole : prev));
    }, 500);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = () => {
    if (!showNotifs) {
      markAllRead(userUid);
      refreshNotifs();
    }
    setShowNotifs((prev) => !prev);
  };

  const handleClearAll = () => {
    clearNotifications(userUid);
    refreshNotifs();
  };

  const handleNavSearch = (e) => {
    e.preventDefault();
    const q = navSearch.trim();
    navigate(q ? `/Catalog?q=${encodeURIComponent(q)}` : "/Catalog");
    setIsopen(false);
    setShowSearch(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("role");
    setRole(null);
    navigate("/");
  };

  return (
    <>
      {/* ── Toast ── */}
      {toast && <Toast notif={toast} onClose={() => setToast(null)} />}

      <nav className="navbar navbar-expand-md bg-brown fixed left-0 top-0 z-50 fixed-top p-2">
        <div className="container d-md-flex align-items-md-center justify-content-md-around">
          <div className="navbar-brand d-flex align-items-center">
            <i className="fa-solid fa-graduation-cap text-white me-2"></i>
            <span className="text-white fw-bolder">University Library</span>
          </div>

          <button
            onClick={() => setIsopen(!isOpen)}
            className={`navbar-toggler shadow-none ${isOpen ? "" : "collapsed"}`}
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNavAltMarkup"
            aria-controls="navbarNavAltMarkup"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div
            className={`collapse navbar-collapse ${isOpen ? "show" : ""} d-md-flex justify-content-center`}
            id="navbarNavAltMarkup"
          >
            <div className="navbar-nav p-3 mt-3 m-md-0 p-md-1">
              {(role === "user" || role === "doctor") && (
                <>
                  <NavLink
                    className="nav-link m-1 text-white hover rounded-5 px-4"
                    to="/home"
                    onClick={() => setIsopen(false)}
                  >
                    Home
                  </NavLink>
                  <NavLink
                    className="nav-link m-1 text-white hover rounded-5 px-4"
                    to="/my-borrowed-books"
                    onClick={() => setIsopen(false)}
                  >
                    My Borrowed Books
                  </NavLink>
                  <NavLink
                    className="nav-link m-1 text-white hover rounded-5 px-4"
                    to="/Catalog"
                    onClick={() => setIsopen(false)}
                  >
                    Catalog
                  </NavLink>
                </>
              )}

              {/* <NavLink
                className="nav-link m-1 text-white hover rounded-5 px-4"
                to="/Catalog"
                onClick={() => setIsopen(false)}
              >
                Books
              </NavLink>

              <NavLink
                className="nav-link m-1 text-white hover rounded-5 px-4"
                to="/about"
                onClick={() => setIsopen(false)}
              >
                About
              </NavLink> */}

              {role === "admin" && (
                <>
                  <NavLink
                    className="nav-link m-1 text-white hover rounded-5 px-4"
                    to="/admin/BooksM"
                    onClick={() => setIsopen(false)}
                  >
                    Books Management
                  </NavLink>
                  <NavLink
                    className="nav-link m-1 text-white hover rounded-5 px-4"
                    to="/admin/BorrowingLog"
                    onClick={() => setIsopen(false)}
                  >
                    Borrowing Log
                  </NavLink>
                  <NavLink
                    className="nav-link m-1 text-white hover rounded-5 px-4"
                    to="/admin/UserManagement"
                    onClick={() => setIsopen(false)}
                  >
                    User Management
                  </NavLink>
                </>
              )}

               {/* ✅ زرار الدكتور */}
            {role === "doctor" && (
              <NavLink
                className="nav-link m-1 text-white hover rounded-5 px-4"
               to="/submit-book-Dr"
                onClick={() => setIsopen(false)}
              >
                Submit Book
              </NavLink>
            )}

              <Link className="px-4 my-2 d-md-none" to="/user">
                <span className="rounded-circle border p-1 hover-bg">
                  <i className="fa-solid fa-user text-white"></i>
                </span>
              </Link>
            </div>
          </div>

          <div
            ref={searchRef}
            className="position-relative m-2 d-flex align-items-center"
          >
            <button
              type="button"
              onClick={() => setShowSearch((s) => !s)}
              className="btn btn-link text-white p-1 border-0"
              aria-expanded={showSearch}
              aria-controls="navbar-search-panel"
              aria-label={showSearch ? "Close search" : "Open search"}
            >
              <i className="fa-solid fa-search" style={{ fontSize: 18 }} />
            </button>

            {showSearch && (
              <form
                id="navbar-search-panel"
                onSubmit={handleNavSearch}
                className="navbar-search-dropdown d-flex flex-column gap-2"
              >
                <div className="d-flex gap-2 align-items-stretch">
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={navSearch}
                    onChange={(e) => setNavSearch(e.target.value)}
                    placeholder="Title, author, ISBN..."
                    aria-label="Search books"
                    className="form-control form-control-sm rounded-pill flex-grow-1 shadow-none navbar-search-field"
                  />
                  <button
                    type="submit"
                    className="btn btn-sm text-white fw-semibold rounded-pill px-3 flex-shrink-0 border-0 bg-brown shadow-sm"
                    style={{ minWidth: 52 }}
                  >
                    Go
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="d-md-flex align-items-center gap-3 m-2">
            {/* ── Bell — students only ── */}
            {(role === "user" || role === "doctor") && (
              <div ref={bellRef} style={{ position: "relative" }}>
                <button
                  onClick={handleBellClick}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    padding: "4px 6px",
                  }}
                >
                  <i
                    className="fa-solid fa-bell text-white"
                    style={{ fontSize: 18 }}
                  ></i>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: "#ef4444",
                        border: "2px solid #633a19",
                      }}
                    />
                  )}
                </button>

                {/* ── Dropdown ── */}
                {showNotifs && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      width: 320,
                      background: "#fff",
                      borderRadius: 14,
                      boxShadow: "0 12px 36px rgba(0,0,0,0.15)",
                      zIndex: 2000,
                      overflow: "hidden",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#633a19",
                        }}
                      >
                        Notifications
                        {unreadCount > 0 && (
                          <span
                            style={{
                              marginLeft: 8,
                              background: "#ef4444",
                              color: "#fff",
                              borderRadius: 20,
                              fontSize: 11,
                              padding: "1px 7px",
                              fontWeight: 600,
                            }}
                          >
                            {unreadCount}
                          </span>
                        )}
                      </span>

                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearAll();
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 12,
                            color: "#9ca3af",
                            padding: 0,
                          }}
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Body */}
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: "32px 16px",
                          textAlign: "center",
                          color: "#9ca3af",
                        }}
                      >
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                        <div style={{ fontSize: 13 }}>No notifications yet</div>
                      </div>
                    ) : (
                      <div style={{ maxHeight: 340, overflowY: "auto" }}>
                        {notifications.map((n) => {
                          const isAccept = n.type === "accept";
                          return (
                            <div
                              key={n.id}
                              style={{
                                padding: "12px 16px",
                                borderBottom: "1px solid #f5f5f5",
                                background: n.read ? "#fff" : "#fdf5ef",
                                display: "flex",
                                gap: 12,
                                alignItems: "flex-start",
                                transition: "background 0.2s",
                                position: "relative",
                              }}
                            >
                              {/* Icon */}
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "50%",
                                  background: isAccept ? "#dcfce7" : "#fee2e2",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 16,
                                  flexShrink: 0,
                                }}
                              >
                                {isAccept ? "✅" : "❌"}
                              </div>

                              {/* Content */}
                              <div
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  paddingRight: 20,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#1f2937",
                                    lineHeight: 1.4,
                                    fontWeight: 600,
                                  }}
                                >
                                  {isAccept
                                    ? "Request Approved"
                                    : "Request Denied"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#6b7280",
                                    marginTop: 2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {n.book}
                                </div>

                                {isAccept ? (
                                  <Link
                                    to="/my-borrowed-books"
                                    onClick={() => setShowNotifs(false)}
                                    style={{
                                      fontSize: 12,
                                      color: "#633a19",
                                      fontWeight: 600,
                                      marginTop: 4,
                                      display: "inline-block",
                                    }}
                                  >
                                    View borrowed books →
                                  </Link>
                                ) : (
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      marginTop: 6,
                                    }}
                                  >
                                    <Link
                                      to="/books"
                                      onClick={() => setShowNotifs(false)}
                                      style={{
                                        fontSize: 11,
                                        color: "#fff",
                                        background: "#633a19",
                                        borderRadius: 6,
                                        padding: "3px 8px",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                      }}
                                    >
                                      Try Again
                                    </Link>
                                    <a
                                      style={{
                                        fontSize: 11,
                                        color: "#633a19",
                                        border: "1px solid #633a19",
                                        borderRadius: 6,
                                        padding: "3px 8px",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                      }}
                                    >
                                      Contact Admin
                                    </a>
                                  </div>
                                )}

                                {/* Time */}
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#9ca3af",
                                    marginTop: 4,
                                  }}
                                >
                                  {formatTime(n.timestamp)}
                                </div>
                              </div>

                              {/* × dismiss button */}
                              <button
                                onClick={() =>
                                  removeNotification(n.id, userUid)
                                }
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  right: 10,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#d1d5db",
                                  fontSize: 15,
                                  lineHeight: 1,
                                  padding: 2,
                                }}
                                title="Dismiss"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="d-none d-md-flex align-items-center gap-3">
              <Link className="px-2" to="/user">
                <span className="rounded-circle border p-1 hover-bg">
                  <i className="fa-solid fa-user text-white"></i>
                </span>
              </Link>

              {role && (
                <button
                  onClick={handleLogout}
                  className="border-0 bg-transparent text-white hover-links"
                  title="Logout"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
