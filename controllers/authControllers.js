const User = require("../models/User");
const { sendEmail } = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Settings = require("../models/settingsModel");

// Secret key and optional token expiry duration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN; // Token valid for 1 day

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role || "user" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    // Set session for form-based auth
    req.session.user = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    // Send token for client-side JS (stored in localStorage)
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Login failed", error: err.message });
  }
};

// FORGOT PASSWORD (send OTP)
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Email not found" });

    const otp = crypto.randomInt(1000, 9999).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Branding comes from the CMS settings so the email matches the dashboard.
    const settings = await Settings.getSettings();
    const brand = settings.siteTitle;

    sendEmail(
      email,
      "Your OTP Code",
      `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h2 style="color: #1f7fc4; margin: 0;">${brand}</h2>
      <p style="color: #666; font-size: 14px; margin-top: 6px;">OTP Verification Code</p>
    </div>

    <p style="font-size: 16px; color: #333;">
      Hello,</p>
    <p style="font-size: 16px; color: #333;">
      Use the One-Time Password (OTP) below to continue your password reset process. This code is valid for 10 minutes.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; padding: 12px 24px; font-size: 28px; font-weight: bold; color: #1f7fc4; background-color: #eef6fc; border-radius: 8px; letter-spacing: 8px; border: 1px dashed #1f7fc4;">
        ${otp}
      </div>
    </div>

    <p style="font-size: 14px; color: #555;">
      If you did not request this code, you can safely ignore this email.
    </p>

    <p style="font-size: 14px; color: #888; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
      ${brand}<br />
      &copy; ${new Date().getFullYear()} All rights reserved.
    </p>
  </div>
  `,
    );

    res.status(200).json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: err.message,
    });
  }
};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    res.status(200).json({ success: true, message: "OTP verified" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: err.message,
    });
  }
};

// CHANGE PASSWORD (signed-in user, verified with the current password)
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // protect() populates req.user from either the JWT or the session.
    const userId = req.user && (req.user.id || req.user._id);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const matches = await user.comparePassword(currentPassword);
    if (!matches) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password",
      });
    }

    // The User model hashes on save, so assign the plain value.
    user.password = newPassword;
    // Any outstanding reset code is no longer valid.
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: err.message,
    });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Password reset failed",
      error: err.message,
    });
  }
};
