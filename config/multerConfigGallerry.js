const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Set destination directory inside "public/uploads/programImages"
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(
      __dirname,
      "..",
      "public",
      "uploads",
      "galleryImages"
    );

    // Ensure the directory exists
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});

const acceptGalleryImage = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 250 }, // 250kB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, WEBP and PNG files are allowed"));
    }
    cb(null, true);
  },
});

module.exports = acceptGalleryImage;
