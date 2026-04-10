import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const role = localStorage.getItem("role");

  if (!role) return <Navigate to="/" replace />;

  if (allowedRole && role !== allowedRole) return <Navigate to="/" replace />;

  return children;
}
