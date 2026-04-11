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

  const [editingBook, setEditingBook] = useState(null);

  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    description: "",
  });

  const booksCollection = collection(db, "books");

  // 📌 أشهر تخصصات الكتب
  const categories = [
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
    const unsub = onSnapshot(booksCollection, (snapshot) => {
      const booksList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setBooks(booksList);
    });

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

    await deleteDoc(doc(db, "books", book.id));
  };

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
        <div className="d-flex justify-content-between">
          <div>
            <h1 className="brown fw-bolder">Book Management</h1>
            <p className="fs-4 brown">Manage Library Content</p>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="p-2 px-4 rounded-4 border-0 text-white bg-brown fw-bold"
          >
            Add New Book
          </button>
        </div>
      </div>

      {/* ADD MODAL */}
      {isOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white p-4 rounded-4 w-75">
            <h3>Add Book</h3>

            <form onSubmit={handleAddBook}>
              <input name="bookName" className="form-control mb-2" placeholder="Title" />
              <input name="Author" className="form-control mb-2" placeholder="Author" />
              <input name="isbn" className="form-control mb-2" placeholder="ISBN" />

              {/* CATEGORY DROPDOWN */}
              <select
                name="category"
                className="form-control mb-2"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat, i) => (
                  <option key={i} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <textarea
                name="Description"
                className="form-control mb-2"
                placeholder="Description"
              />

              <input
                type="file"
                className="form-control mb-2"
                onChange={(e) => setImage(e.target.files[0])}
              />

              <button className="btn btn-success w-100">
                {loading ? "Loading..." : "Add"}
              </button>
            </form>

            <button className="btn btn-secondary mt-2 w-100" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingBook && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white p-4 rounded-4 w-75">
            <h3>Edit Book</h3>

            <form onSubmit={handleEditSave}>
              <input
                className="form-control mb-2"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />

              <input
                className="form-control mb-2"
                value={editForm.author}
                onChange={(e) =>
                  setEditForm({ ...editForm, author: e.target.value })
                }
              />

              <input
                className="form-control mb-2"
                value={editForm.isbn}
                onChange={(e) =>
                  setEditForm({ ...editForm, isbn: e.target.value })
                }
              />

              {/* CATEGORY DROPDOWN */}
              <select
                className="form-control mb-2"
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
              >
                <option value="">Select Category</option>
                {categories.map((cat, i) => (
                  <option key={i} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <textarea
                className="form-control mb-2"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />

              <button className="btn btn-primary w-100">
                {loading ? "Saving..." : "Save"}
              </button>
            </form>

            <button
              className="btn btn-secondary mt-2 w-100"
              onClick={() => setEditingBook(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="container mt-4">
        {filteredBooks.map((book) => (
          <div key={book.id} className="card p-3 mb-2 d-flex flex-row justify-content-between">
            <div>
              <h5>{book.title}</h5>
              <p>{book.author}</p>
              <small>{book.category}</small>
            </div>

            <div>
              <button onClick={() => openEditModal(book)} className="btn btn-warning me-2">
                Edit
              </button>
              <button onClick={() => deleteBook(book)} className="btn btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BooksM;