const express = require("express");
const router = express.Router();
const {
  createProgramType,
  getProgramTypes,
  updateProgramType,
  deleteProgramType,
} = require("../controllers/programTypeControllers");
const { programTypeValidation } = require("../middlewares/validation");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", protect, getProgramTypes);
router.post("/", protect, programTypeValidation, createProgramType);
router.put("/:id", protect, programTypeValidation, updateProgramType);
router.delete("/:id", protect, deleteProgramType);

module.exports = router;
