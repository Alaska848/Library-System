/**
 * Firebase Auth Middleware للتحقق من الـ Token
 * يتم استخدامه للتحقق من الصلاحيات على جميع الـ Protected Routes
 */

const admin = require("firebase-admin");

// تهيئة Firebase Admin SDK (يجب إضافة serviceAccountKey.json)
// const serviceAccount = require("./serviceAccountKey.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

/**
 * Middleware للتحقق من Bearer Token
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.substring(7);

  try {
    // التحقق من Token وفك تشفيره
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(403).json({ error: "Invalid token" });
  }
};

/**
 * Middleware للتحقق من دور معين
 */
const verifyRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // الحصول على Custom Claims من Firebase
      const userRecord = await admin.auth().getUser(uid);
      const userRole = userRecord.customClaims?.role || "user";

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: "User does not have required role",
          requiredRoles: allowedRoles,
          userRole: userRole,
        });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      console.error("Role verification failed:", error);
      res.status(500).json({ error: "Failed to verify role" });
    }
  };
};

module.exports = { verifyToken, verifyRole };
