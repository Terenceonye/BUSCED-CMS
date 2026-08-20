const express = require("express");
const router = express.Router();
const AccountDeletion = require("../models/accountDeletionModel");

router.post("/request-account-deletion", async (req, res) => {
  const { fullName, email, reason } = req.body;

  try {
    const request = new AccountDeletion({
      fullName,
      email,
      reason,
    });

    await request.save();

    res.status(201).json({
      success: true,
      message: "Your account deletion request has been received.",
    });
  } catch (err) {
    console.error("Error saving account deletion request:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
});

module.exports = router;
