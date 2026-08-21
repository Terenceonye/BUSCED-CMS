const express = require("express");
const router = express.Router();
const controller = require("../controllers/settingsControllers");
const acceptSettingsImage = require("../config/multerConfigSettings");
const { protect } = require("../middlewares/authMiddleware");

// Admin page
// Read is public: the login/OTP pages and the website need the branding.
router.get("/settings", controller.getSettings);

router.put(
  "/settings",
  protect,
  acceptSettingsImage.fields([
    { name: "logo", maxCount: 1 },
    { name: "logoSmall", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "authLogo", maxCount: 1 },
  ]),
  controller.updateSettings,
);

router.post("/settings/reset-image", protect, controller.resetImage);

module.exports = router;
