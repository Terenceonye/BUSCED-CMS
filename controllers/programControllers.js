const Program = require("../models/Program");
const path = require("path");
const fs = require("fs"); // Ensure this is included if using fs.unlink

// Create a new program
exports.createProgram = async (req, res) => {
  try {
    const { name, description, requiredCredit, duration, faculty } = req.body;

    const department = Array.isArray(req.body.department)
      ? req.body.department
      : [req.body.department];

    const programType = Array.isArray(req.body.programType)
      ? req.body.programType
      : [req.body.programType];

    const level = Array.isArray(req.body.level)
      ? req.body.level
      : [req.body.level];

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Program Image is required" });
    }

    const programImage = req.file
      ? {
          filename: req.file.filename,
          url: `/uploads/programImages/${req.file.filename}`,
          originalName: req.file.originalname,
        }
      : null;

    const newProgram = new Program({
      name,
      description,
      requiredCredit,
      duration,
      faculty,
      department,
      programType,
      level,
      programImage,
    });

    await newProgram.save();

    res.status(201).json({
      success: true,
      message: "Program created successfully",
      program: newProgram,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to create program",
      error: err.message,
    });
  }
};

// Get all programs or a specific one if ?id= is passed

exports.getPrograms = async (req, res) => {
  try {
    const { id, limit } = req.query;

    if (id) {
      const program = await Program.findById(id)
        .populate("faculty")
        .populate("department")
        .populate("programType");

      if (!program) {
        return res
          .status(404)
          .json({ success: false, message: "Program not found" });
      }

      return res.json({
        success: true,
        program,
      });
    }

    // If limit is provided, return random 'limit' number of programs
    if (limit && !isNaN(limit)) {
      const randomPrograms = await Program.aggregate([
        { $sample: { size: parseInt(limit) } },
      ]);

      // Manually populate since aggregate does not support .populate()
      const populatedPrograms = await Program.populate(randomPrograms, [
        { path: "faculty" },
        { path: "department" },
        { path: "programType" },
      ]);

      return res.json({
        success: true,
        programs: populatedPrograms,
      });
    }

    const programs = await Program.find()
      .populate("faculty")
      .populate("department")
      .populate("programType")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      programs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a program
exports.updateProgram = async (req, res) => {
  try {
    const { name, description, requiredCredit, duration } = req.body;

    const department = Array.isArray(req.body.department)
      ? req.body.department
      : [req.body.department];

    const programType = Array.isArray(req.body.programType)
      ? req.body.programType
      : [req.body.programType];

    const level = Array.isArray(req.body.level)
      ? req.body.level
      : [req.body.level];

    const updateFields = {
      name,
      description,
      requiredCredit,
      duration,
      department,
      programType,
      level,
    };

    if (req.file) {
      updateFields.programImage = {
        filename: req.file.filename,
        url: `/uploads/programImages/${req.file.filename}`,
        originalName: req.file.originalname,
      };
    }

    const updatedProgram = await Program.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!updatedProgram) {
      return res
        .status(404)
        .json({ success: false, message: "Program not found" });
    }

    res.json({ success: true, program: updatedProgram });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a program
exports.deleteProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res
        .status(404)
        .json({ success: false, message: "Program not found" });
    }

    // Delete associated image if it exists
    if (program.programImage && program.programImage.filename) {
      const imagePath = path.join(
        __dirname,
        "..",
        "uploads",
        "programImages",
        program.programImage.filename
      );
      fs.unlink(imagePath, (err) => {
        if (err) console.warn("Failed to delete image:", err.message);
      });
    }

    await Program.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Program deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
