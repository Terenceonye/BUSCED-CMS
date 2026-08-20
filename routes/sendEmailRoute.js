const express = require("express");
const nodemailer = require("nodemailer");

const NewsLetter = require("../models/newsLetterModel");

const router = express.Router();

router.post("/api/v1/contact", async (req, res) => {
  const { fullName, email, subject, message } = req.body;

  // Basic validation
  if (!fullName || !email || !subject || !message) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  // Email Regex Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address.",
    });
  }

  if (subject.length <= 15) {
    return res.status(400).json({
      success: false,
      message: "Your subject must be more than 15 characters.",
    });
  }

  if (message.length <= 30) {
    return res.status(400).json({
      success: false,
      message: "Your message must be more than 30 characters.",
    });
  }

  try {
    // Respond immediately
    res
      .status(200)
      .json({ success: true, message: "Message sent successfully!" });

    // Run email sending in background
    setImmediate(async () => {
      try {
        // Set up Nodemailer SMTP transporter
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT, 10),
          secure: process.env.EMAIL_SECURE === "true",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },

          logger: true,
          debug: true,
        });

        // Email options
        const mailOptions = {
          from: `"Website Contact" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_RECEIVER,
          subject: `New Message from ${fullName} - ${subject}`,
          text: `You received a message from your website contact form:\n\nName: ${fullName}\nEmail: ${email
            .toLowerCase()
            .trim()}\nSubject: ${subject}\nMessage:\n${message}`,
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        console.log("Email sent successfully");
      } catch (error) {
        console.error("Email sending failed:", error);
      }
    });
  } catch (error) {
    console.error("Request failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to process request." });
  }
});

router.post("/api/v1/subscribe-newsletter", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  // Email Regex Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address.",
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const emailExists = await NewsLetter.findOne({ email: normalizedEmail });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "You are already subscribed to our newsletter.",
      });
    }

    const newSubscriber = new NewsLetter({ email: normalizedEmail });
    await newSubscriber.save();

    res.status(200).json({
      success: true,
      message: "Successfully subscribed to the newsletter.",
    });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({
      success: false,
      message:
        "There was an error processing your subscription. Please try again later.",
      error: process.env.ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
