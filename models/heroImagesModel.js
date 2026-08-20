const mongoose = require("mongoose");

const heroImageSchema = new mongoose.Schema(
  {
    filename: String,
    url: String,
    altText: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("HeroImages", heroImageSchema);
