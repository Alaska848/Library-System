import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const role = localStorage.getItem("role");

  if (!role) return <Navigate to="/" replace />;

  if (allowedRole) {
    const matches =
      role === allowedRole ||
      (allowedRole === "user" && role === "doctor");
    if (!matches) return <Navigate to="/" replace />;
  }

  return children;
}
