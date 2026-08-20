const express = require("express");
const router = express.Router();
const controller = require("../controllers/departmentControllers");
const { departmentValidation } = require("../middlewares/validation");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", controller.getAllDepartments);
router.post("/", protect, departmentValidation, controller.createDepartment);
router.put("/:id", protect, departmentValidation, controller.updateDepartment);
router.delete("/:id", protect, controller.deleteDepartment);

module.exports = router;
