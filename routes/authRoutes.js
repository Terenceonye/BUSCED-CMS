const express = require("express");
const router = express.Router();
const authController = require("../controllers/authControllers");
const { protect } = require("../middlewares/authMiddleware");
const {
  validateLogin,
  validateForgotPassword,
  validateVerifyOtp,
  validateResetPassword,
  validatePasswordUpdate,
} = require("../middlewares/validation");

// Auth screens are rendered by the React CMS; this router is API only.

// @route   POST /api/auth/login
router.post("/login", validateLogin, authController.login);

// @route   POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  validateForgotPassword,
  authController.forgotPassword
);

// @route   POST /api/auth/verify-otp
router.post("/verify-otp", validateVerifyOtp, authController.verifyOtp);

// @route   POST /api/auth/reset-password
router.post(
  "/reset-password",
  validateResetPassword,
  authController.resetPassword
);

// @route   POST /api/auth/change-password  (signed-in user)
router.post(
  "/change-password",
  protect,
  validatePasswordUpdate,
  authController.changePassword,
);

router.get("/verify", protect, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

module.exports = router;
