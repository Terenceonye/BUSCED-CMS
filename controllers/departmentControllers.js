const Department = require("../models/Department");

exports.getAllDepartments = async (req, res) => {
  try {
    const departmentId = req.query.id;
    const schoolId = req.query.schoolId;

    if (departmentId) {
      const department = await Department.findById(departmentId).populate(
        "faculty"
      ).select("-createdAt -updatedAt -__v");
      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }

      return res.json({
        success: true,
        message: "Single department fetched successfully",
        data: department,
      });
    }

    const queryObject = {};
    if (schoolId) {
      queryObject.faculty = schoolId;
    }

    const departments = await Department.find(queryObject).populate("faculty");

    res.json({
      success: true,
      message: "Departments fetched successfully",
      data: departments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
      error: error.message,
    });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const department = new Department(req.body);
    await department.save();
    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create department",
      error: error.message,
    });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update department",
      error: error.message,
    });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete department",
      error: error.message,
    });
  }
};
