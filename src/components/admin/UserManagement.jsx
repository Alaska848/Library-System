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

const TABS = ["All", "Students", "Faculty Members", "Admins"];
const PER_PAGE = 6;
const EMPTY_FORM = { name: "", email: "", dept: "", role: "", status: "Active", books: 0 };

function getInitials(name) {
  if (!name || typeof name !== 'string') return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getUserCategory(user) {
  if (!user || !user.role) return "Other";
  const r = user.role.toLowerCase(); 
  
  if (r.includes("admin")) return "Admin";
  if (r.includes("staff") || r.includes("faculty")) return "Faculty";
  if (r.includes("student")) return "Student";
  
  return "Other"; 
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
        <h4 className="fw-bold mb-0">{(value || 0).toLocaleString()}</h4>
      </div>
    </div>
  );
}

function UserAvatar({ name, userId }) {
  const colorIndex = typeof userId === 'string' ? userId.length : 0;
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
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  // جلب البيانات من كولكشن الطلاب والأدمنز معاً
  useEffect(() => {
    const collectionsData = { students: [], admins: [] };

    const syncUsers = () => {
      setUsers([...collectionsData.students, ...collectionsData.admins]);
    };

    const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      collectionsData.students = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      syncUsers();
    });

    const unsubAdmins = onSnapshot(collection(db, "admins"), (snapshot) => {
      collectionsData.admins = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      syncUsers();
    });

    return () => {
      unsubStudents();
      unsubAdmins();
    };
  }, []);

  const stats = useMemo(() => ({
    total: users.length,
    students: users.filter((u) => getUserCategory(u) === "Student").length,
    faculty: users.filter((u) => getUserCategory(u) === "Faculty").length,
    suspended: users.filter((u) => u.status === "Suspended").length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const tabMatch =
        activeTab === "All" ||
        (activeTab === "Students" && getUserCategory(u) === "Student") ||
        (activeTab === "Faculty Members" && getUserCategory(u) === "Faculty") ||
        (activeTab === "Admins" && getUserCategory(u) === "Admin");

      const q = search.toLowerCase();
      const searchMatch =
        !q ||
        (u.name?.toLowerCase().includes(q)) ||
        (u.email?.toLowerCase().includes(q)) ||
        (u.dept?.toLowerCase().includes(q));

      return tabMatch && searchMatch;
    });
  }, [users, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: false }));
  }

  function validateForm() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = true;
    if (!form.email.trim()) newErrors.email = true;
    if (!form.dept) newErrors.dept = true;
    if (!form.role) newErrors.role = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleAddUser() {
    if (!validateForm()) return;
    
    // تحديد الكولكشن المستهدف بناءً على الرول المختار
    const targetCollection = form.role === "Admin" ? "admins" : "students";

    try {
      await addDoc(collection(db, targetCollection), {
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
      setIsOpen(false);
    } catch (err) {
      console.error("Error adding user:", err);
    }
  }

  async function handleDeleteUser(user) {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      // تحديد الكولكشن للحذف بناءً على رول المستخدم الحالي
      const targetCollection = user.role === "Admin" ? "admins" : "students";
      try {
        await deleteDoc(doc(db, targetCollection, user.id));
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
    <div className="bg-light my-4 mb-0 py-5">
      <div className="container-xl py-4 px-3 px-md-4">
        <div className="container p-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center">
            <div className="col-md-6 text-center text-md-start">
              <h1 className="brown fw-bolder">User Management</h1>
              <p className="fs-5 text-muted">Manage student, faculty data and system permissions</p>
            </div>
            <div className="d-flex gap-2 mt-3 mt-md-0">
               <input 
                  type="text" 
                  className="form-control rounded-4 px-3" 
                  placeholder="Search by name, email..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '250px' }}
               />
               <button
                 onClick={() => setIsOpen(true)}
                 className="bg-brown text-white p-3 px-4 rounded-4 shadow-sm border-0 hover"
               >
                 <i className="fa-solid fa-plus me-1"></i> Add User
               </button>
            </div>
          </div>
        </div>

        {/* Modal / Form */}
        {isOpen && (
          <div
            className="position-fixed top-0 start-0 end-0 bottom-0 d-flex justify-content-center align-items-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
          >
            <div className="bg-white p-4 p-md-5 rounded-4 shadow w-75" style={{maxWidth: '800px'}}>
              <h2 className="fw-bold brown border-bottom pb-3 mb-4">Add New User</h2>
              <form className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-uppercase">Full Name *</label>
                  <input type="text" className={`form-control ${errors.name ? "is-invalid" : ""}`} value={form.name} onChange={(e) => handleFormChange("name", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-uppercase">Email *</label>
                  <input type="email" className={`form-control ${errors.email ? "is-invalid" : ""}`} value={form.email} onChange={(e) => handleFormChange("email", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-uppercase">Department *</label>
                  <select className={`form-select ${errors.dept ? "is-invalid" : ""}`} value={form.dept} onChange={(e) => handleFormChange("dept", e.target.value)}>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-uppercase">Role *</label>
                  <select className={`form-select ${errors.role ? "is-invalid" : ""}`} value={form.role} onChange={(e) => handleFormChange("role", e.target.value)}>
                    <option value="">Select Role</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-uppercase">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => handleFormChange("status", e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-uppercase">Books</label>
                  <input type="number" className="form-control" value={form.books} onChange={(e) => handleFormChange("books", e.target.value)} />
                </div>
                
                {Object.keys(errors).length > 0 && <div className="col-12 text-danger small">⚠️ Please fill in all required fields.</div>}
                
                <div className="col-12 d-flex gap-2 justify-content-end mt-4">
                  <button type="button" className="bg-brown text-white px-4 py-2 rounded-2 hover border-0" onClick={handleAddUser}>Add User</button>
                  <button type="button" className="btn btn-secondary px-4 py-2" onClick={() => { setIsOpen(false); setForm(EMPTY_FORM); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

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
            <ul className="nav nav-tabs card-header-tabs">
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
                  <tr><td colSpan={5} className="text-center py-5 text-muted">No users found.</td></tr>
                ) : (
                  visibleUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-3">
                          <UserAvatar name={user.name || "N/A"} userId={user.id} />
                          <div>
                            <div className="fw-medium" style={{ fontSize: "0.875rem" }}>{user.name || "Unnamed User"}</div>
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>{user.email || "No email provided"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium" style={{ fontSize: "0.875rem" }}>{user.dept || "No Dept"}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>{user.role || "No Role"}</div>
                      </td>
                      <td style={{ fontSize: "0.875rem" }}>{user.books || 0} books</td>
                      <td><StatusBadge status={user.status} /></td>
                      <td>
                        <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteUser(user)}>🗑</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
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