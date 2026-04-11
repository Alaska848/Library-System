import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
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

      const uid = cred.user.uid;

      const adminSnap = await getDoc(doc(db, "admins", uid));
      if (adminSnap.exists()) {
        localStorage.setItem("role", "admin");
        navigate("/admin/BooksM");
        return;
      }

   
      const studentSnap = await getDoc(doc(db, "students", uid));
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();

         if (studentData.status?.toLowerCase().trim() !== "active") {
          await signOut(auth);
          Swal.fire({
            title: "Account Suspended",
            text: "Your account has been suspended. Please contact the library administration.",
            icon: "error",
            confirmButtonText: "Ok",
            confirmButtonColor: "#633a19",
          });
          return;
        }


        localStorage.setItem("role", "user");
        navigate("/home");
        return;
      }
      

    
      const doctorSnap = await getDoc(doc(db, "doctors", uid));
      if (doctorSnap.exists()) {
        const doctorData = doctorSnap.data();

   if (doctorData.status?.toLowerCase().trim() !== "active") {
  await signOut(auth);
  Swal.fire({
    title: "Access Denied",
    text: "Your account is not active",
    icon: "error",
  });
  return;
}

        localStorage.setItem("role", "user");
        navigate("/home");
        return;
      }

      await signOut(auth);
      Swal.fire({
        title: "Access Denied",
        text: "User not registered in system",
        icon: "error",
        confirmButtonText: "Ok",
        confirmButtonColor: "#633a19",
      });

    } catch (error) {
      console.log(error.code, error.message);
      Swal.fire({
        title: "INVALID LOGIN",
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

              <h3 className="darkorange fw-bolder px-4 mt-4">Welcome Back</h3>
              <p className="px-4">
                Access your digital collection and resources
              </p>
            </div>

            <form onSubmit={handleLogin} className="row g-3 mb-4 px-4">
              <div className="col-md-12 mb-3">
                <label className="form-label">Institutional Email</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="col-md-12 mb-4 text-end position-relative">
                <label className="form-label w-100 text-start">
                  Password
                </label>

                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control pe-5"
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
                  className="text-decoration-none fa-xs mt-4 brown"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="col-12 d-flex justify-content-center">
                <button
                  type="submit"
                  className="p-3 rounded-4 border-0 text-white fw-bold w-100 bg-brown shadow"
                >
                  Sign In to Library
                </button>
              </div>
            </form>

            <div className="border-top m-4 p-3 text-center">
              New to the library?{" "}
              <Link
                to="/create-account"
                className="text-decoration-none fw-bold brown"
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