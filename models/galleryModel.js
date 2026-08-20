const mongoose = require("mongoose");

const galleryImageSchema = new mongoose.Schema(
  {
    filename: String,
    url: String,
    altText: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("GalleryImage", galleryImageSchema);
