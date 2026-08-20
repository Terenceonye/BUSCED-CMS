const mongoose = require("mongoose");

const ContextSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      default: "PLEASE UPDATE THE CONTEXT INFORMATION",
    },
  },
  {
    timestamps: true,
  }
);

// 🔍 Add full-text index for search
ContextSchema.index({ content: "text" });

module.exports = mongoose.model("Context", ContextSchema);
