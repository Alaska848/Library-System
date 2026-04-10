import { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const statusStyle = {
  Active: { background: "#DBEAFE", color: "#2563EB" },
  Returned: { background: "#D1FAE5", color: "#059669" },
  Overdue: { background: "#FEE2E2", color: "#DC2626" },
  Pending: { background: "#FEF3C7", color: "#B45309" },
  Rejected: { background: "#F3F4F6", color: "#6B7280" },
};

export default function LibraryDashboard() {
  const [loans, setLoans] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Current Loans");
  const navigate = useNavigate();

  // Get logged-in user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Fetch loans for this user where status is Active, Overdue, or Returned
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "loans"),
      where("userId", "==", currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      setLoans(list);
    });

    return () => unsub();
  }, [currentUser]);

  const visibleLoans = loans.filter((l) =>
    ["Active", "Overdue", "Returned"].includes(l.status)
  );

  const currentLoans = visibleLoans.filter((l) =>
    ["Active", "Overdue"].includes(l.status)
  );
  const historyLoans = visibleLoans.filter((l) => l.status === "Returned");

  const displayedLoans =
    activeTab === "Current Loans" ? currentLoans : historyLoans;

  const totalBorrowed = visibleLoans.length;
  const currentlyActive = currentLoans.filter((l) => l.status === "Active").length;
  const overdueItems = currentLoans.filter((l) => l.status === "Overdue").length;

  const initials = currentUser?.displayName
    ? currentUser.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div style={s.page}>
      {/* Header Stats */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>My Borrowed Books</h1>
          <p style={s.pageSubtitle}>
            View and manage your current loans and track your reading journey
            through your borrowing history.
          </p>
        </div>
        <button
          type="button"
          style={s.borrowBtn}
          onClick={() => navigate("/admin/BooksM")}
        >
          + Borrow New Book
        </button>
      </div>

      {/* Stats Cards */}
      <div style={s.statsRow}>
        <div style={s.statCard}>
          <div>
            <div style={s.statLabel}>Total Borrowed</div>
            <div style={s.statNumber}>{totalBorrowed}</div>
            <div style={s.statSub}>
              <span style={{ color: "#059669" }}>↑ +2%</span> from last month
            </div>
          </div>
          <span style={s.statIcon}>📚</span>
        </div>
        <div style={s.statCard}>
          <div>
            <div style={s.statLabel}>Currently Active</div>
            <div style={s.statNumber}>{currentlyActive}</div>
            <div style={s.statSub}>— Same as last week</div>
          </div>
          <span style={s.statIcon}>🔵</span>
        </div>
        <div style={s.statCard}>
          <div>
            <div style={s.statLabel}>Overdue Items</div>
            <div style={{ ...s.statNumber, color: "#DC2626" }}>{overdueItems}</div>
            <div style={{ ...s.statSub, color: "#DC2626" }}>
              {overdueItems > 0 ? "↘ Action required" : "All good!"}
            </div>
          </div>
          <span style={s.statIcon}>⚠️</span>
        </div>
      </div>

      {/* Loan Records Table */}
      <div style={s.tableCard}>
        <div style={s.tableHeader}>
          <h2 style={s.tableTitle}>Loan Records</h2>
          <div style={s.tableActions}>
            <button type="button" style={s.filterBtn}>≡ Filter</button>
            <button type="button" style={s.exportBtn}>↓ Export</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {["Current Loans", "Borrowing History"].map((tab) => (
            <button
              key={tab}
              type="button"
              style={activeTab === tab ? s.tabActive : s.tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <table style={s.table}>
          <thead>
            <tr>
              {["Book Title", "Borrow Date", "Return Date", "Status", "Action"].map(
                (h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {displayedLoans.length === 0 && (
              <tr>
                <td colSpan={5} style={s.emptyCell}>
                  No records found
                </td>
              </tr>
            )}
            {displayedLoans.map((loan) => (
              <tr key={loan.id} style={s.tr}>
                <td style={s.td}>
                  <div style={s.bookCell}>
                    <div style={s.bookThumb}>📖</div>
                    <div>
                      <div style={s.bookTitle}>{loan.book}</div>
                      <div style={s.bookAuthor}>{loan.author || ""}</div>
                    </div>
                  </div>
                </td>
                <td style={s.td}>{loan.loanDate || "—"}</td>
                <td
                  style={{
                    ...s.td,
                    color: loan.status === "Overdue" ? "#DC2626" : "inherit",
                    fontWeight: loan.status === "Overdue" ? 600 : 400,
                    fontStyle: loan.status === "Overdue" ? "italic" : "normal",
                  }}
                >
                  {loan.dueDate || "—"}
                </td>
                <td style={s.td}>
                  <span
                    style={{
                      ...s.badge,
                      ...(statusStyle[loan.status] || {
                        background: "#F3F4F6",
                        color: "#374151",
                      }),
                    }}
                  >
                    {loan.status}
                  </span>
                </td>
                <td style={s.td}>
                  {loan.status === "Overdue" && (
                    <button type="button" style={s.renewBtn}>
                      Renew
                    </button>
                  )}
                  {loan.status === "Returned" && (
                    <span style={{ color: "#9CA3AF", fontSize: 20 }}>···</span>
                  )}
                  {loan.status === "Active" && (
                    <span style={{ color: "#9CA3AF", fontSize: 20 }}>···</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={s.pagination}>
          <span>
            Showing {displayedLoans.length} of {totalBorrowed} records
          </span>
          <div style={s.pages}>
            <button type="button" style={s.pageBtn}>‹</button>
            <button type="button" style={{ ...s.pageBtn, ...s.pageBtnActive }}>1</button>
            <button type="button" style={s.pageBtn}>›</button>
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div style={s.ctaBanner}>
        <div>
          <h3 style={s.ctaTitle}>Ready for your next adventure?</h3>
          <p style={s.ctaText}>
            Browse through our new arrivals and personalized recommendations
            based on your borrowing history.
          </p>
          <button
            type="button"
            style={s.ctaBtn}
            onClick={() => navigate("/admin/BooksM")}
          >
            Explore Catalog
          </button>
        </div>
        <div style={s.ctaIllustration}>📚</div>
      </div>
    </div>
  );
}

const s = {
  page: {
    padding: "80px 40px 32px 40px",
    fontFamily: "Segoe UI, sans-serif",
    background: "#F9FAFB",
    color: "#111827",
    minHeight: "100vh",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
    gap: 20,
  },
  pageTitle: { fontSize: 28, fontWeight: 800, margin: 0, marginBottom: 6 },
  pageSubtitle: { color: "#6B7280", fontSize: 14, maxWidth: 500, margin: 0 },
  borrowBtn: {
    background: "#92400E",
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 10,
    padding: "12px 22px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  statsRow: { display: "flex", gap: 16, marginBottom: 24 },
  statCard: {
    flex: 1,
    background: "#fff",
    borderRadius: 14,
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  },
  statLabel: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  statNumber: { fontSize: 32, fontWeight: 800, marginBottom: 4 },
  statSub: { fontSize: 12, color: "#6B7280" },
  statIcon: { fontSize: 32 },
  tableCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 28,
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    marginBottom: 24,
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  tableTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
  tableActions: { display: "flex", gap: 8 },
  filterBtn: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    outline: "none",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    color: "#374151",
  },
  exportBtn: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    outline: "none",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    color: "#374151",
  },
  tabs: {
    display: "flex",
    gap: 0,
    borderBottom: "2px solid #E5E7EB",
    marginBottom: 20,
  },
  tab: {
    background: "none",
    border: "none",
    outline: "none",
    padding: "10px 18px",
    cursor: "pointer",
    fontSize: 14,
    color: "#6B7280",
    fontWeight: 500,
  },
  tabActive: {
    background: "none",
    border: "none",
    outline: "none",
    padding: "10px 18px",
    cursor: "pointer",
    fontSize: 14,
    color: "#92400E",
    fontWeight: 700,
    borderBottom: "2px solid #92400E",
    marginBottom: -2,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#9CA3AF",
    textTransform: "uppercase",
    padding: "8px 12px",
    letterSpacing: "0.07em",
  },
  tr: { borderTop: "1px solid #F3F4F6" },
  td: { padding: "16px 12px", fontSize: 14, verticalAlign: "middle" },
  emptyCell: {
    textAlign: "center",
    padding: 40,
    color: "#9CA3AF",
    fontSize: 14,
  },
  bookCell: { display: "flex", alignItems: "center", gap: 12 },
  bookThumb: {
    width: 40,
    height: 48,
    borderRadius: 6,
    background: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    flexShrink: 0,
  },
  bookTitle: { fontWeight: 600, fontSize: 14, marginBottom: 2 },
  bookAuthor: { fontSize: 12, color: "#6B7280" },
  badge: {
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  renewBtn: {
    background: "#fff",
    border: "1px solid #92400E",
    outline: "none",
    borderRadius: 6,
    padding: "5px 14px",
    fontSize: 12,
    cursor: "pointer",
    color: "#92400E",
    fontWeight: 600,
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    fontSize: 13,
    color: "#6B7280",
  },
  pages: { display: "flex", gap: 6 },
  pageBtn: {
    width: 32,
    height: 32,
    border: "1px solid #E5E7EB",
    outline: "none",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  pageBtnActive: { background: "#92400E", color: "#fff", border: "none" },
  ctaBanner: {
    background: "#fff",
    borderRadius: 14,
    padding: "32px 36px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaTitle: { fontSize: 22, fontWeight: 800, margin: "0 0 8px 0" },
  ctaText: { color: "#6B7280", fontSize: 14, marginBottom: 20, maxWidth: 420 },
  ctaBtn: {
    background: "#92400E",
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 10,
    padding: "12px 24px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  ctaIllustration: {
    fontSize: 80,
    opacity: 0.15,
    userSelect: "none",
  },
};
