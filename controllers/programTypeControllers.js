const ProgramType = require("../models/Programtype");
const mongoose = require("mongoose");

// Create Program Type
exports.createProgramType = async (req, res) => {
  try {
    const { programTypeName } = req.body;

    if (!programTypeName?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Program type name is required" });
    }

    const exists = await ProgramType.findOne({
      programTypeName: {
        $regex: new RegExp(`^${programTypeName.trim()}$`, "i"),
      },
    });

    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Program type already exists" });
    }

    const newType = new ProgramType({
      programTypeName: programTypeName.trim(),
    });
    await newType.save();

    res.status(201).json({
      success: true,
      message: "Program type created successfully",
      data: newType,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Get all Program Types OR one by ID
exports.getProgramTypes = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid ID" });
      }

      const programType = await ProgramType.findById(id);
      if (!programType) {
        return res
          .status(404)
          .json({ success: false, message: "Program type not found" });
      }

      return res.status(200).json({ success: true, data: programType });
    }

    const types = await ProgramType.find().sort("programTypeName");
    res.status(200).json({ success: true, data: types });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Update Program Type
exports.updateProgramType = async (req, res) => {
  try {
    const { id } = req.params;
    const { programTypeName } = req.body;

    if (!programTypeName?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Program type name is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const updated = await ProgramType.findByIdAndUpdate(
      id,
      { programTypeName: programTypeName.trim() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Program type not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Update successful", data: updated });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete Program Type
exports.deleteProgramType = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const deleted = await ProgramType.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Program type not found" });
    }

    res.status(200).json({ success: true, message: "Program type deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
