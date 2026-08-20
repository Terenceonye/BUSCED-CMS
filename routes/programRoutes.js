const express = require("express");
const router = express.Router();

const controller = require("../controllers/programControllers");
const acceptFile = require("../config/multerConfig"); // your multer middleware
const { programValidation } = require("../middlewares/validation");
const { protect } = require("../middlewares/authMiddleware");

// GET /programs or /programs?id=123
router.get("/", controller.getPrograms);

// POST /programs (create program) — expect file upload
router.post(
  "/",
  protect,

  acceptFile.single("programImage"),
  programValidation,
  controller.createProgram
);

// PUT /programs/:id (update program) — expect file upload optional
router.put(
  "/:id",
  protect,
  acceptFile.single("programImage"),
  programValidation,
  controller.updateProgram
);

// DELETE /programs/:id — usually no body, so no validation middleware needed
router.delete("/:id", protect, controller.deleteProgram);

module.exports = router;
