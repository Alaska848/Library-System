import { useState, useMemo, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { db } from "../firebase";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

const DEPARTMENTS = [
  "Faculty of Engineering",
  "Faculty of Science",
  "Faculty of Arts",
  "Faculty of Medicine",
  "Faculty of Computing",
  "Faculty of Business",
];

const ROLES = ["Student", "Doctor", "Faculty Staff", "Admin"];
const TABS = ["All", "Students", "Faculty Members", "Admins"];
const PER_PAGE = 6;

const EMPTY_FORM = {
  name: "",
  email: "",
  dept: "",
  role: "",
  status: "Active",
  books: 0,
};

function getInitials(name) {
  if (!name || typeof name !== "string") return "??";
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
  if (r.includes("doctor") || r.includes("staff") || r.includes("faculty")) {
    return "Faculty";
  }
  if (r.includes("student")) return "Student";

  return "Other";
}

function getCollectionName(role) {
  if (role === "Admin") return "admins";
  if (role === "Doctor" || role === "Faculty Staff") return "doctors";
  return "students";
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

function StatCard({ icon, label, value, badgeColor }) {
  return (
    <div className="card h-100 border shadow-sm">
      <div className="card-body">
        <div className="mb-2" style={{ fontSize: "1.5rem" }}>
          {icon}
        </div>
        <p className="text-muted small mb-1">{label}</p>
        <h4
          className={`fw-bold mb-0 ${badgeColor ? `text-${badgeColor}` : ""}`}
        >
          {(value || 0).toLocaleString()}
        </h4>
      </div>
    </div>
  );
}

function UserAvatar({ name, userId }) {
  const colorIndex = typeof userId === "string" ? userId.length : 0;
  const { bg, color } = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];

  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
      style={{
        width: 38,
        height: 38,
        background: bg,
        color,
        fontSize: "0.8rem",
        border: "2px solid #dee2e6",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

export default function UserManagement() {
  const [students, setStudents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isOpen, setIsOpen] = useState(false);

  const [addLoading, setAddLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      setStudents(
        snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          sourceCollection: "students",
        })),
      );
    });

    const unsubAdmins = onSnapshot(collection(db, "admins"), (snapshot) => {
      setAdmins(
        snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          role: doc.data().role || "Admin",
          sourceCollection: "admins",
        })),
      );
    });

    const unsubDoctors = onSnapshot(collection(db, "doctors"), (snapshot) => {
      setDoctors(
        snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          role: doc.data().role || "Doctor",
          sourceCollection: "doctors",
        })),
      );
    });

    return () => {
      unsubStudents();
      unsubAdmins();
      unsubDoctors();
    };
  }, []);

  const allUsers = useMemo(
    () => [...students, ...admins, ...doctors],
    [students, admins, doctors],
  );

  const stats = useMemo(
    () => ({
      total: allUsers.length,
      students: allUsers.filter((u) => getUserCategory(u) === "Student").length,
      admins: allUsers.filter((u) => getUserCategory(u) === "Admin").length,
      faculty: allUsers.filter((u) => getUserCategory(u) === "Faculty").length,
      suspended: allUsers.filter(
        (u) => (u.status || "Active").toLowerCase() === "suspended",
      ).length,
    }),
    [allUsers],
  );

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const category = getUserCategory(u);

      const tabMatch =
        activeTab === "All" ||
        (activeTab === "Students" && category === "Student") ||
        (activeTab === "Faculty Members" && category === "Faculty") ||
        (activeTab === "Admins" && category === "Admin");

      const q = search.toLowerCase().trim();

      const searchMatch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.dept?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q);

      return tabMatch && searchMatch;
    });
  }, [allUsers, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const visibleUsers = filteredUsers.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  async function handleToggleStatus(user) {
    const currentStatus = user.status || "Active";
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    const collectionName =
      user.sourceCollection || getCollectionName(user.role);

    setActionLoading((p) => ({
      ...p,
      [`toggle_${user.id}`]: true,
    }));

    try {
      await updateDoc(doc(db, collectionName, user.id), {
        status: newStatus,
      });

      toast.success(`${user.name || "User"} is now ${newStatus}`);
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update status");
    } finally {
      setActionLoading((p) => ({
        ...p,
        [`toggle_${user.id}`]: false,
      }));
    }
  }

  async function handleAddUser() {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = true;
    if (!form.email.trim()) newErrors.email = true;
    if (!form.dept) newErrors.dept = true;
    if (!form.role) newErrors.role = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all required fields");
      return;
    }

    const targetCol = getCollectionName(form.role);

    setAddLoading(true);

    try {
      await addDoc(collection(db, targetCol), {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        dept: form.dept,
        role: form.role,
        status: "Active",
        books: 0,
        createdAt: new Date(),
      });

      toast.success("User added successfully");

      Swal.fire({
        title: "Success!",
        text: "New user has been created successfully.",
        icon: "success",
        confirmButtonColor: "#633a19",
        timer: 1800,
        showConfirmButton: false,
      });

      setForm(EMPTY_FORM);
      setErrors({});
      setIsOpen(false);
      setPage(1);
    } catch (err) {
      console.error(err);

      toast.error("Failed to add user");

      Swal.fire({
        title: "Error",
        text: "Failed to create user.",
        icon: "error",
        confirmButtonColor: "#633a19",
      });
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDeleteUser(user) {
    const result = await Swal.fire({
      title: "Delete User?",
      text: `Are you sure you want to permanently delete ${
        user.name || "this user"
      }? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#633a19",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    const targetCol = user.sourceCollection || getCollectionName(user.role);

    setActionLoading((p) => ({
      ...p,
      [`delete_${user.id}`]: true,
    }));

    try {
      await deleteDoc(doc(db, targetCol, user.id));

      toast.success("User deleted successfully");

      Swal.fire({
        title: "Deleted!",
        text: "User has been deleted successfully.",
        icon: "success",
        confirmButtonColor: "#633a19",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);

      toast.error("Failed to delete user");

      Swal.fire({
        title: "Delete Failed",
        text: "Something went wrong while deleting this user.",
        icon: "error",
        confirmButtonColor: "#633a19",
      });
    } finally {
      setActionLoading((p) => ({
        ...p,
        [`delete_${user.id}`]: false,
      }));
    }
  }

  return (
    <div className="bg-light my-5 mb-0 py-5">
      <div className="container-xl px-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
          <div>
            <h1 className="brown fw-bolder">User Management</h1>
            <p className="text-muted mb-0">
              Manage access and monitor system activity
            </p>
          </div>

          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control rounded-4 shadow-sm"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />

            <button
              onClick={() => setIsOpen(true)}
              className="bg-brown text-white px-4 rounded-4 border-0 shadow-sm text-nowrap"
            >
              + Add User
            </button>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <StatCard icon="👥" label="Total" value={stats.total} />
          </div>

          <div className="col-6 col-md-3">
            <StatCard icon="👮" label="Admins" value={stats.admins} />
          </div>

          <div className="col-6 col-md-3">
            <StatCard icon="🎓" label="Students" value={stats.students} />
          </div>

          <div className="col-6 col-md-3">
            <StatCard
              icon="🚫"
              label="Suspended"
              value={stats.suspended}
              badgeColor="danger"
            />
          </div>
        </div>

        <div className="card border shadow-sm">
          <div className="card-header bg-white">
            <ul className="nav nav-tabs card-header-tabs">
              {TABS.map((tab) => (
                <li className="nav-item" key={tab}>
                  <button
                    className={`nav-link ${
                      activeTab === tab
                        ? "active fw-bold text-dark"
                        : "text-muted"
                    }`}
                    onClick={() => {
                      setActiveTab(tab);
                      setPage(1);
                    }}
                  >
                    {tab}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">User</th>
                  <th>Dept / Role</th>
                  <th>Books</th>
                  <th className="text-center">Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleUsers.length > 0 ? (
                  visibleUsers.map((user) => {
                    const status = user.status || "Active";
                    const isActive = status === "Active";

                    return (
                      <tr key={user.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2">
                            <UserAvatar name={user.name} userId={user.id} />
                            <div>
                              <div className="fw-bold">
                                {user.name || "Unnamed User"}
                              </div>
                              <div className="small text-muted">
                                {user.email || "No email"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="small fw-bold">
                            {user.dept || "No department"}
                          </div>
                          <div className="small text-muted">
                            {user.role || "No role"}
                          </div>
                        </td>

                        <td>{user.books || 0}</td>

                        <td className="text-center">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={actionLoading[`toggle_${user.id}`]}
                            className={`btn btn-sm px-4 rounded-pill fw-bold ${
                              isActive ? "btn-success" : "btn-danger"
                            }`}
                            style={{
                              minWidth: "120px",
                              opacity: actionLoading[`toggle_${user.id}`]
                                ? 0.7
                                : 1,
                            }}
                          >
                            {actionLoading[`toggle_${user.id}`] ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderWidth: 2,
                                }}
                              />
                            ) : isActive ? (
                              "✓ Active"
                            ) : (
                              "🛑 Suspended"
                            )}
                          </button>
                        </td>

                        <td>
                          <button
                            className="btn btn-sm text-danger shadow-none"
                            disabled={actionLoading[`delete_${user.id}`]}
                            onClick={() => handleDeleteUser(user)}
                          >
                            {actionLoading[`delete_${user.id}`] ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderWidth: 2,
                                  color: "#dc3545",
                                }}
                              />
                            ) : (
                              "🗑"
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <div style={{ fontSize: "2rem" }}>🔍</div>
                      <div className="fw-bold mt-2">No users found</div>
                      <div className="small">
                        Try changing the search word or selected tab.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
            <span className="text-muted small">
              Showing {visibleUsers.length} of {filteredUsers.length} users
            </span>

            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                </li>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <li
                      key={p}
                      className={`page-item ${p === currentPage ? "active" : ""}`}
                    >
                      <button className="page-link" onClick={() => setPage(p)}>
                        {p}
                      </button>
                    </li>
                  ),
                )}

                <li
                  className={`page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 p-4 border-0 shadow">
              <h3 className="fw-bold brown mb-4">Create Account</h3>

              <div className="row g-3">
                <div className="col-12">
                  <input
                    placeholder="Full Name"
                    className={`form-control ${errors.name ? "is-invalid" : ""}`}
                    value={form.name}
                    disabled={addLoading}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="col-12">
                  <input
                    placeholder="Email"
                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    value={form.email}
                    disabled={addLoading}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                <div className="col-6">
                  <select
                    className={`form-select ${errors.dept ? "is-invalid" : ""}`}
                    value={form.dept}
                    disabled={addLoading}
                    onChange={(e) => setForm({ ...form, dept: e.target.value })}
                  >
                    <option value="">Dept</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-6">
                  <select
                    className={`form-select ${errors.role ? "is-invalid" : ""}`}
                    value={form.role}
                    disabled={addLoading}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="">Role</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 d-flex gap-2 justify-content-end">
                <button
                  disabled={addLoading}
                  className="bg-brown text-white border-0 px-4 py-2 rounded-2"
                  onClick={handleAddUser}
                  style={{
                    opacity: addLoading ? 0.8 : 1,
                    minWidth: 110,
                    cursor: addLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {addLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        style={{ width: 14, height: 14, borderWidth: 2 }}
                      />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>

                <button
                  disabled={addLoading}
                  className="btn btn-light border px-4"
                  onClick={() => {
                    setIsOpen(false);
                    setErrors({});
                    setForm(EMPTY_FORM);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
