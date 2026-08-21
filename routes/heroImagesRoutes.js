const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const HeroImage = require("../models/heroImagesModel");
const acceptHeroImage = require("../config/multerConfigHero");
const { protect } = require("../middlewares/authMiddleware");

// Hero image screens are rendered by the React CMS; this router is API only.

// Upload new image
router.post(
  "/hero-image",
  protect,
  acceptHeroImage.single("image"),
  async (req, res) => {
    try {
      const { altText } = req.body;
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded." });
      }

      const newImage = new HeroImage({
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
  },
);

// Fetch images (Public route also used inside admin panel)
router.get("/hero-images", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // images per page
    const skip = (page - 1) * limit;

    const [images, total] = await Promise.all([
      HeroImage.find()
        .sort({ createdAt: -1 })
        .select("-updatedAt -createdAt -__v")
        .skip(skip)
        .limit(limit),
      HeroImage.countDocuments(),
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
router.delete("/hero-image/:id", protect, async (req, res) => {
  try {
    const image = await HeroImage.findById(req.params.id);
    if (!image) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found." });
    }

    const filePath = path.join(
      __dirname,
      "..",
      "public",
      image.url.replace(/^\/+/, ""),
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await HeroImage.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Image deleted." });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete image." });
  }
});

module.exports = router;
