const mongoose = require("mongoose");

const programTypeSchema = new mongoose.Schema(
  {
    programTypeName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Programtype", programTypeSchema);
