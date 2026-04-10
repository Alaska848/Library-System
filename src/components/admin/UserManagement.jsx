import { useState, useMemo, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

import { db } from "../firebase"; 


import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";


const DEPARTMENTS = [
  "Faculty of Engineering",
  "Faculty of Science",
  "Faculty of Arts",
  "Faculty of Medicine",
  "Faculty of Computing",
  "Faculty of Business",
];
 
const ROLES = [
  "Student",
  "Faculty Staff",
  "Admin",
];

const TABS       = ["All", "Students", "Faculty Members", "Admins"];
const PER_PAGE   = 6;
const EMPTY_FORM = { name: "", email: "", dept: "", role: "", status: "Active", books: 0 };

function getInitials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function getUserCategory(user) {
  const r = user.role.toLowerCase();
  if (r.includes("admin")) return "Admin";
  if (r.includes("staff")) return "Faculty";
  return "Student";
}

const AVATAR_COLORS = [
  { bg: "#e5e7eb", color: "#374151" },
  { bg: "#1f2937", color: "#f9fafb" },
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#ede9fe", color: "#6d28d9" },
  { bg: "#ffedd5", color: "#c2410c" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fce7f3", color: "#9d174d" },
  { bg: "#e0e7ff", color: "#3730a3" },
];

function StatCard({ icon, label, value, badge, badgeColor }) {
  return (
    <div className="card h-100 border shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span style={{ fontSize: "1.5rem" }}>{icon}</span>
          {badge && (
            <span className={`badge text-${badgeColor} bg-${badgeColor}-subtle fw-semibold`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-muted small mb-1">{label}</p>
        <h4 className="fw-bold mb-0">{value.toLocaleString()}</h4>
      </div>
    </div>
  );
}

function UserAvatar({ name, userId }) {
  // بما أن الـ ID أصبح نصياً، نستخدم طول النص لتحديد اللون
  const colorIndex = typeof userId === 'string' ? userId.length : userId;
  const { bg, color } = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
      style={{ width: 38, height: 38, background: bg, color, fontSize: "0.8rem", border: "2px solid #dee2e6" }}
    >
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }) {
  return status === "Active" ? (
    <span className="badge rounded-pill bg-success-subtle text-success fw-semibold">Active</span>
  ) : (
    <span className="badge rounded-pill bg-danger-subtle text-danger fw-semibold">Suspended</span>
  );
}

export default function UserManagement() {
  const [users,     setUsers]     = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(1);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});

  // جلب البيانات لحظياً من Firestore
  useEffect(() => {
    const colRef = collection(db, "users");
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  const stats = {
    total:     users.length,
    students:  users.filter((u) => getUserCategory(u) === "Student").length,
    faculty:   users.filter((u) => getUserCategory(u) === "Faculty").length,
    suspended: users.filter((u) => u.status === "Suspended").length,
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const tabMatch =
        activeTab === "All" ||
        (activeTab === "Students"        && getUserCategory(u) === "Student") ||
        (activeTab === "Faculty Members" && getUserCategory(u) === "Faculty") ||
        (activeTab === "Admins"          && getUserCategory(u) === "Admin");

      const q = search.toLowerCase();
      const searchMatch =
        !q ||
        u.name.toLowerCase().includes(q)  ||
        u.email.toLowerCase().includes(q) ||
        u.dept.toLowerCase().includes(q);

      return tabMatch && searchMatch;
    });
  }, [users, activeTab, search]);

  const totalPages   = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const currentPage  = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: false }));
  }

  function validateForm() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name  = true;
    if (!form.email.trim()) newErrors.email = true;
    if (!form.dept)         newErrors.dept  = true;
    if (!form.role)         newErrors.role  = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleAddUser() {
    if (!validateForm()) return;
    try {
      await addDoc(collection(db, "users"), {
        name: form.name.trim(),
        email: form.email.trim(),
        dept: form.dept,
        role: form.role,
        status: form.status,
        books: parseInt(form.books) || 0,
        createdAt: new Date()
      });
      setForm(EMPTY_FORM);
      setErrors({});
      setPage(1);
    } catch (err) {
      console.error("Error adding user:", err);
    }
  }

  async function handleDeleteUser(id) {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteDoc(doc(db, "users", id));
      } catch (err) {
        console.error("Error deleting user:", err);
      }
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  return (
    <div className="bg-light my-4 py-5">
      <div className="container-xl py-4 px-3 px-md-4">
        <div className="mb-4">
          <h2 className="fw-bold mb-1 brown" style={{ letterSpacing: "-0.4px" }}>User Management</h2>
          <p className="text-muted mb-0 small">Manage student, faculty data and system permissions</p>
        </div>

        {/* Form Section */}
        <div className="card border shadow-sm mb-4">
          <div className="card-body">
            <h6 className="fw-semibold mb-3">➕ Add New User</h6>
            <div className="row g-2 g-md-3 mb-3">
              <div className="col-12 col-sm-6 col-lg-2">
                <label className="form-label form-label-sm text-muted fw-semibold text-uppercase" style={{ fontSize: "0.7rem" }}>Full Name *</label>
                <input
                  type="text"
                  className={`form-control form-control-sm ${errors.name ? "is-invalid" : ""}`}
                  placeholder="e.g. Sara Ahmed"
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <label className="form-label form-label-sm text-muted fw-semibold text-uppercase" style={{ fontSize: "0.7rem" }}>Email *</label>
                <input
                  type="email"
                  className={`form-control form-control-sm ${errors.email ? "is-invalid" : ""}`}
                  placeholder="user@univ.edu.sa"
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-2">
                <label className="form-label form-label-sm text-muted fw-semibold text-uppercase" style={{ fontSize: "0.7rem" }}>Department *</label>
                <select
                  className={`form-select form-select-sm ${errors.dept ? "is-invalid" : ""}`}
                  value={form.dept}
                  onChange={(e) => handleFormChange("dept", e.target.value)}
                >
                  <option value="">Select...</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-12 col-sm-6 col-lg-2">
                <label className="form-label form-label-sm text-muted fw-semibold text-uppercase" style={{ fontSize: "0.7rem" }}>Role *</label>
                <select
                  className={`form-select form-select-sm ${errors.role ? "is-invalid" : ""}`}
                  value={form.role}
                  onChange={(e) => handleFormChange("role", e.target.value)}
                >
                  <option value="">Select...</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label form-label-sm text-muted fw-semibold text-uppercase" style={{ fontSize: "0.7rem" }}>Status</label>
                <select className="form-select form-select-sm" value={form.status} onChange={(e) => handleFormChange("status", e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="col-6 col-lg-1">
                <label className="form-label form-label-sm text-muted fw-semibold text-uppercase" style={{ fontSize: "0.7rem" }}>Books</label>
                <input type="number" min="0" className="form-control form-control-sm" value={form.books} onChange={(e) => handleFormChange("books", e.target.value)} />
              </div>
            </div>
            {Object.keys(errors).length > 0 && <p className="text-danger small mb-2">⚠️ Please fill in all required fields.</p>}
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); }}>Clear</button>
              <button className="text-white rounded-1 fs-6 bg-brown px-2 hover" onClick={handleAddUser}>Add User</button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3"><StatCard icon="👥" label="Total Users" value={stats.total} /></div>
          <div className="col-6 col-md-3"><StatCard icon="🎓" label="Students" value={stats.students} /></div>
          <div className="col-6 col-md-3"><StatCard icon="💼" label="Faculty Members" value={stats.faculty} /></div>
          <div className="col-6 col-md-3"><StatCard icon="🚫" label="Suspended" value={stats.suspended} badgeColor="danger" /></div>
        </div>

        {/* Table Section */}
        <div className="card border shadow-sm">
          <div className="card-header bg-white py-0">
            <ul className="nav nav-tabs card-header-tabs border-bottom-0">
              {TABS.map((tab) => (
                <li className="nav-item" key={tab}>
                  <button className={`nav-link py-3 ${activeTab === tab ? "active fw-semibold text-dark" : "text-muted"}`} onClick={() => handleTabChange(tab)}>{tab}</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 text-muted fw-semibold text-uppercase" style={{ fontSize: "0.68rem" }}>User</th>
                  <th className="text-muted fw-semibold text-uppercase" style={{ fontSize: "0.68rem" }}>Dept / Role</th>
                  <th className="text-muted fw-semibold text-uppercase" style={{ fontSize: "0.68rem" }}>Books</th>
                  <th className="text-muted fw-semibold text-uppercase" style={{ fontSize: "0.68rem" }}>Status</th>
                  <th className="text-muted fw-semibold text-uppercase" style={{ fontSize: "0.68rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-5">No users found.</td></tr>
                ) : (
                  visibleUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-3">
                          <UserAvatar name={user.name} userId={user.id} />
                          <div>
                            <div className="fw-medium" style={{ fontSize: "0.875rem" }}>{user.name}</div>
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium" style={{ fontSize: "0.875rem" }}>{user.dept}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>{user.role}</div>
                      </td>
                      <td style={{ fontSize: "0.875rem" }}>{user.books || 0} books</td>
                      <td><StatusBadge status={user.status} /></td>
                      <td>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteUser(user.id)}>🗑</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="card-footer bg-white d-flex justify-content-between py-3">
            <span className="text-muted small">Showing {visibleUsers.length} of {filteredUsers.length}</span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}><button className="page-link" onClick={() => setPage(p => p - 1)}>‹</button></li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <li key={p} className={`page-item ${p === currentPage ? "active" : ""}`}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}><button className="page-link" onClick={() => setPage(p => p + 1)}>›</button></li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}