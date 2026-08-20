const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      toUpperCase: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    newsTag: {
      type: String,

      trim: true,
      default: "GENERAL",
    },
    images: [
      {
        filename: String,
        url: String,
        originalName: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("News", newsSchema);
