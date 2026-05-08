import { Navigate } from "react-router-dom";

// requireAuth="full"  → الصفحة كلها محتاجة login (زي admin pages)
// requireAuth="borrow" → الصفحة تتفتح للكل، بس الاستعارة بتطلب login (تتعمل في الكومبوننت نفسه)
// لو مفيش requireAuth → مفتوحة للكل

export default function ProtectedRoute({
  children,
  allowedRole,
  allowedRoles, // للتوافقية مع arrays
  requireAuth = "full",
}) {
  const role = sessionStorage.getItem("role");

  if (requireAuth === "full") {
    if (!role) return <Navigate to="/" replace />;

    // دعم كلاً من allowedRole و allowedRoles
    const rolesArray = allowedRoles || (allowedRole ? [allowedRole] : null);

    if (rolesArray) {
      const isAuthorized =
        rolesArray.includes(role) ||
        (rolesArray.includes("user") && role === "doctor");

      if (!isAuthorized) return <Navigate to="/" replace />;
    }
  }

  // لو requireAuth === "borrow" → نفتح الصفحة عادي، الحماية داخل الكومبوننت
  return children;
}
