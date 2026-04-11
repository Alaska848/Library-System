import { useEffect, useState } from "react";
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

function Catalog() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowDate, setBorrowDate] = useState("");

  const [uid, setUid] = useState(null);
  const [unavailableBookIds, setUnavailableBookIds] = useState(new Set());
  const [myPendingBookIds, setMyPendingBookIds] = useState(new Set());

  const [submitting, setSubmitting] = useState(false);

  // auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  // get books
  useEffect(() => {
    getDocs(collection(db, "books"))
      .then((snap) =>
        setBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // loans tracking
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "loans"), (snap) => {
      const unavailable = new Set();
      const myPending = new Set();

      snap.forEach((d) => {
        const data = d.data();

        if (
          (data.status === "Active" || data.status === "Overdue") &&
          data.bookId
        ) {
          unavailable.add(data.bookId);
        }

        if (
          data.status === "Pending" &&
          uid &&
          data.userId === uid &&
          data.bookId
        ) {
          myPending.add(data.bookId);
        }
      });

      setUnavailableBookIds(unavailable);
      setMyPendingBookIds(myPending);
    });

    return () => unsub();
  }, [uid]);
   const categories = [
  "All",
  "Philosophy",
    "History",
    "Science",
    "Mathematics",
    "Computer Science",
    "Literature",
    "Engineering",
    "Business",
    "Psychology",
    "Art",
    "Medicine",
    "Economics",
    "Law",
];

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      (b.title || "").toLowerCase().includes(query.toLowerCase()) ||
      (b.author || "").toLowerCase().includes(query.toLowerCase()) ||
      (b.isbn || "").toLowerCase().includes(query.toLowerCase());

    
  const matchesCategory =
  category === "All" || b.category === category;

    return matchesSearch && matchesCategory;
  });

  const openBorrowModal = (book) => {
    if (!auth.currentUser) {
      Swal.fire("Login Required", "Please login first", "info");
      return;
    }

    if (unavailableBookIds.has(book.id)) return;

    if (myPendingBookIds.has(book.id)) {
      Swal.fire("Pending", "Request already sent", "info");
      return;
    }

    setBorrowDate(new Date().toISOString().split("T")[0]);
    setSelectedBook(book);
  };

  async function handleBorrow(e) {
    e.preventDefault();
    if (!selectedBook || !auth.currentUser) return;

    setSubmitting(true);
    try {
      const userUid = auth.currentUser.uid;

      const studentSnap = await getDoc(doc(db, "students", userUid));
      const studentName = studentSnap.exists()
        ? studentSnap.data().name
        : auth.currentUser.email;

      await addDoc(collection(db, "loans"), {
        bookId: selectedBook.id,
        book: selectedBook.title,
        userId: userUid,
        borrower: studentName,
        loanDate: borrowDate,
        status: "Pending",
        initials: loanInitials(studentName),
        color: avatarColor(userUid),
        createdAt: serverTimestamp(),
      });

      Swal.fire("Done", "Request sent", "success");
      setSelectedBook(null);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-4 mt-5">
      <h2 className="fw-bolder mb-3">Book Catalog</h2>

      {/* Search */}
      <input
        type="text"
        className="form-control mb-3 rounded-4"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Categories */}
      <div className="mb-4 d-flex gap-2 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-2 rounded-4 border-0 ${
              category === c ? "bg-brown text-white" : "bg-light"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center mt-5">Loading...</div>
      ) : (
        <>
          {/* Books */}
          <div className="row g-4">
            {filteredBooks.map((b) => {
              const unavailable = unavailableBookIds.has(b.id);
              const myPending = myPendingBookIds.has(b.id);

              return (
                <div key={b.id} className="col-12 col-sm-6 col-lg-3">
                  <div className="card border-0 rounded-4 shadow h-100">
                    <img
                      src={b.coverUrl}
                      alt={b.title}
                      className="w-100"
                      style={{ height: "200px", objectFit: "cover" }}
                    />
                    <div className="p-3">
                      <div className="small opacity-75">{b.category}</div>
                      <h6 className="fw-bold">{b.title}</h6>
                      <div className="small mb-2">{b.author}</div>

                      {unavailable ? (
                        <button className="btn btn-secondary w-100" disabled>
                          Not Available
                        </button>
                      ) : myPending ? (
                        <button className="btn btn-warning w-100" disabled>
                          Pending
                        </button>
                      ) : (
                        <button
                          onClick={() => openBorrowModal(b)}
                          className="btn btn-dark w-100"
                        >
                          Borrow
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No results */}
          {filteredBooks.length === 0 && (
            <div className="text-center mt-4 text-muted">
              No books found
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {selectedBook && (
        <div className="modal d-block" style={{ background: "#00000088" }}>
          <div className="modal-dialog">
            <form onSubmit={handleBorrow} className="modal-content p-3">
              <h5>Borrow Book</h5>

              <input
                className="form-control my-2"
                value={selectedBook.title}
                readOnly
              />

              <input
                type="date"
                className="form-control mb-3"
                value={borrowDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setBorrowDate(e.target.value)}
              />

              <button className="btn btn-dark">
                {submitting ? "Sending..." : "Confirm"}
              </button>

              <button
                type="button"
                className="btn btn-secondary mt-2"
                onClick={() => setSelectedBook(null)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Catalog;