const mongoose = require("mongoose");

const programSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    department: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true,
      },
    ],
    programType: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Programtype",
        required: true,
      },
    ],
    name: { type: String, required: true },
    description: { type: String, required: true },
    level: [
      {
        type: String,
        enum: ["ND", "HND"],
        required: true,
      },
    ],
    requiredCredit: {
      type: Number,
      required: true,
      min: [0, "Credit must be positive"],
    },
    duration: {
      type: String,
      required: true,
    },
    programImage: {
      filename: String,
      url: String,
      originalName: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Program", programSchema);
