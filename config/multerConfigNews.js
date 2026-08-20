// multerConfig.js
const path = require("path");
const multer = require("multer");

// Configure disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploadedNewsImages");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});

// Multer instance
const acceptNewsFile = multer({
  storage: storage,
  limits: { fileSize: 1 * 1024 * 250 }, // 250kB
  fileFilter: function (req, file, cb) {
    const allowedTypes = ["image/jpg", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPG and JPEG is allowed"));
    }
    cb(null, true);
  },
});

module.exports = acceptNewsFile;
