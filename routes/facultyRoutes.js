const express = require("express");
const router = express.Router();
const controller = require("../controllers/facultyControllers");
const { facultyValidation } = require("../middlewares/validation");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", controller.getAllFaculties);
router.post("/", protect, facultyValidation, controller.createFaculty);
router.put("/:id", protect, facultyValidation, controller.updateFaculty);
router.delete("/:id", protect, controller.deleteFaculty);

module.exports = router;
