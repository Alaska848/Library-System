import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Swal from "sweetalert2";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const userRef = doc(db, "students", cred.user.uid);
      const userSnap = await getDoc(userRef);

      const adminRef = doc(db, "admins", cred.user.uid);
      const adminSnap = await getDoc(adminRef);

      console.log(cred.user);
      console.log("UID:", cred.user.uid);
      console.log("admin exists:", adminSnap.exists());
      console.log("user exists:", userSnap.exists());

    
      if (adminSnap.exists()) {
        localStorage.setItem("role", "admin");
        navigate("/admin/BooksM");
      } else {
        localStorage.setItem("role", "user");
        navigate("/home");
      }

    } catch (error) {
      console.log(error.code, error.message);

      Swal.fire({
        title: "INVALID LOGGED IN",
        text: "Try Again",
        icon: "error",
        confirmButtonText: "Ok",
        confirmButtonColor: "#633a19",
      });
    }
  };

  return (
    <>
      <div className="d-flex justify-content-center align-items-center min-vh-100 mx-4">
        <div className="col-md-4 p-3 form border rounded-4 shadow">
          <div className="col-md-12">
            <div className="text-center my-4">
              <div className="icon-circle mx-auto d-flex align-items-center justify-content-center">
                <i className="fa-solid fa-graduation-cap fs-2 brown"></i>
              </div>

              <h3 className="darkorange fw-bolder px-4 mt-4">
                Welcome Back
              </h3>

              <p className="px-4">
                Access your digital collection and resources
              </p>
            </div>

            <form onSubmit={handleLogin} className="row g-3 mb-4 px-4">

              <div className="col-md-12 mb-3">
                <label htmlFor="Email" className="form-label">
                  Institutional Email
                </label>

                <input
                  type="email"
                  className="form-control"
                  id="Email"
                  placeholder="student@university.edu"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu(\.eg)?$"
                  title="Please enter a valid university email (.edu or .edu.eg)"
                />
              </div>

              <div className="col-md-12 mb-4 text-end position-relative">

                <label
                  htmlFor="password"
                  className="form-label w-100 text-start"
                >
                  Password
                </label>

                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control pe-5"
                  id="password"
                  placeholder="******"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <i
                  className={`fa-solid ${
                    showPassword ? "fa-eye-slash" : "fa-eye"
                  }`}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "30px",
                    top: "48%",
                    cursor: "pointer",
                    color: "#6c757d",
                  }}
                />

                <Link
                  to="/forgetPassword"
                  className="border-0 bg-transparent fa-xs mt-4 brown text-decoration-none hover-links"
                >
                  Forgot password?
                </Link>

              </div>

              <div className="col-12 mx-auto d-flex justify-content-center text-center">

                <button
                  type="submit"
                  className="text-decoration-none p-2 py-3 rounded-4 border-0 mb-2 text-nowrap text-white fw-bold w-100 bg-brown shadow hover"
                >
                  Sign In to Library
                </button>

              </div>

            </form>

            <div className="border-top m-4 p-3 text-center">
              New to the library?{" "}
              <Link
                to="/create-account"
                className="text-decoration-none fw-bold brown hover-links"
              >
                Create an account
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default Login;