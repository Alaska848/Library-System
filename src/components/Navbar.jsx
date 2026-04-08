import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

function Navbar() {
  const [isOpen, setIsopen] = useState(false);
  const navigate = useNavigate();

  // ✅ FIX: الـ role دلوقتي state بيتحدث تلقائياً
  const [role, setRole] = useState(localStorage.getItem("role"));

  useEffect(() => {
    // بيراقب أي تغيير في localStorage (مثلاً بعد login/logout)
    const handleStorageChange = () => {
      setRole(localStorage.getItem("role"));
    };

    window.addEventListener("storage", handleStorageChange);

    // ✅ كمان بنراقب تغيير الـ auth state
    const interval = setInterval(() => {
      const currentRole = localStorage.getItem("role");
      setRole((prev) => (prev !== currentRole ? currentRole : prev));
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("role");
    setRole(null);
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-md bg-brown fixed left-0 top-0 z-50 fixed-top p-2">
      <div className="container d-md-flex align-items-md-center justify-content-md-around">
        <div className="navbar-brand d-flex align-items-center">
          <i className="fa-solid fa-graduation-cap text-white me-2"></i>
          <span className="text-white fw-bolder">University Library</span>
        </div>

        <button
          onClick={() => setIsopen(!isOpen)}
          className={`navbar-toggler shadow-none ${isOpen ? "" : "collapsed"}`}
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNavAltMarkup"
          aria-controls="navbarNavAltMarkup"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div
          className={`collapse navbar-collapse ${isOpen ? "show" : ""} d-md-flex justify-content-center`}
          id="navbarNavAltMarkup"
        >
          <div className="navbar-nav p-3 mt-3 m-md-0 p-md-1">
            {role === "user" && (
              <>
                <NavLink
                  className="nav-link m-1 text-white hover rounded-5 px-4"
                  to="/home"
                  onClick={() => setIsopen(false)}
                >
                  Home
                </NavLink>
                <NavLink
                  className="nav-link m-1 text-white hover rounded-5 px-4"
                  to="/my-borrowed-books"
                  onClick={() => setIsopen(false)}
                >
                  My Borrowed Books
                </NavLink>
              </>
            )}

            <NavLink
              className="nav-link m-1 text-white hover rounded-5 px-4"
              to="/books"
              onClick={() => setIsopen(false)}
            >
              Books
            </NavLink>

            <NavLink
              className="nav-link m-1 text-white hover rounded-5 px-4"
              to="/about"
              onClick={() => setIsopen(false)}
            >
              About
            </NavLink>

            {role === "admin" && (
              <>
                <NavLink
                  className="nav-link m-1 text-white hover rounded-5 px-4"
                  to="/admin/BooksM"
                  onClick={() => setIsopen(false)}
                >
                  Books Management
                </NavLink>
                <NavLink
                  className="nav-link m-1 text-white hover rounded-5 px-4"
                  to="/admin/BorrowingLog"
                  onClick={() => setIsopen(false)}
                >
                  Borrowing Log
                </NavLink>
              </>
            )}

            <Link className="px-4 my-2 d-md-none" to="/user">
              <span className="rounded-circle border p-1 hover-bg">
                <i className="fa-solid fa-user text-white"></i>
              </span>
            </Link>
          </div>
        </div>

        <div className="text-white icon-search d-md-flex justify-content-center align-items-center m-2 d-none">
          <i className="fa-solid fa-search"></i>
        </div>

        <div className="d-none d-md-flex align-items-center gap-3">
          <Link className="px-2" to="/user">
            <span className="rounded-circle border p-1 hover-bg">
              <i className="fa-solid fa-user text-white"></i>
            </span>
          </Link>

          {/* ✅ زرار Logout */}
          {role && (
            <button
              onClick={handleLogout}
              className="border-0 bg-transparent text-white hover-links"
              title="Logout"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
