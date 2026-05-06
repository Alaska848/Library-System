import { useState } from "react";
import { db, auth } from "./firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import Swal from "sweetalert2";

function SubmitBookDr() {
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "Computer Science",
    lendingType: "free",
    amount: "",
    status: "Very Good",
    date: "",
    cover: null,
  });

  // 🔒 Doctor فقط
  if (sessionStorage.getItem("role") !== "doctor") {
    return (
      <div className="text-center mt-5">
        <h4 className="text-danger">Access Denied</h4>
        <p>Only doctors can submit books.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "cover") {
      setForm({ ...form, cover: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "books"), {
        title: form.title,
        author: form.author,
        isbn: form.isbn,
        category: form.category,
        lendingType: form.lendingType,
        amount: form.lendingType === "paid" ? form.amount : 0,
        status: form.status,
        date: form.date,
        coverUrl: "", // ممكن نضيف upload بعدين
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        source: "doctor_request",
        requestStatus: "pending",
      });

      Swal.fire({
        title: "Submitted!",
        text: "Your book has been sent for review.",
        icon: "success",
        confirmButtonColor: "#633a19",
      });

      setForm({
        title: "",
        author: "",
        isbn: "",
        category: "Computer Science",
        lendingType: "free",
        amount: "",
        status: "Very Good",
        date: "",
        cover: null,
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message, "error");
    }
  };
  
    const categories = [
                "Philosophy", "History", "Science", "Mathematics",
                "Computer Science", "Literature", "Engineering",
                "Business", "Psychology", "Art", "Medicine",
                "Economics", "Law"
                ];

  return (
    <div className="container mt-5 py-5">
      <div className="bg-white p-4 p-md-5 ">
        <h3 className="fw-bold text-center mb-4 brown">
          Book Submission for Lending
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            {/* Title */}
            <div className="col-md-6">
              <label className="fw-semibold">Book Title</label>
              <input
                type="text"
                name="title"
                className="form-control"
                placeholder="e.g. Introduction to AI"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Author */}
            <div className="col-md-6">
              <label className="fw-semibold">Author Name</label>
              <input
                type="text"
                name="author"
                className="form-control"
                placeholder="Enter full author name"
                value={form.author}
                onChange={handleChange}
                required
              />
            </div>

            {/* ISBN */}
            <div className="col-md-6">
              <label className="fw-semibold">ISBN</label>
              <input
                type="text"
                name="isbn"
                className="form-control"
                placeholder="000-00-0000-000-0"
                value={form.isbn}
                onChange={handleChange}
              />
            </div>

            {/* Category */}
            <div className="col-md-6">
                  <label htmlFor="category" className="brown">Category</label>
                  <select
                    id="category"
                    name="category"
                    className="form-control mb-3"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

            {/* Lending Type */}
            <div className="col-md-6">
              <label className="fw-semibold d-block mb-2">
                Lending Type
              </label>
              <div className="d-flex gap-3">
                <label>
                  <input
                    type="radio"
                    name="lendingType"
                    value="free"
                    checked={form.lendingType === "free"}
                    onChange={handleChange}
                  />{" "}
                  Free
                </label>
                <label>
                  <input
                    type="radio"
                    name="lendingType"
                    value="paid"
                    checked={form.lendingType === "paid"}
                    onChange={handleChange}
                  />{" "}
                  Paid
                </label>
              </div>

              {form.lendingType === "paid" && (
                <input
                  type="number"
                  name="amount"
                  className="form-control mt-2"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={handleChange}
                />
              )}
            </div>

            {/* Status */}
            <div className="col-md-6">
              <label className="fw-semibold d-block mb-2">
                Book Status
              </label>
              <div className="d-flex gap-2">
                {["Used", "Good", "New"].map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setForm({ ...form, status: s })}
                    className={`btn ${form.status === s
                        ? "bg-brown text-white"
                        : "btn-outline-secondary"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="col-md-6">
              <label className="fw-semibold">Submission Date</label>
              <input
                type="date"
                name="date"
                className="form-control"
                value={form.date}
                onChange={handleChange}
              />
            </div>

            {/* Image */}
            <div className="col-md-6">
              <label className="fw-semibold">Book Cover</label>
              <input
                type="file"
                name="cover"
                className="form-control"
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="d-flex gap-3 mt-4">
            <button className="bg-brown text-white px-4 py-2 rounded-2 border-0 hover">
              Submit Request
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Note */}
        <div className="alert alert-warning mt-4">
          Your request will be reviewed within 48 hours via email.
        </div>
      </div>
    </div>
  );
}

export default SubmitBookDr;