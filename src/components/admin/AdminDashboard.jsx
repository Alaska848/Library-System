import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, subColor, loading }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: "24px 28px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      display: "flex",
      alignItems: "flex-start",
      gap: 18,
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "rgba(99,58,25,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600, marginBottom: 4, letterSpacing: "0.03em" }}>{label.toUpperCase()}</div>
        {loading
          ? <div style={{ width: 60, height: 28, borderRadius: 6, background: "#f3f4f6", animation: "pulse 1.5s infinite" }} />
          : <div style={{ fontSize: 28, fontWeight: 800, color: "#1f2937", lineHeight: 1 }}>{(value || 0).toLocaleString()}</div>
        }
        {sub && <div style={{ fontSize: 12, color: subColor || "#16a34a", fontWeight: 600, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function BarChart({ data, maxVal }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, paddingTop: 8 }}>
      {days.map((day, i) => {
        const val = data[i] || 0;
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        return (
          <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{val > 0 ? val : ""}</div>
            <div style={{ width: "100%", height: 90, display: "flex", alignItems: "flex-end" }}>
              <div style={{
                width: "100%",
                height: `${Math.max(pct, 4)}%`,
                borderRadius: "6px 6px 0 0",
                background: pct > 0 ? "linear-gradient(180deg, #9e734a, #633a19)" : "#f3f4f6",
                transition: "height 0.6s ease",
              }} />
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{day}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, total }) {
  if (!total || total === 0) return (
    <div style={{ width: 140, height: 140, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No data</div>
  );
  let offset = 0;
  const r = 54, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={16} />
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const rotation = offset * 360 - 90;
        offset += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={16}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={0}
            transform={`rotate(${rotation} ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={20} fontWeight={800} fill="#1f2937">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="#9ca3af">Total</text>
    </svg>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [students, setStudents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, "books"), snap => {
        setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(collection(db, "loans"), snap => {
        setLoans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }),
      onSnapshot(collection(db, "students"), snap => {
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(collection(db, "admins"), snap => {
        setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(
        query(collection(db, "books"), where("source", "==", "doctor_request"), where("requestStatus", "==", "pending")),
        snap => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // ── Stats ──
  const totalBooks = books.length;
  const availableBooks = books.filter(b => b.status === "available").length;
  const borrowedBooks = books.filter(b => b.status === "borrowed" || b.status === "Borrowed").length;
  const totalUsers = students.length + admins.length;
  const activeLoans = loans.filter(l => l.status === "Active" || l.status === "active").length;
  const overdueLoans = loans.filter(l => l.status === "Overdue" || l.status === "overdue").length;
  const pendingRequests = requests.length;

  // ── Weekly activity: loans per day of week ──
  const weeklyData = Array(7).fill(0);
  loans.forEach(l => {
    if (l.createdAt?.toDate) {
      const day = l.createdAt.toDate().getDay();
      weeklyData[day]++;
    }
  });
  const maxWeekly = Math.max(...weeklyData, 1);

  // ── Category breakdown ──
  const catMap = {};
  books.forEach(b => {
    const cat = b.category || "Other";
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const catColors = ["#633a19", "#9e734a", "#c9a07a", "#e8d5bc", "#4a2c13", "#b07d4a"];
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catTotal = catEntries.reduce((s, [, v]) => s + v, 0);
  const donutSegments = catEntries.map(([name, value], i) => ({ name, value, color: catColors[i % catColors.length] }));

  // ── Most borrowed books ──
  const bookBorrowCount = {};
  loans.forEach(l => {
    if (l.bookId || l.bookTitle) {
      const key = l.bookId || l.bookTitle;
      bookBorrowCount[key] = { count: (bookBorrowCount[key]?.count || 0) + 1, title: l.bookTitle || l.bookId };
    }
  });
  const topBooks = Object.values(bookBorrowCount).sort((a, b) => b.count - a.count).slice(0, 4);

  // ── Recent loans ──
  const recentLoans = [...loans].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 5);

  const adminName = sessionStorage.getItem("name") || sessionStorage.getItem("email")?.split("@")[0] || "Admin";

  return (
    <div style={{ minHeight: "100vh", background: "#f9f6f2", paddingTop: 70 }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .dash-link { text-decoration: none; }
        .dash-link:hover { text-decoration: none; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>WELCOME BACK</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1f2937", margin: 0 }}>{adminName} 👋</h1>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          {pendingRequests > 0 && (
            <button onClick={() => navigate("/admin/FacultyRequests")}
              style={{ background: "#633a19", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "#ef4444", borderRadius: "50%", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{pendingRequests}</span>
              Pending Faculty Requests
            </button>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
          <StatCard icon="📚" label="Total Books" value={totalBooks} sub={`${availableBooks} available`} loading={loading} />
          <StatCard icon="👥" label="Total Users" value={totalUsers} sub={`${admins.length} admins`} loading={loading} />
          <StatCard icon="🔄" label="Active Loans" value={activeLoans} sub={overdueLoans > 0 ? `⚠ ${overdueLoans} overdue` : "All on time"} subColor={overdueLoans > 0 ? "#ef4444" : "#16a34a"} loading={loading} />
          <StatCard icon="📖" label="Currently Borrowed" value={borrowedBooks} sub="books checked out" loading={loading} />
        </div>

        {/* ── Charts Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>

          {/* Weekly Borrowing */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#1f2937" }}>Weekly Borrowing Activity</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>Loans registered this week</div>
              </div>
              <span style={{ background: "rgba(99,58,25,0.08)", color: "#633a19", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>Last 7 Days</span>
            </div>
            <BarChart data={weeklyData} maxVal={maxWeekly} />
          </div>

          {/* Category Breakdown */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#1f2937", marginBottom: 4 }}>Most Popular Categories</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Books by category</div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <DonutChart segments={donutSegments} total={catTotal} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {catEntries.map(([name, value], i) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: catColors[i], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, color: "#374151", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                    <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>{catTotal > 0 ? Math.round((value / catTotal) * 100) : 0}%</div>
                  </div>
                ))}
                {catEntries.length === 0 && <div style={{ color: "#9ca3af", fontSize: 13 }}>No books yet</div>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>

          {/* Most Borrowed Books */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#1f2937", marginBottom: 4 }}>Most Borrowed Books</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Based on loan history</div>
            {topBooks.length === 0
              ? <div style={{ textAlign: "center", color: "#9ca3af", padding: "24px 0", fontSize: 14 }}>No loan data yet</div>
              : topBooks.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < topBooks.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                  <div style={{ width: 40, height: 52, borderRadius: 6, background: `linear-gradient(135deg, ${catColors[i]}, ${catColors[(i + 1) % catColors.length]})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>📖</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1f2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.title}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#633a19", fontWeight: 800, flexShrink: 0 }}>{b.count} <span style={{ fontWeight: 500, color: "#9ca3af", fontSize: 11 }}>LOANS</span></div>
                </div>
              ))
            }
          </div>

          {/* Recent Loans */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#1f2937" }}>Recent Loans</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>Latest borrowing activity</div>
              </div>
              <button onClick={() => navigate("/admin/BorrowingLog")}
                style={{ background: "rgba(99,58,25,0.08)", color: "#633a19", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                View All
              </button>
            </div>
            {recentLoans.length === 0
              ? <div style={{ textAlign: "center", color: "#9ca3af", padding: "24px 0", fontSize: 14 }}>No loans yet</div>
              : recentLoans.map((loan, i) => {
                const statusColors = {
                  Active: { bg: "#dbeafe", color: "#2563eb" },
                  active: { bg: "#dbeafe", color: "#2563eb" },
                  Returned: { bg: "#d1fae5", color: "#059669" },
                  returned: { bg: "#d1fae5", color: "#059669" },
                  Overdue: { bg: "#fee2e2", color: "#dc2626" },
                  overdue: { bg: "#fee2e2", color: "#dc2626" },
                  Pending: { bg: "#fef3c7", color: "#b45309" },
                };
                const sc = statusColors[loan.status] || { bg: "#f3f4f6", color: "#6b7280" };
                return (
                  <div key={loan.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < recentLoans.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#c9a07a,#633a19)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "#fff", fontSize: 14 }}>📚</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1f2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{loan.bookTitle || loan.bookId || "—"}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{loan.userName || loan.userId?.slice(0, 8) || "—"}</div>
                    </div>
                    <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "3px 10px", flexShrink: 0 }}>{loan.status}</span>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#1f2937", marginBottom: 20 }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { icon: "📚", label: "Manage Books", path: "/admin/BooksM" },
              { icon: "👥", label: "Manage Users", path: "/admin/UserManagement" },
              { icon: "🔄", label: "Borrowing Log", path: "/admin/BorrowingLog" },
              { icon: "📋", label: "Faculty Requests", path: "/admin/FacultyRequests", badge: pendingRequests },
            ].map(({ icon, label, path, badge }) => (
              <button key={path} onClick={() => navigate(path)} style={{
                background: "#f9f6f2", border: "1.5px solid #f0ece6", borderRadius: 12,
                padding: "16px 20px", cursor: "pointer", textAlign: "left",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 12,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#633a19"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#633a19"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f9f6f2"; e.currentTarget.style.color = ""; e.currentTarget.style.borderColor = "#f0ece6"; }}
              >
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
                {badge > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, marginLeft: "auto" }}>{badge}</span>}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
