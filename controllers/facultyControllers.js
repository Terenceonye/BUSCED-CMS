const Faculty = require("../models/Faculty");
const { exists } = require("../models/User");

exports.getAllFaculties = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      // Get single faculty by id
      const faculty = await Faculty.findById(id).select(
        "-updatedAt -createdAt -__v",
      );
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty not found",
        });
      }
      return res.json({
        success: true,
        message: "Faculty fetched successfully",
        data: faculty,
      });
    } else {
      // Get all faculties
      const faculties = await Faculty.find().select("-createdAt -updatedAt -__v");
      return res.json({
        success: true,
        message: "Faculties fetched successfully",
        data: faculties,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty(s)",
      error: error.message,
    });
  }
};

exports.createFaculty = async (req, res) => {
  try {
    const facultyExists = await Faculty.findOne({
      name: { $regex: `^${req.body.name}$`, $options: "i" }, // case-insensitive exact match
    });

    if (facultyExists) {
      return res
        .status(400)
        .json({ success: false, message: "School name already exists." });
    }

    const faculty = new Faculty(req.body);
    await faculty.save();

    res.status(201).json({
      success: true,
      message: "School created successfully",
      data: faculty,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create school",
      error: error.message,
    });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    console.log(req.body.name);
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    res.json({
      success: true,
      message: "School updated successfully",
      data: faculty,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update school",
      error: error.message,
    });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Shool not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Faculty deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete faculty",
      error: error.message,
    });
  }
};
