const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Branding files live under "public/uploads/settingsImages"
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(
      __dirname,
      "..",
      "public",
      "uploads",
      "settingsImages",
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

const acceptSettingsImage = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 700 }, // 700kB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpg",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/x-icon",
      "image/vnd.microsoft.icon",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, JPEG, PNG, WEBP, SVG and ICO files are allowed"),
      );
    }
    cb(null, true);
  },
});

module.exports = acceptSettingsImage;
