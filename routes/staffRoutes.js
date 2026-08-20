const express = require("express");
const router = express.Router();
const controller = require("../controllers/staffControllers");
const uploadProfile = require("../config/multerConfigProfiles");
const { staffValidation } = require("../middlewares/validation");
const parseStaff = require("../middlewares/parseStaff"); // import here
const { protect } = require("../middlewares/authMiddleware");

// GET all staff or by query
router.get("/", controller.getStaff);

// POST new staff
router.post(
  "/",
  protect,
  uploadProfile.single("profileImage"),

  controller.createStaff
);

// PUT update staff
router.put(
  "/:id",
  protect,
  uploadProfile.single("profileImage"),

  controller.updateStaff
);

// DELETE staff
router.delete("/:id", protect, controller.deleteStaff);

module.exports = router;
