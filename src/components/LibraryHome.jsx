import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "./firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Swal from "sweetalert2";

function loanInitials(name) {
  if (!name || !String(name).trim()) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function avatarColor(userId) {
  const colors = [
    "#6B7FD7",
    "#5BA4CF",
    "#9CA3AF",
    "#A78BFA",
    "#F59E0B",
    "#34D399",
    "#F87171",
  ];
  let h = 0;
  for (let i = 0; i < userId.length; i++)
    h = userId.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function LibraryHome() {
  const [query, setQuery] = useState("");
  const [allBooks, setAllBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowDate, setBorrowDate] = useState("");
  const [uid, setUid] = useState(null);
  const [unavailableBookIds, setUnavailableBookIds] = useState(() => new Set());
  const [myPendingBookIds, setMyPendingBookIds] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    getDocs(collection(db, "books"))
      .then((snap) =>
        setAllBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "loans"),
      (snap) => {
        const unavailable = new Set();
        const myPending = new Set();
        snap.forEach((d) => {
          const data = d.data();
          if (
            (data.status === "Active" || data.status === "Overdue") &&
            data.bookId
          )
            unavailable.add(data.bookId);
          if (
            data.status === "Pending" &&
            uid &&
            data.userId === uid &&
            data.bookId
          )
            myPending.add(data.bookId);
        });
        setUnavailableBookIds(unavailable);
        setMyPendingBookIds(myPending);
      },
      console.error,
    );
    return () => unsub();
  }, [uid]);

  // ✅ Search filter — works on title, author, ISBN
  const featuredBooks = query.trim()
    ? allBooks.filter(
        (b) =>
          b.title?.toLowerCase().includes(query.toLowerCase()) ||
          b.author?.toLowerCase().includes(query.toLowerCase()) ||
          b.isbn?.toLowerCase().includes(query.toLowerCase()),
      )
    : allBooks;

  const handleSearch = (e) => e.preventDefault();

  const openBorrowModal = (book) => {
    if (!auth.currentUser) {
      Swal.fire({
        title: "Login Required",
        text: "Please sign in as a student to send a borrowing request.",
        icon: "info",
        confirmButtonColor: "#633a19",
      });
      return;
    }
    if (localStorage.getItem("role") === "admin") {
      Swal.fire({
        title: "Admin Account",
        text: "Borrowing requests are for students only. Use Borrowing Log instead.",
        icon: "info",
        confirmButtonColor: "#633a19",
      });
      return;
    }
    if (unavailableBookIds.has(book.id)) return;
    if (myPendingBookIds.has(book.id)) {
      Swal.fire({
        title: "Request Pending",
        text: "Your request for this book is already under review.",
        icon: "info",
        confirmButtonColor: "#633a19",
      });
      return;
    }
    setBorrowDate(new Date().toISOString().split("T")[0]);
    setSelectedBook(book);
  };

  async function handleBorrow(e) {
    e.preventDefault();
    if (!selectedBook || !auth.currentUser || !borrowDate) return;

    setSubmitting(true);
    try {
      const userUid = auth.currentUser.uid;
      const studentSnap = await getDoc(doc(db, "students", userUid));
      const studentName = studentSnap.exists()
        ? studentSnap.data().name || auth.currentUser.email
        : auth.currentUser.email || "Student";

      await addDoc(collection(db, "loans"), {
        bookId: selectedBook.id,
        book: selectedBook.title || "",
        userId: userUid,
        borrower: studentName,
        loanDate: borrowDate,
        dueDate: "—",
        status: "Pending",
        initials: loanInitials(studentName),
        color: avatarColor(userUid),
        createdAt: serverTimestamp(),
      });

      Swal.fire({
        title: "Request Sent!",
        text: "Your borrowing request has been sent to the admin. You will be notified once it is reviewed.",
        icon: "success",
        confirmButtonColor: "#633a19",
      });
      setSelectedBook(null);
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Error",
        text:
          err.code === "permission-denied"
            ? "Firestore denied the request. Please check your security rules."
            : err.message || "Something went wrong. Please try again.",
        icon: "error",
        confirmButtonColor: "#633a19",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Hero */}
      <div className="bg-img library-hero d-flex align-items-center mt-5 py-5">
        <div className="container text-center text-white px-3 py-5">
          <h1 className="fw-bolder display-5 mb-3">
            Welcome to the University <br /> Library
          </h1>
          <p className="mb-4 opacity-75">
            Discover, Search and Borrow Academic Books from our extensive <br />
            digital and physical collections.
          </p>
          <form
            onSubmit={handleSearch}
            className="d-flex justify-content-center"
          >
            <div className="library-search shadow rounded-4 d-flex align-items-center w-100">
              <div className="px-3 d-flex align-items-center justify-content-center">
                <i className="fa-solid fa-magnifying-glass text-white opacity-75"></i>
              </div>
              <input
                type="text"
                className="form-control border-0 shadow-none bg-transparent text-white"
                placeholder="Search by title, author, or ISBN..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="border-0 text-white fw-bold bg-brown rounded-4 px-4 py-3">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Books Grid */}
      <div className="py-4">
        <div className="container px-3">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <h4 className="fw-bolder mb-0">
              {query.trim()
                ? `Results for "${query}"`
                : "Featured Academic Books"}
            </h4>
            {!query.trim() && (
              <Link
                to="/collection"
                className="view-collection text-decoration-none fw-bold"
              >
                View all collection{" "}
                <i className="fa-solid fa-arrow-right ms-2"></i>
              </Link>
            )}
          </div>

          <div className="row g-4">
            {featuredBooks.length === 0 ? (
              <p className="text-muted">No books found.</p>
            ) : (
              featuredBooks.map((b) => {
                const unavailable = unavailableBookIds.has(b.id);
                const myPending = myPendingBookIds.has(b.id);
                return (
                  <div key={b.id} className="col-12 col-sm-6 col-lg-3">
                    <div className="card border-0 rounded-4 shadow h-100 overflow-hidden">
                      <div className="library-card-img">
                        <img
                          src={b.coverUrl}
                          alt={b.title}
                          className="w-100 h-100 object-fit-cover"
                        />
                      </div>
                      <div className="p-3">
                        <div className="small fw-bold text-uppercase brown opacity-75">
                          {b.category}
                        </div>
                        <h6 className="fw-bolder mt-2 mb-1">{b.title}</h6>
                        <div className="small opacity-75 mb-3">{b.author}</div>

                        {unavailable ? (
                          <button
                            disabled
                            className="w-100 p-2 py-3 rounded-4 border-0 fw-bold bg-secondary text-white"
                          >
                            Not Available
                          </button>
                        ) : myPending ? (
                          <button
                            disabled
                            className="w-100 p-2 py-3 rounded-4 border-0 fw-bold"
                            style={{ background: "#FEF3C7", color: "#B45309" }}
                          >
                            Pending Approval
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openBorrowModal(b)}
                            className="w-100 p-2 py-3 rounded-4 border-0 text-white fw-bold bg-brown shadow hover d-flex align-items-center justify-content-center gap-2"
                          >
                            <i className="fa-solid fa-bookmark"></i> Borrow
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-brown text-white py-4 mt-4 footer-hover">
        <div className="container px-3">
          <div className="row text-center g-3">
            {[
              { value: "50k+", label: "Digital Books" },
              { value: "12k+", label: "Research Papers" },
              { value: "8k+", label: "Active Students" },
              { value: "24/7", label: "Online Access" },
            ].map((s) => (
              <div key={s.label} className="col-6 col-lg-3 stat-box">
                <div className="fw-bolder fs-4">{s.value}</div>
                <div className="small opacity-75 text-uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ Borrow Modal — zIndex 1055 to appear above Navbar (Bootstrap z-index: 1030) */}
      {selectedBook && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex justify-content-center align-items-center px-3"
          style={{ backgroundColor: "rgba(57, 34, 10, 0.6)", zIndex: 1055 }}
        >
          <div
            className="bg-white p-4 p-md-5 rounded-4 shadow w-100"
            style={{ maxWidth: 520 }}
          >
            <h2 className="fw-bold brown border-bottom pb-3 mb-3 fs-4">
              Borrow a Book
            </h2>
            <p className="small text-muted">
              Your request will be sent to the <strong>admin</strong> for
              approval or rejection.
            </p>

            <form onSubmit={handleBorrow}>
              <label className="brown fw-semibold">Book Title</label>
              <input
                className="form-control mb-3"
                value={selectedBook.title}
                readOnly
              />

              <label className="brown fw-semibold">Borrow Date</label>
              <input
                type="date"
                className="form-control mb-2"
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
                required
              />
              <div className="small text-muted mb-4">
                📌 The book must be returned within 2 weeks from the borrow date
                (confirmed upon approval).
              </div>

              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="p-2 py-3 rounded-2 border-0 text-white fw-bold bg-brown shadow hover"
                >
                  {submitting ? "Sending..." : "Send Request"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary px-4"
                  onClick={() => setSelectedBook(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default LibraryHome;
