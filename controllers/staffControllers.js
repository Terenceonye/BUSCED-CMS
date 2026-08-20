const Staff = require("../models/Staff");
const path = require("path");
const fs = require("fs");

const xlsx = require("xlsx");

//Function to generate a unique ID number for staff in the form 1000-UISTO-1247-613X
// const generateIdNumber = async () => {
//   const prefix = "1000-UISTO-";
//   const randomPart = Math.floor(Math.random() * 10000); // Generates a number between 0 and 9999
//   const suffix = Math.random().toString(36).substring(2, 6).toUpperCase(); // Generates a random string of 4 uppercase letters

//   const existingStaff = await Staff.findOne({
//     idNumber: `${prefix}${randomPart}-${suffix}`,
//   });

//   if (existingStaff) {
//     return generateIdNumber(); // Recursively generate a new ID if it already exists
//   }

//   return `${prefix}${randomPart}-${suffix}`;
// };

// CREATE staff
exports.createStaff = async (req, res) => {
  try {
    const parsedStaff = JSON.parse(req.body.staff);

    // Check for duplicates
    const existingEmail = await Staff.findOne({ email: parsedStaff.email });
    if (existingEmail) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists." });
    }

    const existingPhone = await Staff.findOne({ phone: parsedStaff.phone });
    if (existingPhone) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number already exists." });
    }

    const staffData = {
      ...parsedStaff,
      profileImage: req.file
        ? {
            filename: req.file.filename,
            url: `/uploads/profileImages/${req.file.filename}`,
            originalName: req.file.originalname,
          }
        : null,
      //idNumber: generateIdNumber(),
    };

    console.log("Staff Data:", staffData);
    const newStaff = new Staff(staffData);
    await newStaff.save();

    res.status(201).json({
      success: true,
      message: "Staff created successfully",
      staff: newStaff,
    });
  } catch (err) {
    console.error("Create Staff Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create staff",
      error: err.message,
    });
  }
};

// GET all staff, a single staff via ?id=staffId, or department staff via ?id=departmentId&onlystaff=true
exports.getStaff = async (req, res) => {
  try {
    const { id, onlystaff } = req.query;

    // Case: Fetch only limited staff info by department
    if (onlystaff === "true" && id) {
      const staffList = await Staff.find({ department: { $in: [id] } })
        .select("fullName email position specialization profileImage about")
        .sort({ createdAt: -1 });

      return res.json({ success: true, data: staffList });
    }

    // Case: Fetch a single staff by ID
    if (id) {
      const staff = await Staff.findById(id)
        .populate("faculty")
        .populate("department")
        .populate("program");
      id;

      if (!staff) {
        return res
          .status(404)
          .json({ success: false, message: "Staff not found" });
      }

      return res.json({ success: true, staff });
    }

    // Case: Fetch all staff
    const allStaff = await Staff.find()
      .populate("faculty")
      .populate("department")
      .populate("program")
      .sort({ createdAt: -1 });

    res.json({ success: true, staff: allStaff });
  } catch (err) {
    console.error("Get Staff Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff",
      error: err.message,
    });
  }
};

// UPDATE staff

exports.updateStaff = async (req, res) => {
  try {
    const parsedStaff = JSON.parse(req.body.staff);

    // Step 1: Get the existing staff document
    const existingStaff = await Staff.findById(req.params.id);
    if (!existingStaff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });
    }

    // Step 2: Check for email uniqueness (if email is being changed)
    if (parsedStaff.email && parsedStaff.email !== existingStaff.email) {
      const emailExists = await Staff.findOne({
        email: parsedStaff.email,
        _id: { $ne: req.params.id }, // exclude current staff
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists for another staff member",
        });
      }
    }

    // Step 3: Check for phone uniqueness (if phone is being changed)
    if (parsedStaff.phone && parsedStaff.phone !== existingStaff.phone) {
      const phoneExists = await Staff.findOne({
        phone: parsedStaff.phone,
        _id: { $ne: req.params.id }, // exclude current staff
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists for another staff member",
        });
      }
    }

    // Step 4: Handle profileImage logic
    if (req.file) {
      parsedStaff.profileImage = {
        filename: req.file.filename,
        url: `/uploads/profileImages/${req.file.filename}`,
        originalName: req.file.originalname,
      };
    } else {
      parsedStaff.profileImage = existingStaff.profileImage || null;
    }

    // Step 5: Update the staff document
    const updatedStaff = await Staff.findByIdAndUpdate(
      req.params.id,
      parsedStaff,
      { new: true }
    );

    res.json({
      success: true,
      message: "Staff updated successfully",
      staff: updatedStaff,
    });
  } catch (err) {
    console.error("Update Staff Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update staff",
      error: err.message,
    });
  }
};

// DELETE staff
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });
    }

    // Remove profile image from filesystem
    if (staff.profileImage?.filename) {
      const filePath = path.join(
        __dirname,
        "..",
        "public",
        "uploads",
        "profileImages",
        staff.profileImage.filename
      );
      fs.unlink(filePath, (err) => {
        if (err) console.warn("Profile image deletion failed:", err.message);
      });
    }

    await Staff.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Staff deleted successfully" });
  } catch (err) {
    console.error("Delete Staff Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete staff",
      error: err.message,
    });
  }
};

// BULK UPLOAD STAFF FROM EXCEL
exports.uploadStaffExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const filePath = path.resolve(
      __dirname,
      "../uploads/temp",
      req.file.filename
    );
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res
        .status(400)
        .json({ success: false, message: "Excel file is empty" });
    }

    const createdStaff = [];
    const errors = [];

    for (const row of rows) {
      try {
        const {
          fullName,
          email,
          phone,
          title,
          position,
          specialization,
          affiliation,
        } = row;

        if (!email || !phone || !fullName) {
          errors.push({ row: row, reason: "Missing required fields" });
          continue;
        }

        const emailExists = await Staff.findOne({ email });
        if (emailExists) {
          errors.push({ row: row, reason: "Email already exists" });
          continue;
        }

        const phoneExists = await Staff.findOne({ phone });
        if (phoneExists) {
          errors.push({ row: row, reason: "Phone number already exists" });
          continue;
        }

        const staff = new Staff({
          fullName,
          email,
          phone,
          title,
          position,
          specialization: specialization?.split(",") || [],
          affiliation,
          idNumber: generateIdNumber(),
        });

        await staff.save();
        createdStaff.push(staff);
      } catch (err) {
        errors.push({ row: row, reason: err.message });
      }
    }

    // Clean up file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: `${createdStaff.length} staff uploaded successfully.`,
      createdCount: createdStaff.length,
      failedCount: errors.length,
      errors,
    });
  } catch (err) {
    console.error("Bulk Upload Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload staff from Excel",
      error: err.message,
    });
  }
};
