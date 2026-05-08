const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

const app = express();

app.use(cors());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "library-system",
   allowed_formats: ["jpg", "jpeg", "png", "webp", "heic"],
  },
});

const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("UPLOAD ERROR FULL:", err);
      console.error("UPLOAD ERROR JSON:", JSON.stringify(err, null, 2));

      return res.status(500).json({
        error: err.message || "Upload failed",
        details: err,
      });
    }

    console.log("FILE:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    return res.json({
      imageUrl: req.file.path,
    });
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});