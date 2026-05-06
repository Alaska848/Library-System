import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import Swal from "sweetalert2";

function FacultyRequests() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState("");

  const selectedBook = books.find((b) => b.id === selectedBookId) || null;

  useEffect(() => {
    const q = query(
      collection(db, "books"),
      where("source", "==", "doctor_request"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // ✅ استثني الـ deleted من الـ state من الأساس
      setBooks(data.filter((b) => b.requestStatus !== "deleted"));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🔒 Admin only
  if (sessionStorage.getItem("role") !== "admin") {
    return (
      <div className="text-center mt-5">
        <h4 className="text-danger">Access Denied</h4>
        <p>Only admins can view this page.</p>
      </div>
    );
  }

  // ✅ Filter by tab + search — بدون deleted لأنها اتشالت من الـ state
  const filtered = books.filter((b) => {
    const reqStatus = b.requestStatus || "pending";
    const matchTab = reqStatus === activeTab;
    const matchSearch =
      b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.author?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTab && matchSearch;
  });

  const pendingCount = books.filter(
    (b) => (b.requestStatus || "pending") === "pending"
  ).length;

  // ✅ Approve
  const handleApprove = async (book) => {
    if (!deliveryDate) {
      Swal.fire("Missing Date", "Please set an expected delivery date.", "warning");
      return;
    }
    try {
      await updateDoc(doc(db, "books", book.id), {
        requestStatus: "approved",
        deliveryDate,
      });
      Swal.fire({
        title: "Approved!",
        text: `"${book.title}" has been approved.`,
        icon: "success",
        confirmButtonColor: "#633a19",
      });
      setSelectedBookId(null);
      setDeliveryDate("");
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  // ❌ Reject
  const handleReject = async (book) => {
    const result = await Swal.fire({
      title: "Reject Request?",
      text: `Are you sure you want to reject "${book.title}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#633a19",
      confirmButtonText: "Yes, Reject",
    });
    if (!result.isConfirmed) return;
    try {
      await updateDoc(doc(db, "books", book.id), {
        requestStatus: "rejected",
      });
      Swal.fire({ title: "Rejected", icon: "info", confirmButtonColor: "#633a19" });
      setSelectedBookId(null);
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  // 🗑️ Delete — بيتشال من الـ state فورًا عن طريق الـ onSnapshot filter
  const handleDelete = async (book) => {
    const result = await Swal.fire({
      title: "Delete Request?",
      text: "The request will be removed from the list. The book data will remain in the system.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#633a19",
      confirmButtonText: "Yes, Delete Request",
    });
    if (!result.isConfirmed) return;
    try {
      await updateDoc(doc(db, "books", book.id), {
        requestStatus: "deleted",
      });
      // ✅ لو المحذوف هو المحدود حالياً، انهِ الـ selection
      if (selectedBookId === book.id) setSelectedBookId(null);
      Swal.fire({
        title: "Request Removed!",
        text: "The book data is still saved.",
        icon: "success",
        confirmButtonColor: "#633a19",
      });
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  const approvedCount = books.filter((b) => b.requestStatus === "approved").length;
  const totalCount = books.length;
  const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const borrowedCount = approvedCount;

  const statusBadge = (status) => {
    const s = status || "pending";
    if (s === "approved")
      return <span className="badge" style={{ background: "#d4edda", color: "#2e7d32", padding: "5px 12px", borderRadius: "20px", fontSize: "12px" }}>✔ Approved</span>;
    if (s === "rejected")
      return <span className="badge" style={{ background: "#fdecea", color: "#c62828", padding: "5px 12px", borderRadius: "20px", fontSize: "12px" }}>✖ Rejected</span>;
    return <span className="badge" style={{ background: "#fff3e0", color: "#e65100", padding: "5px 12px", borderRadius: "20px", fontSize: "12px" }}>● Pending</span>;
  };

  return (
    <div className="container-fluid py-4 px-4" style={{ background: "#f9f5f0", minHeight: "100vh" }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <h4 className="fw-bold mb-0" style={{ color: "#2d1a0e" }}>
          Faculty Book Requests
        </h4>

        {/* Tabs */}
        <div className="d-flex gap-2">
          {[
            { key: "pending", label: "⏳ Pending Requests", color: "#633a19" },
            { key: "approved", label: "✔ Approved", color: "#2e7d32" },
            { key: "rejected", label: "✖ Rejected", color: "#c62828" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedBookId(null); }}
              className="btn btn-sm fw-semibold"
              style={{
                background: activeTab === tab.key ? tab.color : "white",
                color: activeTab === tab.key ? "white" : "#555",
                border: `1px solid ${activeTab === tab.key ? tab.color : "#ddd"}`,
                borderRadius: "8px",
                padding: "6px 16px",
              }}
            >
              {tab.label}
              {tab.key === "pending" && pendingCount > 0 && (
                <span
                  className="ms-1"
                  style={{
                    background: activeTab === "pending" ? "rgba(255,255,255,0.3)" : "#633a19",
                    color: "white",
                    borderRadius: "10px",
                    padding: "1px 7px",
                    fontSize: "11px",
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="row g-4">
        {/* LEFT: Detail Panel */}
        <div className="col-lg-5">
          <div className="bg-white rounded-3 p-4 shadow-sm" style={{ border: "1px solid #f0e8df" }}>
            {selectedBook ? (
              <>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span style={{ color: "#633a19", fontSize: "18px" }}>ℹ</span>
                  <h6 className="fw-bold mb-0" style={{ color: "#2d1a0e" }}>Request Details</h6>
                </div>

                {/* Cover */}
                <div className="text-center mb-3">
                  {selectedBook.coverUrl && selectedBook.coverUrl !== "" ? (
                    <img
                      src={selectedBook.coverUrl}
                      alt="cover"
                      style={{ height: "180px", borderRadius: "8px", objectFit: "cover" }}
                      onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                    />
                  ) : null}
                  <div
                    style={{
                      height: "180px",
                      background: "linear-gradient(135deg, #633a19, #9c5e30)",
                      borderRadius: "8px",
                      display: selectedBook.coverUrl && selectedBook.coverUrl !== "" ? "none" : "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: "8px",
                      color: "white",
                    }}
                  >
                    <span style={{ fontSize: "40px" }}>📚</span>
                    <span style={{ fontSize: "13px", opacity: 0.8 }}>{selectedBook.title}</span>
                  </div>
                </div>

                {/* Book Info */}
                <p style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", marginBottom: "2px" }}>BOOK TITLE</p>
                <h5 className="fw-bold mb-3" style={{ color: "#1a1a1a" }}>{selectedBook.title}</h5>
                <hr style={{ borderColor: "#f0e8df" }} />

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <p style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", marginBottom: "2px" }}>AUTHOR</p>
                    <p className="fw-semibold mb-0">{selectedBook.author}</p>
                  </div>
                  <div className="text-end">
                    <p style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", marginBottom: "2px" }}>CONDITION</p>
                    <span style={{ background: "#e8f5e9", color: "#2e7d32", padding: "3px 10px", borderRadius: "20px", fontSize: "12px" }}>
                      {selectedBook.status}
                    </span>
                  </div>
                </div>
                <hr style={{ borderColor: "#f0e8df" }} />

                <div className="row mb-2">
                  <div className="col-6">
                    <p style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", marginBottom: "2px" }}>REQUEST DATE</p>
                    <p className="fw-semibold mb-0">
                      {selectedBook.date || (selectedBook.createdAt?.toDate
                        ? selectedBook.createdAt.toDate().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                        : "—")}
                    </p>
                  </div>
                  <div className="col-6">
                    <p style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", marginBottom: "2px" }}>CATEGORY</p>
                    <p className="fw-semibold mb-0">{selectedBook.category}</p>
                  </div>
                </div>
                <div className="row mb-2">
                  <div className="col-6">
                    <p style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", marginBottom: "2px" }}>ISBN</p>
                    <p className="fw-semibold mb-0">{selectedBook.isbn || "—"}</p>
                  </div>
                  <div className="col-6">
                    <p style={{ fontSize: "11px", color: "#999", textTransform: "uppercase", marginBottom: "2px" }}>LENDING TYPE</p>
                    <p className="fw-semibold mb-0">
                      {selectedBook.lendingType === "paid"
                        ? `Paid — ${selectedBook.amount} EGP`
                        : "Free"}
                    </p>
                  </div>
                </div>
                <hr style={{ borderColor: "#f0e8df" }} />

                {/* Delivery Date - only for pending */}
                {(selectedBook.requestStatus || "pending") === "pending" && (
                  <>
                    <label className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#555" }}>
                      Set Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      className="form-control mb-3"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      style={{ borderColor: "#f0c090", borderRadius: "8px" }}
                    />

                    <button
                      className="btn w-100 fw-semibold mb-2"
                      style={{ background: "#633a19", color: "white", borderRadius: "8px" }}
                      onClick={() => handleApprove(selectedBook)}
                    >
                      ✔ Approve Request
                    </button>
                    <div className="d-flex gap-2">
                      <button
                        className="btn flex-fill fw-semibold"
                        style={{ border: "1px solid #d33", color: "#d33", borderRadius: "8px" }}
                        onClick={() => handleReject(selectedBook)}
                      >
                        ✖ Reject
                      </button>
                      <button
                        className="btn flex-fill fw-semibold"
                        style={{ border: "1px solid #633a19", color: "#633a19", borderRadius: "8px" }}
                        onClick={() => handleDelete(selectedBook)}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </>
                )}

                {/* Already processed */}
                {(selectedBook.requestStatus === "approved" || selectedBook.requestStatus === "rejected") && (
                  <div className="d-flex gap-2 mt-2">
                    <div className="flex-fill text-center py-2 rounded-3" style={{
                      background: selectedBook.requestStatus === "approved" ? "#e8f5e9" : "#fdecea",
                      color: selectedBook.requestStatus === "approved" ? "#2e7d32" : "#c62828",
                      fontWeight: "600",
                    }}>
                      {selectedBook.requestStatus === "approved" ? "✔ Already Approved" : "✖ Already Rejected"}
                    </div>
                    <button
                      className="btn"
                      style={{ border: "1px solid #d33", color: "#d33", borderRadius: "8px" }}
                      onClick={() => handleDelete(selectedBook)}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* General Overview when nothing selected */
              <>
                <h6 className="fw-bold mb-3" style={{ color: "#2d1a0e" }}>General Overview</h6>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small style={{ color: "#888" }}>Faculty Approval Rate</small>
                    <small className="fw-bold" style={{ color: "#2e7d32" }}>{approvalRate}%</small>
                  </div>
                  <div style={{ height: "10px", background: "#eee", borderRadius: "10px" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${approvalRate}%`,
                        background: "linear-gradient(90deg, #4caf50, #2e7d32)",
                        borderRadius: "10px",
                        transition: "width 0.5s",
                      }}
                    />
                  </div>
                </div>
                <div className="d-flex justify-content-between p-3 rounded-3" style={{ background: "#f9f5f0" }}>
                  <small style={{ color: "#888" }}>Currently Approved Books</small>
                  <small className="fw-bold">{borrowedCount} books</small>
                </div>
                <div className="d-flex justify-content-between p-3 rounded-3 mt-2" style={{ background: "#f9f5f0" }}>
                  <small style={{ color: "#888" }}>Pending Requests</small>
                  <small className="fw-bold" style={{ color: "#e65100" }}>{pendingCount} requests</small>
                </div>
                <p className="text-center mt-4" style={{ color: "#bbb", fontSize: "13px" }}>
                  👆 Select a request to view details
                </p>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Requests Table */}
        <div className="col-lg-7">
          <div className="bg-white rounded-3 shadow-sm" style={{ border: "1px solid #f0e8df" }}>
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2"
              style={{ borderColor: "#f0e8df !important" }}>
              <h6 className="fw-bold mb-0" style={{ color: "#2d1a0e" }}>
                {activeTab === "pending" ? "New" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Requests
                {filtered.length > 0 && (
                  <span className="ms-2 badge rounded-pill" style={{ background: "#fff3e0", color: "#e65100", fontSize: "12px" }}>
                    {filtered.length} Active
                  </span>
                )}
              </h6>

              {/* Search */}
              <div className="position-relative">
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }}>🔍</span>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: "32px", borderRadius: "20px", border: "1px solid #eee", width: "200px" }}
                />
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border" style={{ color: "#633a19" }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5" style={{ color: "#bbb" }}>
                <p style={{ fontSize: "40px" }}>📭</p>
                <p>No {activeTab} requests found.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead style={{ background: "#faf7f4" }}>
                    <tr>
                      <th style={{ color: "#888", fontWeight: "600", fontSize: "13px", border: "none", padding: "12px 16px" }}>Faculty Name</th>
                      <th style={{ color: "#888", fontWeight: "600", fontSize: "13px", border: "none" }}>Book Title</th>
                      <th style={{ color: "#888", fontWeight: "600", fontSize: "13px", border: "none" }}>Status</th>
                      <th style={{ color: "#888", fontWeight: "600", fontSize: "13px", border: "none" }}>Fee</th>
                      <th style={{ color: "#888", fontWeight: "600", fontSize: "13px", border: "none" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((book) => (
                      <tr
                        key={book.id}
                        style={{
                          background: selectedBook?.id === book.id ? "#fff8f3" : "white",
                          cursor: "pointer",
                        }}
                      >
                        {/* Doctor avatar + name */}
                        <td style={{ padding: "12px 16px" }}>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #633a19, #9c5e30)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "13px",
                                fontWeight: "bold",
                                flexShrink: 0,
                              }}
                            >
                              {book.author?.charAt(0)?.toUpperCase() || "D"}
                            </div>
                            <span style={{ fontSize: "13px", color: "#333" }}>
                              {book.author || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Title */}
                        <td style={{ fontSize: "13px", color: "#333", maxWidth: "160px" }}>
                          <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                            {book.title}
                          </span>
                        </td>

                        {/* Status */}
                        <td>{statusBadge(book.requestStatus)}</td>

                        {/* Fee */}
                        <td style={{ fontSize: "13px" }}>
                          {book.lendingType === "paid" ? (
                            <span style={{ color: "#2e7d32", fontWeight: "600" }}>
                              {book.amount} EGP
                            </span>
                          ) : (
                            <span style={{ color: "#999" }}>Free</span>
                          )}
                        </td>

                        {/* Action */}
                        <td>
                          <button
                            className="btn btn-sm fw-semibold"
                            style={{ color: "#633a19", fontSize: "13px", padding: "3px 10px" }}
                            onClick={() => {
                              setSelectedBookId(book.id);
                              setDeliveryDate(book.deliveryDate || "");
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacultyRequests;