import { Navigate } from "react-router-dom";

// requireAuth="full"  → الصفحة كلها محتاجة login (زي admin pages)
// requireAuth="borrow" → الصفحة تتفتح للكل، بس الاستعارة بتطلب login (تتعمل في الكومبوننت نفسه)
// لو مفيش requireAuth → مفتوحة للكل

export default function ProtectedRoute({ children, allowedRole, requireAuth = "full" }) {
  const role = sessionStorage.getItem("role");

  if (requireAuth === "full") {
    if (!role) return <Navigate to="/" replace />;

    if (allowedRole) {
      const matches =
        role === allowedRole ||
        (allowedRole === "user" && role === "doctor");
      if (!matches) return <Navigate to="/" replace />;
    }
  }

  // لو requireAuth === "borrow" → نفتح الصفحة عادي، الحماية داخل الكومبوننت
  return children;
}
