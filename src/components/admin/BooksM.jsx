import { useEffect, useState } from "react";
import { db } from "../firebase";
import { updateDoc } from "firebase/firestore";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

function BooksM() {
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // ✅ FIX 1: حالة الـ Edit Modal
  const [editingBook, setEditingBook] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    description: "",
  });

  const booksCollection = collection(db, "books");

  // ✅ FIX 2: تصحيح شرط الـ Status من "الكل" إلى "All"
  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.isbn?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === "All" || book.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    const unsub = onSnapshot(
      booksCollection,
      (snapshot) => {
        const booksList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setBooks(booksList);
      },
      (error) => console.error("books listener:", error),
    );
    return () => unsub();
  }, []);

  const handleAddBook = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const bookFormData = new FormData(e.target);
      const title = bookFormData.get("bookName");
      const author = bookFormData.get("Author");
      const isbn = bookFormData.get("isbn");
      const category = bookFormData.get("category");
      const description = bookFormData.get("Description");

      if (!image) {
        alert("Please choose a cover image");
        setLoading(false);
        return;
      }

      const imageFormData = new FormData();
      imageFormData.append("image", image);

      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: imageFormData,
      });

      const data = await res.json();
      const coverUrl = data.imageUrl;

      await addDoc(booksCollection, {
        title,
        author,
        isbn,
        category,
        description,
        coverUrl,
        status: "available",
        createdAt: serverTimestamp(),
      });

      setIsOpen(false);
      setImage(null);
      e.target.reset();
    } catch (error) {
      console.log(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBook = async (book) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${book.title}"?`
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "books", book.id));
    } catch (error) {
      console.log(error);
      alert("Error deleting book");
    }
  };

  // ✅ FIX 3: فتح الـ Edit Modal وملء البيانات
  const openEditModal = (book) => {
    setEditingBook(book);
    setEditForm({
      title: book.title || "",
      author: book.author || "",
      isbn: book.isbn || "",
      category: book.category || "",
      description: book.description || "",
    });
  };

  // ✅ FIX 3: حفظ التعديل
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingBook) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, "books", editingBook.id), {
        title: editForm.title,
        author: editForm.author,
        isbn: editForm.isbn,
        category: editForm.category,
        description: editForm.description,
      });
      setEditingBook(null);
    } catch (error) {
      console.log(error);
      alert("Error updating book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-5 pt-5">
      <div className="container p-3">
        <div className="d-flex flex-column flex-md-row justify-content-between">
          <div className="col-md-6">
            <h1 className="brown fw-bolder fa-3x">Book Management</h1>
            <p className="fs-3 brown">Manage Library Content</p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="col-md-3 p-2 py-3 rounded-4 border-0 my-3 text-nowrap text-white fw-bold bg-brown shadow hover"
          >
            <i className="fa-solid fa-plus me-1"></i> Add New Book
          </button>
        </div>
      </div>

      {/* Add Book Modal */}
      {isOpen && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(57, 34, 10, 0.6)", zIndex: 1000 }}
        >
          <div className="bg-white p-5 rounded-4 shadow w-75">
            <h1 className="fw-bold brown border-bottom pb-3 mb-3">
              Add New Book
            </h1>

            <form onSubmit={handleAddBook}>
              <div className="row">
                <div className="col-md-6">
                  <label htmlFor="title" className="brown">Book Title</label>
                  <input
                    id="title"
                    type="text"
                    name="bookName"
                    className="form-control mb-3"
                    placeholder="e.g. The Republic"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="author" className="brown">Author</label>
                  <input
                    id="author"
                    type="text"
                    name="Author"
                    className="form-control mb-3"
                    placeholder="e.g. Plato"
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <label htmlFor="isbn" className="brown">ISBN Number</label>
                  <input
                    id="isbn"
                    type="text"
                    name="isbn"
                    className="form-control mb-3"
                    placeholder="978-3-16-148410-0"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="category" className="brown">Category</label>
                  <input
                    id="category"
                    type="text"
                    name="category"
                    className="form-control mb-3"
                    placeholder="e.g. history"
                    required
                  />
                </div>
              </div>

              <label htmlFor="des" className="brown">Description</label>
              <textarea
                id="des"
                name="Description"
                className="form-control mb-3"
                placeholder="Provide a brief summary of the book..."
                required
              />

              <label htmlFor="img" className="brown">Book Cover Image</label>
              <input
                onChange={(e) => setImage(e.target.files[0])}
                id="img"
                type="file"
                name="cover"
                className="form-control mb-3"
                accept="image/*"
                required
              />

              <div className="d-flex gap-2 mt-5 justify-content-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="p-2 rounded-3 border-0 text-white fw-bold bg-brown hover col-2"
                >
                  {loading ? "Adding..." : "Add"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary col-2"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ FIX 3: Edit Book Modal */}
      {editingBook && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(57, 34, 10, 0.6)", zIndex: 1000 }}
        >
          <div className="bg-white p-5 rounded-4 shadow w-75">
            <h1 className="fw-bold brown border-bottom pb-3 mb-3">
              Edit Book
            </h1>

            <form onSubmit={handleEditSave}>
              <div className="row">
                <div className="col-md-6">
                  <label className="brown">Book Title</label>
                  <input
                    type="text"
                    className="form-control mb-3"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="brown">Author</label>
                  <input
                    type="text"
                    className="form-control mb-3"
                    value={editForm.author}
                    onChange={(e) =>
                      setEditForm({ ...editForm, author: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <label className="brown">ISBN Number</label>
                  <input
                    type="text"
                    className="form-control mb-3"
                    value={editForm.isbn}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isbn: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="brown">Category</label>
                  <input
                    type="text"
                    className="form-control mb-3"
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <label className="brown">Description</label>
              <textarea
                className="form-control mb-3"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                required
              />

              <div className="d-flex gap-2 mt-4 justify-content-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="p-2 rounded-3 border-0 text-white fw-bold bg-brown hover col-2"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary col-2"
                  onClick={() => setEditingBook(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="container p-3">
        <div className="border p-3 my-3 rounded-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-5">
            <div className="d-flex flex-wrap gap-2">
              {["All", "available", "Borrowed", "fixing"].map((status) => (
                <button
                  key={status}
                  className={
                    selectedStatus === status
                      ? "p-2 rounded-3 border-0 text-white fw-bold bg-brown shadow hover"
                      : "btn btn-light"
                  }
                  onClick={() => setSelectedStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="position-relative" style={{ minWidth: "280px" }}>
              <input
                type="text"
                className="form-control pe-5"
                placeholder="Search by book name, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i
                className="fa-solid fa-magnifying-glass position-absolute top-50 translate-middle-y me-3 text-muted"
                style={{ right: "10px" }}
              ></i>
            </div>
          </div>

          <div>
            {books.length === 0 ? (
              <div className="text-center py-4">
                <i className="fa-solid fa-book mb-3 brown"></i>
                <p className="font-medium brown">No Books Added</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              // ✅ حالة: في كتب لكن الفلتر مش لاقي نتايج
              <div className="text-center py-4">
                <i className="fa-solid fa-magnifying-glass mb-3 brown"></i>
                <p className="font-medium brown">No books match your search</p>
              </div>
            ) : (
              <div>
                <div className="d-flex px-3 mb-3 text-center fw-bold border-bottom pb-3">
                  <div className="col">BOOK</div>
                  <div className="col">AUTHOR</div>
                  <div className="col">CATEGORY</div>
                  <div className="col">STATUS</div>
                  <div className="col">PROCEDURES</div>
                </div>

                {/* ✅ FIX 2: استخدام filteredBooks بدل books */}
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    className="card p-3 shadow mb-3 d-flex flex-row align-items-center text-center"
                  >
                    <div className="col d-flex align-items-center gap-2">
                      <div className="rounded-3">
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          style={{ width: "50px" }}
                        />
                      </div>
                      <p className="m-0">{book.title}</p>
                    </div>

                    <p className="m-0 col">{book.author}</p>
                    <p className="m-0 col">{book.category}</p>
                    <p className="m-0 col">{book.status || "—"}</p>

                    <div className="col text-center d-flex justify-content-center gap-3">
                      {/* ✅ FIX 3: فتح الـ Edit Modal */}
                      <button
                        onClick={() => openEditModal(book)}
                        className="bg-transparent border-0"
                      >
                        <i className="fa-solid fa-pen text-primary"></i>
                      </button>

                      <button
                        onClick={() => deleteBook(book)}
                        className="bg-transparent border-0"
                      >
                        <i className="fa-solid fa-trash-can text-danger"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BooksM;