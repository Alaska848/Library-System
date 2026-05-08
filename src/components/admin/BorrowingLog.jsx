import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  where,
} from "firebase/firestore";

function dueDateFromLoanStart(loanDateStr) {
  if (!loanDateStr || loanDateStr === "—") {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  }

  const d = new Date(loanDateStr + "T12:00:00");

  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 14);
    return fallback.toISOString().split("T")[0];
  }

  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

function addDaysToDate(dateValue, days) {
  const base = parseDateOnly(dateValue) || new Date();
  const today = new Date();

  base.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const start = base < today ? today : base;
  start.setDate(start.getDate() + days);

  return start.toISOString().split("T")[0];
}

function parseDateOnly(value) {
  if (!value || value === "—") return null;

  if (typeof value === "string") {
    const d = new Date(value + "T12:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (value?.toDate) {
    return value.toDate();
  }

  if (value?.seconds) {
    return new Date(value.seconds * 1000);
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function BorrowingLog() {
  const [activeTab, setActiveTab] = useState("All");
  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const showToast = (msg, color) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const getLoanStatus = (loan) => {
    if (loan.status === "Returned") return "Returned";
    if (loan.status === "Rejected") return "Rejected";
    if (loan.status === "Pending") return "Pending";
    if (loan.status === "Suspended") return "Suspended";

    const dueDate = parseDateOnly(loan.dueDate || loan.returnDate);

    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        return "Overdue";
      }
    }

    return "Active";
  };

  const getStatusBadgeStyle = (status) => {
    if (status === "Active") return { background: "#16A34A" };
    if (status === "Overdue") return { background: "#DC2626" };
    if (status === "Pending") return { background: "#F59E0B" };
    if (status === "Rejected") return { background: "#6B7280" };
    if (status === "Returned") return { background: "#059669" };
    if (status === "Suspended") return { background: "#92400E" };
    return { background: "#6B7280" };
  };

  const findStudentDocRef = async (loan) => {
    const studentEmail =
      loan.email || loan.borrowerEmail || loan.userEmail || loan.borrower;

    if (loan.userId) {
      const directRef = doc(db, "students", loan.userId);
      const directSnap = await getDoc(directRef);

      if (directSnap.exists()) {
        return directRef;
      }
    }

    if (!studentEmail) {
      return null;
    }

    const q = query(
      collection(db, "students"),
      where("email", "==", studentEmail),
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    return doc(db, "students", snap.docs[0].id);
  };

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "loans"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });

        setLoans(list);
      },
      (err) => console.error("BorrowingLog:", err),
    );

    return () => unsub();
  }, []);

  const filtered = loans.filter((loan) => {
    const realStatus = getLoanStatus(loan);

    const matchTab =
      activeTab === "All" ||
      realStatus === activeTab ||
      (activeTab === "Renew Requests" && loan.renewalStatus === "Pending");

    const q = search.toLowerCase();

    const matchSearch =
      (loan.borrower || "").toLowerCase().includes(q) ||
      (loan.book || "").toLowerCase().includes(q) ||
      (loan.email || "").toLowerCase().includes(q) ||
      (loan.borrowerEmail || "").toLowerCase().includes(q);

    return matchTab && matchSearch;
  });

  const handleReceive = async (id) => {
    const loan = loans.find((x) => x.id === id);

    setActionLoading((p) => ({ ...p, [`receive_${id}`]: true }));

    try {
      await updateDoc(doc(db, "loans", id), {
        status: "Returned",
        returnedAt: serverTimestamp(),
      });

      if (loan?.bookId) {
        await updateDoc(doc(db, "books", loan.bookId), {
          status: "available",
        });
      }

      showToast("✅ Book marked as Returned", "#059669");
    } catch (e) {
      console.error(e);
      showToast("Failed to update", "#DC2626");
    } finally {
      setActionLoading((p) => ({ ...p, [`receive_${id}`]: false }));
    }
  };

  const handleAccept = async (id) => {
    const loan = loans.find((x) => x.id === id);
    const due = dueDateFromLoanStart(loan?.loanDate);

    setActionLoading((p) => ({ ...p, [`accept_${id}`]: true }));

    try {
      await updateDoc(doc(db, "loans", id), {
        status: "Active",
        dueDate: due,
        warnings: 0,
        suspendedAfterWarnings: false,
      });

      if (loan?.bookId) {
        await updateDoc(doc(db, "books", loan.bookId), {
          status: "Borrowed",
        });
      }

      showToast("✅ Request Accepted — Loan is now Active", "#2563EB");
    } catch (e) {
      console.error(e);
      showToast("Failed to accept", "#DC2626");
    } finally {
      setActionLoading((p) => ({ ...p, [`accept_${id}`]: false }));
    }
  };

  const handleReject = async (id) => {
    setActionLoading((p) => ({ ...p, [`reject_${id}`]: true }));

    try {
      await updateDoc(doc(db, "loans", id), {
        status: "Rejected",
        rejectedAt: serverTimestamp(),
      });

      showToast("❌ Request Rejected", "#DC2626");
    } catch (e) {
      console.error(e);
      showToast("Failed to reject", "#DC2626");
    } finally {
      setActionLoading((p) => ({ ...p, [`reject_${id}`]: false }));
    }
  };

  const handleRemoveLoan = async (id) => {
    setActionLoading((p) => ({ ...p, [`remove_${id}`]: true }));

    try {
      await deleteDoc(doc(db, "loans", id));
      showToast("Removed from log", "#6B7280");
    } catch (e) {
      console.error(e);
      showToast("Failed to remove", "#DC2626");
    } finally {
      setActionLoading((p) => ({ ...p, [`remove_${id}`]: false }));
    }
  };
  const handleSendWarning = async (loan) => {
    const loanId = loan.id;
    const currentWarnings = Number(loan.warnings || 0);

    if (currentWarnings >= 2) {
      showToast("Second warning already sent. Press Suspend.", "#92400E");
      return;
    }

    const newWarnings = currentWarnings + 1;

    setActionLoading((p) => ({ ...p, [`warn_${loanId}`]: true }));

    try {
      await updateDoc(doc(db, "loans", loanId), {
        warnings: newWarnings,
        lastWarningAt: serverTimestamp(),
        status: "Overdue",
      });

      showToast(
        newWarnings >= 2
          ? "⚠️ Second warning sent. Suspend button is now available."
          : "⚠️ First warning sent to student.",
        newWarnings >= 2 ? "#92400E" : "#B45309",
      );
    } catch (e) {
      console.error("Warning error:", e);
      showToast(e.message || "Failed to send warning", "#DC2626");
    } finally {
      setActionLoading((p) => ({ ...p, [`warn_${loanId}`]: false }));
    }
  };

  const handleSuspendStudent = async (loan) => {
    console.log("FUNCTION STARTED", loan);

    setActionLoading((p) => ({ ...p, [`suspend_${loan.id}`]: true }));

    try {
      await updateDoc(doc(db, "loans", loan.id), {
        status: "Suspended",
        suspendedAfterWarnings: true,
        suspendedAt: serverTimestamp(),
      });

      if (loan.userId) {
        await setDoc(
          doc(db, "students", loan.userId),
          {
            suspended: true,
            status: "suspended",
            suspendedReason:
              "Your account has been suspended please contact the admin",
            suspendedAt: serverTimestamp(),
            overdueWarnings: Number(loan.warnings || 0),
            email:
              loan.email ||
              loan.borrowerEmail ||
              loan.userEmail ||
              loan.borrower ||
              "",
          },
          { merge: true },
        );
      }

      showToast("🚫 Student suspended successfully.", "#92400E");
    } catch (e) {
      console.error("Suspend error:", e);
      showToast(e.message || "Failed to suspend student", "#DC2626");
    } finally {
      setActionLoading((p) => ({ ...p, [`suspend_${loan.id}`]: false }));
    }
  };
  const handleRestoreActive = async (loan) => {
    setActionLoading((p) => ({ ...p, [`restore_${loan.id}`]: true }));

    try {
      const studentRef = await findStudentDocRef(loan);

      if (!studentRef) {
        showToast("Student account not found.", "#DC2626");
        return;
      }

      await updateDoc(studentRef, {
        suspended: false,
        status: "Active",
        suspendedReason: "",
        restoredAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "loans", loan.id), {
        status: "Active",
        warnings: 0,
        suspendedAfterWarnings: false,
        restoredAt: serverTimestamp(),
      });

      showToast("✅ Account restored to Active.", "#059669");
    } catch (e) {
      console.error(e);
      showToast("Failed to restore account.", "#DC2626");
    } finally {
      setActionLoading((p) => ({ ...p, [`restore_${loan.id}`]: false }));
    }
  };

  const handleAcceptRenew = async (loan) => {
    const newDueDate = addDaysToDate(loan.dueDate || loan.returnDate, 7);

    setActionLoading((p) => ({ ...p, [`renew_accept_${loan.id}`]: true }));

    try {
      await updateDoc(doc(db, "loans", loan.id), {
        dueDate: newDueDate,
        status: "Active",
        renewalStatus: "Accepted",
        renewed: true,
        warnings: 0,
        suspendedAfterWarnings: false,
        renewalRespondedAt: serverTimestamp(),
      });

      showToast(
        "✅ Renewal request accepted. Due date extended 7 days.",
        "#059669",
      );
    } catch (e) {
      console.error(e);
      showToast("Failed to accept renewal request", "#DC2626");
    } finally {
      setActionLoading((p) => ({
        ...p,
        [`renew_accept_${loan.id}`]: false,
      }));
    }
  };

  const handleRejectRenew = async (loan) => {
    setActionLoading((p) => ({ ...p, [`renew_reject_${loan.id}`]: true }));

    try {
      await updateDoc(doc(db, "loans", loan.id), {
        renewalStatus: "Rejected",
        renewalRespondedAt: serverTimestamp(),
      });

      showToast("❌ Renewal request rejected.", "#DC2626");
    } catch (e) {
      console.error(e);
      showToast("Failed to reject renewal request", "#DC2626");
    } finally {
      setActionLoading((p) => ({
        ...p,
        [`renew_reject_${loan.id}`]: false,
      }));
    }
  };

  const stats = {
    active: loans.filter((l) => getLoanStatus(l) === "Active").length,
    overdue: loans.filter((l) => getLoanStatus(l) === "Overdue").length,
    returned: loans.filter((l) => getLoanStatus(l) === "Returned").length,
    pending: loans.filter((l) => getLoanStatus(l) === "Pending").length,
    rejected: loans.filter((l) => getLoanStatus(l) === "Rejected").length,
    suspended: loans.filter((l) => getLoanStatus(l) === "Suspended").length,
    renewPending: loans.filter((l) => l.renewalStatus === "Pending").length,
  };

  const tabs = [
    "All",
    "Active",
    "Overdue",
    "Renew Requests",
    "Suspended",
    "Returned",
    "Pending",
    "Rejected",
  ];

  return (
    <div style={s.page}>
      {toast && (
        <div style={{ ...s.toast, background: toast.color }}>{toast.msg}</div>
      )}

      <div style={s.topBar}>
        <input
          style={s.search}
          placeholder="🔍  Search for borrower, email or book..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button type="button" style={s.registerBtn}>
          + Register New Loan
        </button>
      </div>

      <h1 style={s.pageTitle}>Lending Operations Log</h1>

      <p style={s.pageSubtitle}>
        Track and manage all current and archived book loans.
      </p>

      <div style={s.statsRow}>
        <div style={s.statCard}>
          <div>
            <div style={s.statLabel}>Currently Active</div>
            <div style={s.statNumber}>{stats.active}</div>
          </div>
          <span style={{ fontSize: 28 }}>🔄</span>
        </div>

        <div style={s.statCard}>
          <div>
            <div style={s.statLabel}>Overdue</div>
            <div style={{ ...s.statNumber, color: "#DC2626" }}>
              {stats.overdue}
            </div>
          </div>
          <span style={{ fontSize: 28 }}>⚠️</span>
        </div>

        <div style={s.statCard}>
          <div>
            <div style={s.statLabel}>Suspended</div>
            <div style={{ ...s.statNumber, color: "#92400E" }}>
              {stats.suspended}
            </div>
          </div>
          <span style={{ fontSize: 28 }}>🚫</span>
        </div>

        <div style={s.statCard}>
          <div>
            <div style={s.statLabel}>Renew Requests</div>
            <div style={{ ...s.statNumber, color: "#B45309" }}>
              {stats.renewPending}
            </div>
          </div>
          <span style={{ fontSize: 28 }}>🔁</span>
        </div>

        <div style={s.statCard}>
          <div>
            <div style={s.statLabel}>Returned</div>
            <div style={{ ...s.statNumber, color: "#059669" }}>
              {stats.returned}
            </div>
          </div>
          <span style={{ fontSize: 28 }}>✅</span>
        </div>
      </div>

      <div style={s.tableCard}>
        <div style={s.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              style={activeTab === tab ? s.tabActive : s.tab}
              onClick={(e) => {
                setActiveTab(tab);
                e.currentTarget.blur();
              }}
            >
              {tab}

              {tab === "Overdue" && stats.overdue > 0 && (
                <span style={{ ...s.tabBadge, background: "#DC2626" }}>
                  {stats.overdue}
                </span>
              )}

              {tab === "Suspended" && stats.suspended > 0 && (
                <span style={{ ...s.tabBadge, background: "#92400E" }}>
                  {stats.suspended}
                </span>
              )}

              {tab === "Renew Requests" && stats.renewPending > 0 && (
                <span style={{ ...s.tabBadge, background: "#B45309" }}>
                  {stats.renewPending}
                </span>
              )}

              {tab === "Pending" && stats.pending > 0 && (
                <span style={s.tabBadge}>{stats.pending}</span>
              )}

              {tab === "Rejected" && stats.rejected > 0 && (
                <span style={{ ...s.tabBadge, background: "#6B7280" }}>
                  {stats.rejected}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "Pending" && (
          <div style={s.pendingBanner}>
            ⏳ These requests are awaiting your approval — press{" "}
            <strong>Accept</strong> to approve or <strong>Reject</strong> to
            decline.
          </div>
        )}

        {activeTab === "Renew Requests" && (
          <div style={s.renewBanner}>
            🔁 These students requested renewal. Accepting will extend the due
            date by 7 days.
          </div>
        )}

        {activeTab === "Overdue" && (
          <div style={s.overdueBanner}>
            ⚠️ Send the first warning, then the second warning. After the second
            warning, a brown Suspend button will appear.
          </div>
        )}

        {activeTab === "Suspended" && (
          <div style={s.restoreBanner}>
            🔄 Suspended accounts can be restored. Press{" "}
            <strong>Restore Active</strong> to allow the borrower to login
            again.
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  "Borrower Name",
                  "Book Title",
                  "Request Date",
                  "Due Date",
                  "Status",
                  "Renewal",
                  "Warnings",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={s.emptyCell}>
                    No records found
                  </td>
                </tr>
              )}

              {filtered.map((loan) => {
                const realStatus = getLoanStatus(loan);
                const warnings = Number(loan.warnings || 0);

                return (
                  <tr key={loan.id} style={s.tr}>
                    <td style={s.td}>
                      <div style={s.borrowerCell}>
                        <div
                          style={{
                            ...s.avatar,
                            background: loan.color || "#6B7280",
                          }}
                        >
                          {loan.initials || "?"}
                        </div>

                        <span
                          style={
                            realStatus === "Returned" ||
                            realStatus === "Suspended"
                              ? s.strike
                              : {}
                          }
                        >
                          {loan.borrower}
                        </span>
                      </div>
                    </td>

                    <td
                      style={{
                        ...s.td,
                        ...(realStatus === "Returned" ||
                        realStatus === "Suspended"
                          ? s.strike
                          : {}),
                      }}
                    >
                      {loan.book}
                    </td>

                    <td style={s.td}>{loan.loanDate}</td>

                    <td
                      style={{
                        ...s.td,
                        color: realStatus === "Overdue" ? "#DC2626" : "inherit",
                        fontWeight: realStatus === "Overdue" ? 700 : 400,
                      }}
                    >
                      {loan.dueDate || loan.returnDate || "—"}
                    </td>

                    <td style={s.td}>
                      <span
                        style={{
                          ...s.statusBadge,
                          ...getStatusBadgeStyle(realStatus),
                        }}
                      >
                        {realStatus}
                      </span>
                    </td>

                    <td style={s.td}>
                      {loan.renewalStatus === "Pending" ? (
                        <span
                          style={{
                            ...s.renewalPill,
                            background: "#FEF3C7",
                            color: "#B45309",
                          }}
                        >
                          Pending
                        </span>
                      ) : loan.renewalStatus === "Accepted" ? (
                        <span
                          style={{
                            ...s.renewalPill,
                            background: "#D1FAE5",
                            color: "#059669",
                          }}
                        >
                          Accepted
                        </span>
                      ) : loan.renewalStatus === "Rejected" ? (
                        <span
                          style={{
                            ...s.renewalPill,
                            background: "#FEE2E2",
                            color: "#DC2626",
                          }}
                        >
                          Rejected
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td style={s.td}>
                      {realStatus === "Overdue" ||
                      realStatus === "Suspended" ? (
                        <span
                          style={{
                            fontWeight: 700,
                            color: warnings >= 2 ? "#92400E" : "#B45309",
                          }}
                        >
                          {warnings}/2
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td style={s.td}>
                      {loan.renewalStatus === "Pending" && (
                        <div style={s.actionBtns}>
                          <button
                            type="button"
                            style={{
                              ...s.acceptBtn,
                              opacity: actionLoading[`renew_accept_${loan.id}`]
                                ? 0.7
                                : 1,
                            }}
                            disabled={
                              actionLoading[`renew_accept_${loan.id}`] ||
                              actionLoading[`renew_reject_${loan.id}`]
                            }
                            onClick={() => handleAcceptRenew(loan)}
                          >
                            {actionLoading[`renew_accept_${loan.id}`]
                              ? "..."
                              : "Accept Renew"}
                          </button>

                          <button
                            type="button"
                            style={{
                              ...s.rejectBtn,
                              opacity: actionLoading[`renew_reject_${loan.id}`]
                                ? 0.7
                                : 1,
                            }}
                            disabled={
                              actionLoading[`renew_accept_${loan.id}`] ||
                              actionLoading[`renew_reject_${loan.id}`]
                            }
                            onClick={() => handleRejectRenew(loan)}
                          >
                            {actionLoading[`renew_reject_${loan.id}`]
                              ? "..."
                              : "Reject Renew"}
                          </button>
                        </div>
                      )}

                      {realStatus === "Pending" && (
                        <div style={s.actionBtns}>
                          <button
                            type="button"
                            style={{
                              ...s.acceptBtn,
                              opacity: actionLoading[`accept_${loan.id}`]
                                ? 0.7
                                : 1,
                              minWidth: 72,
                            }}
                            disabled={
                              actionLoading[`accept_${loan.id}`] ||
                              actionLoading[`reject_${loan.id}`]
                            }
                            onClick={() => handleAccept(loan.id)}
                          >
                            {actionLoading[`accept_${loan.id}`] ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderWidth: 2,
                                }}
                              />
                            ) : (
                              "✓ Accept"
                            )}
                          </button>

                          <button
                            type="button"
                            style={{
                              ...s.rejectBtn,
                              opacity: actionLoading[`reject_${loan.id}`]
                                ? 0.7
                                : 1,
                              minWidth: 72,
                            }}
                            disabled={
                              actionLoading[`accept_${loan.id}`] ||
                              actionLoading[`reject_${loan.id}`]
                            }
                            onClick={() => handleReject(loan.id)}
                          >
                            {actionLoading[`reject_${loan.id}`] ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderWidth: 2,
                                }}
                              />
                            ) : (
                              "✕ Reject"
                            )}
                          </button>
                        </div>
                      )}

                      {loan.renewalStatus !== "Pending" &&
                        (realStatus === "Active" ||
                          realStatus === "Overdue") && (
                          <div style={s.actionBtns}>
                            {realStatus === "Overdue" && warnings < 2 && (
                              <button
                                type="button"
                                style={{
                                  ...s.warningBtn,
                                  opacity: actionLoading[`warn_${loan.id}`]
                                    ? 0.7
                                    : 1,
                                }}
                                disabled={actionLoading[`warn_${loan.id}`]}
                                onClick={() => handleSendWarning(loan)}
                              >
                                {actionLoading[`warn_${loan.id}`] ? (
                                  <span
                                    className="spinner-border spinner-border-sm"
                                    style={{
                                      width: 12,
                                      height: 12,
                                      borderWidth: 2,
                                    }}
                                  />
                                ) : warnings === 1 ? (
                                  "2nd Warning"
                                ) : (
                                  "Send Warning"
                                )}
                              </button>
                            )}

                            {realStatus === "Overdue" && warnings >= 2 && (
                              <button
                                type="button"
                                style={{
                                  ...s.suspendBtn,
                                  opacity: actionLoading[`suspend_${loan.id}`]
                                    ? 0.7
                                    : 1,
                                  pointerEvents: "auto",
                                  position: "relative",
                                  zIndex: 9999,
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log("SUSPEND BUTTON PRESSED", loan);
                                  handleSuspendStudent(loan);
                                }}
                              >
                                {actionLoading[`suspend_${loan.id}`]
                                  ? "Suspending..."
                                  : "Suspend"}
                              </button>
                            )}

                            <button
                              type="button"
                              style={{
                                ...s.receiveBtn,
                                opacity: actionLoading[`receive_${loan.id}`]
                                  ? 0.7
                                  : 1,
                                minWidth: 68,
                              }}
                              disabled={actionLoading[`receive_${loan.id}`]}
                              onClick={() => handleReceive(loan.id)}
                            >
                              {actionLoading[`receive_${loan.id}`] ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  style={{
                                    width: 12,
                                    height: 12,
                                    borderWidth: 2,
                                  }}
                                />
                              ) : (
                                "Receive"
                              )}
                            </button>
                          </div>
                        )}

                      {realStatus === "Suspended" && (
                        <button
                          type="button"
                          style={{
                            ...s.restoreBtn,
                            opacity: actionLoading[`restore_${loan.id}`]
                              ? 0.7
                              : 1,
                          }}
                          disabled={actionLoading[`restore_${loan.id}`]}
                          onClick={() => handleRestoreActive(loan)}
                        >
                          {actionLoading[`restore_${loan.id}`]
                            ? "Restoring..."
                            : "Restore Active"}
                        </button>
                      )}

                      {realStatus === "Returned" && (
                        <span style={{ color: "#059669", fontSize: 20 }}>
                          ✓
                        </span>
                      )}

                      {realStatus === "Rejected" && (
                        <button
                          type="button"
                          style={{
                            ...s.extendBtn,
                            opacity: actionLoading[`remove_${loan.id}`]
                              ? 0.7
                              : 1,
                          }}
                          disabled={actionLoading[`remove_${loan.id}`]}
                          onClick={() => handleRemoveLoan(loan.id)}
                        >
                          {actionLoading[`remove_${loan.id}`] ? (
                            <span
                              className="spinner-border spinner-border-sm"
                              style={{
                                width: 12,
                                height: 12,
                                borderWidth: 2,
                              }}
                            />
                          ) : (
                            "Remove"
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={s.pagination}>
          <span>
            Showing {filtered.length} of {loans.length} loans
          </span>

          <div style={s.pages}>
            {["‹", 1, 2, 3, "›"].map((p, i) => (
              <button
                key={i}
                type="button"
                style={
                  p === 1 ? { ...s.pageBtn, ...s.pageBtnActive } : s.pageBtn
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={s.infoRow}>
        <div style={s.infoCard}>
          <span style={s.infoIcon}>⚠️</span>
          <div>
            <div style={{ ...s.infoTitle, color: "#B45309" }}>
              Overdue Policy
            </div>
            <div style={s.infoText}>
              When a loan passes its due date, it appears as overdue
              automatically. Admin sends the first warning, then the second
              warning. After the second warning, the admin can suspend the
              student account.
            </div>
          </div>
        </div>

        <div style={s.infoCard}>
          <span style={s.infoIcon}>🔁</span>
          <div>
            <div style={s.infoTitle}>Renewal Rule</div>
            <div style={s.infoText}>
              Students can request renewal. Admin approval extends the due date
              by 7 days.
            </div>
          </div>
        </div>
      </div>

      <footer style={s.footer}>
        © 2023 University Library Management System. All Rights Reserved.
      </footer>
    </div>
  );
}

const s = {
  page: {
    padding: "32px 40px",
    fontFamily: "Segoe UI, sans-serif",
    background: "#F9FAFB",
    color: "#111827",
    minHeight: "100vh",
  },

  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 999,
    color: "#fff",
    padding: "12px 22px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
  },

  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  search: {
    width: 340,
    padding: "8px 16px",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    textAlign: "center",
  },

  pageSubtitle: {
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 6,
  },

  registerBtn: {
    background: "#92400E",
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },

  statsRow: {
    display: "flex",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },

  statCard: {
    flex: "1 1 180px",
    background: "#fff",
    borderRadius: 12,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },

  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },

  statNumber: {
    fontSize: 28,
    fontWeight: 700,
  },

  tableCard: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    marginBottom: 20,
  },

  tabs: {
    display: "flex",
    gap: 4,
    marginBottom: 20,
    borderBottom: "1px solid #E5E7EB",
    flexWrap: "wrap",
  },

  tab: {
    background: "none",
    border: "none",
    outline: "none",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 14,
    color: "#6B7280",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  tabActive: {
    background: "none",
    border: "none",
    outline: "none",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 14,
    color: "#B45309",
    fontWeight: 600,
    borderBottom: "2px solid #B45309",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  tabBadge: {
    background: "#B45309",
    color: "#fff",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 6px",
  },

  pendingBanner: {
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    borderRadius: 8,
    padding: "10px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: "#92400E",
  },

  renewBanner: {
    background: "#FDF7ED",
    border: "1px solid #FCD34D",
    borderRadius: 8,
    padding: "10px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: "#92400E",
  },

  overdueBanner: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    padding: "10px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: "#B91C1C",
  },

  restoreBanner: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: 8,
    padding: "10px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: "#166534",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: "#9CA3AF",
    textTransform: "uppercase",
    padding: "8px 12px",
    letterSpacing: "0.05em",
  },

  tr: {
    borderTop: "1px solid #F3F4F6",
  },

  td: {
    padding: "14px 12px",
    fontSize: 14,
    verticalAlign: "middle",
  },

  emptyCell: {
    textAlign: "center",
    padding: 32,
    color: "#9CA3AF",
  },

  borrowerCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },

  strike: {
    textDecoration: "line-through",
    color: "#9CA3AF",
  },

  statusBadge: {
    color: "#fff",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 12px",
    display: "inline-block",
  },

  renewalPill: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    display: "inline-block",
  },

  actionBtns: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  extendBtn: {
    background: "#fff",
    border: "1px solid #D1D5DB",
    outline: "none",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
  },

  receiveBtn: {
    background: "#92400E",
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
  },

  suspendBtn: {
    background: "#92400E",
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 6,
    padding: "5px 14px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 800,
  },

  restoreBtn: {
    background: "#059669",
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 800,
  },

  warningBtn: {
    background: "#DC2626",
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 700,
  },

  acceptBtn: {
    background: "#059669",
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
  },

  rejectBtn: {
    background: "#DC2626",
    color: "#fff",
    border: "none",
    outline: "none",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
  },

  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    fontSize: 13,
    color: "#6B7280",
  },

  pages: {
    display: "flex",
    gap: 6,
  },

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

  pageBtnActive: {
    background: "#92400E",
    color: "#fff",
    border: "none",
  },

  infoRow: {
    display: "flex",
    gap: 16,
    marginBottom: 24,
  },

  infoCard: {
    flex: 1,
    background: "#FFFBEB",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
  },

  infoIcon: {
    fontSize: 22,
    flexShrink: 0,
  },

  infoTitle: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 6,
  },

  infoText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 1.5,
  },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    paddingTop: 8,
  },
};
