const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const GalleryImage = require("../models/galleryModel");
const acceptGalleryImage = require("../config/multerConfigGallerry");
const { protect } = require("../middlewares/authMiddleware");

// Gallery screens are rendered by the React CMS; this router is API only.

// Upload new image
router.post(
  "/api/gallery",
  protect,
  acceptGalleryImage.single("image"),
  async (req, res) => {
    try {
      const { altText } = req.body;
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded." });
      }

      const newImage = new GalleryImage({
        filename: req.file.filename,
        url: `/uploads/galleryImages/${req.file.filename}`,
        altText: altText || req.file.originalname,
      });

      const saved = await newImage.save();
      res.status(201).json({ success: true, image: saved });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "Failed to upload image." });
    }
  }
);

// Fetch images (Public route also used inside admin panel)
router.get("/api/gallery", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // images per page
    const skip = (page - 1) * limit;

    const [images, total] = await Promise.all([
      GalleryImage.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      GalleryImage.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      images,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch images.",
    });
  }
});

// Delete image
router.delete("/api/gallery/:id", protect, async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id);
    if (!image) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found." });
    }

    const filePath = path.join(
      __dirname,
      "..",
      "public",
      image.url.replace(/^\/+/, "")
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await GalleryImage.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Image deleted." });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete image." });
  }
});

module.exports = router;
