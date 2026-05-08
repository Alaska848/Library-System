import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Swal from "sweetalert2";
import LoadingOverlay from "./LoadingOverlay";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const showSuspendedPopup = async (reason) => {
    await Swal.fire({
      title: "Account Suspended",
      html: `
        <div style="font-size:15px;line-height:1.6;color:#374151">
          <div style="font-size:44px;margin-bottom:8px">🚫</div>
          <b>Your account has been suspended</b><br/>
          please contact the admin
        </div>
      `,
      text: reason || undefined,
      icon: "error",
      confirmButtonText: "Ok",
      confirmButtonColor: "#92400E",
      background: "#FFFBEB",
      color: "#111827",
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      const adminSnap = await getDoc(doc(db, "admins", uid));

      if (adminSnap.exists()) {
        sessionStorage.setItem("role", "admin");
        window.dispatchEvent(new Event("roleChanged"));

        await Swal.fire({
          title: "👋 Welcome, Admin!",
          text: "You're logged in to the admin panel.",
          icon: "success",
          confirmButtonColor: "#633a19",
          timer: 2000,
          showConfirmButton: false,
        });

        navigate("/admin/BooksM");
        return;
      }

      const studentSnap = await getDoc(doc(db, "students", uid));

      if (studentSnap.exists()) {
        const studentData = studentSnap.data();

        const studentStatus = String(studentData.status || "active")
          .toLowerCase()
          .trim();

        if (studentData.suspended === true || studentStatus === "suspended") {
          await signOut(auth);
          sessionStorage.clear();

          await showSuspendedPopup(
            studentData.suspendedReason ||
              "Your account has been suspended please contact the admin",
          );

          return;
        }

        if (studentStatus !== "active") {
          await signOut(auth);
          sessionStorage.clear();

          await Swal.fire({
            title: "Account Not Active",
            text: "Your account is not active. Please contact the library administration.",
            icon: "error",
            confirmButtonText: "Ok",
            confirmButtonColor: "#633a19",
          });

          return;
        }

        sessionStorage.setItem("role", "user");
        window.dispatchEvent(new Event("roleChanged"));

        const isNew = !studentData.lastLogin;

        await Swal.fire({
          title: isNew
            ? `👋 Welcome, ${studentData.name || ""}!`
            : `🎉 Welcome Back, ${studentData.name || ""}!`,
          text: isNew
            ? "We're glad to have you here. Start exploring our collection!"
            : "Great to see you again. Happy reading!",
          icon: "success",
          confirmButtonColor: "#633a19",
          timer: 2500,
          showConfirmButton: false,
        });

        navigate("/home");
        return;
      }

      const doctorSnap = await getDoc(doc(db, "doctors", uid));

      if (doctorSnap.exists()) {
        const doctorData = doctorSnap.data();

        const doctorStatus = String(doctorData.status || "active")
          .toLowerCase()
          .trim();

        if (doctorData.suspended === true || doctorStatus === "suspended") {
          await signOut(auth);
          sessionStorage.clear();

          await showSuspendedPopup(
            doctorData.suspendedReason ||
              "Your account has been suspended please contact the admin",
          );

          return;
        }

        if (doctorStatus !== "active") {
          await signOut(auth);
          sessionStorage.clear();

          await Swal.fire({
            title: "Access Denied",
            text: "Your account is not active.",
            icon: "error",
            confirmButtonColor: "#633a19",
          });

          return;
        }

        sessionStorage.setItem("role", "doctor");
        window.dispatchEvent(new Event("roleChanged"));

        const isNewDoc = !doctorData.lastLogin;

        await Swal.fire({
          title: isNewDoc
            ? `👋 Welcome, ${doctorData.name || ""}!`
            : `🎉 Welcome Back, ${doctorData.name || ""}!`,
          text: isNewDoc
            ? "We're glad to have you here!"
            : "Great to see you again!",
          icon: "success",
          confirmButtonColor: "#633a19",
          timer: 2500,
          showConfirmButton: false,
        });

        navigate("/home");
        return;
      }

      await signOut(auth);
      sessionStorage.clear();

      await Swal.fire({
        title: "Access Denied",
        text: "User not registered in system.",
        icon: "error",
        confirmButtonText: "Ok",
        confirmButtonColor: "#633a19",
      });
    } catch (error) {
      await Swal.fire({
        title: "INVALID LOGIN",
        text: "Try Again",
        icon: "error",
        confirmButtonText: "Ok",
        confirmButtonColor: "#633a19",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <LoadingOverlay />}

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

            <div className="px-4 mb-2">
              <Link
                to="/"
                className="text-decoration-none brown fw-semibold small"
              >
                <i className="fa-solid fa-arrow-left me-1"></i> Back to Home
              </Link>
            </div>

            <form onSubmit={handleLogin} className="row g-3 mb-4 px-4">
              <div className="col-md-12 mb-3">
                <label className="form-label">Institutional Email</label>

                <input
                  type="email"
                  className="form-control"
                  required
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="col-md-12 mb-4 text-end position-relative">
                <label className="form-label w-100 text-start">Password</label>

                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control pe-5"
                  required
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <i
                  className={`fa-solid ${
                    showPassword ? "fa-eye-slash" : "fa-eye"
                  }`}
                  onClick={() => !isLoading && setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "30px",
                    top: "48%",
                    cursor: isLoading ? "not-allowed" : "pointer",
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
                  disabled={isLoading}
                  className="p-3 rounded-4 border-0 text-white fw-bold w-100 bg-brown shadow"
                  style={{
                    opacity: isLoading ? 0.8 : 1,
                    cursor: isLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {isLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        style={{ width: 16, height: 16, borderWidth: 2 }}
                      />
                      Signing in...
                    </>
                  ) : (
                    "Sign In to Library"
                  )}
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
