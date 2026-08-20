const mongoose = require("mongoose");

const accountDeletionSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  reason: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "processed"],
    default: "pending",
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AccountDeletion", accountDeletionSchema);
