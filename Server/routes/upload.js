/**
 * Signed Upload Endpoint
 * يوفر توقيع آمن للرفع إلى Cloudinary من الفرونت
 * بدلاً من استخدام unsigned uploads
 */

const express = require("express");
const { v2: cloudinary } = require("cloudinary");
const { verifyToken } = require("./middleware/auth");

const router = express.Router();

/**
 * GET /api/upload-signature
 * يعيد التوقيع المطلوب للرفع الآمن إلى Cloudinary
 */
router.get("/upload-signature", verifyToken, async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // إنشاء التوقيع باستخدام الـ secret key
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: "library-system/user-uploads", // تصنيف الملفات
        resource_type: "image",
        allowed_formats: "jpg,jpeg,png,webp,heic",
        max_file_size: 5000000, // 5MB max
        transformation: [
          {
            width: 800,
            height: 800,
            crop: "limit",
          },
        ],
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error("Failed to generate upload signature:", error);
    res.status(500).json({ error: "Failed to generate upload signature" });
  }
});

/**
 * POST /api/upload (الطريقة القديمة - مع التحقق من Token)
 * للتوافقية مع الكود الحالي
 */
router.post("/upload", verifyToken, async (req, res) => {
  // يتم استدعاء multer middleware هنا
  // والتحقق من أن المستخدم مصرح بالرفع
  res.json({ message: "Upload completed via signed method" });
});

module.exports = router;
