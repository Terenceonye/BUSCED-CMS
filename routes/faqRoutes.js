const express = require("express");
const Faq = require("../models/faqModel");
// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
const Context = require("../models/contextModel");
const he = require("he"); // For HTML entity decoding
const { validateFaq, validateContext } = require("../middlewares/validation");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Authentication Middleware

// 1. Get all FAQs
router.get("/faqs", protect, async (req, res) => {
  try {
    const faqs = await Faq.find().sort({ updatedAt: -1 });
    res.json({ success: true, faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching FAQs" });
  }
});

// 2. Get a single FAQ by ID
router.get("/faqs/:id", protect, async (req, res) => {
  try {
    const faq = await Faq.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: "Error fetching FAQ" });
  }
});

// 3. Create a new FAQ
router.post("/faqs", protect, validateFaq, async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    const newFaq = new Faq({
      question,
      answer,
    });

    await newFaq.save();
    res.status(201).json({ success: true, message: "Faq addes successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating FAQ" });
  }
});

// 4. Update an existing FAQ
router.put("/faqs/:id", protect, validateFaq, async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    const updatedFaq = await Faq.findByIdAndUpdate(
      req.params.id,
      { question, answer },
      { new: true } // Return the updated FAQ
    );

    if (!updatedFaq) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    res.json({ success: true, message: "Faq item updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating FAQ" });
  }
});

// 5. Delete an FAQ
router.delete("/faqs/:id", protect, async (req, res) => {
  try {
    const deletedFaq = await Faq.findByIdAndDelete(req.params.id);

    if (!deletedFaq) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    res.json({ success: true, message: "FAQ deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting FAQ" });
  }
});

// 6. Get context
router.get("/context", protect, async (req, res) => {
  try {
    const context = await Context.findOne(); // Assuming only one context document exists
    console.log("The context is", context);
    if (!context) {
      return res
        .status(200)
        .json({ success: true, message: "PLEASE PROVIDE A CONTEXT INFORMATION" });
    }
    res.json({ success: true, context: he.decode(context.content) });
  } catch (error) {
    console.error("Error fetching context:", error);
    res.status(500).json({ success: false, message: "Error fetching context" });
  }
});

// 7. Update Context
router.put("/context", protect, validateContext, async (req, res) => {
  const { context } = req.body;
  if (!context || context.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Context cannot be empty" });
  }

  try {
    let DBcontext = await Context.findOne();
    if (DBcontext) {
      DBcontext.content = context; // ✅ update the field, not the whole object

      console.log("The DBcontext is", DBcontext);
      await DBcontext.save();
    } else {
      DBcontext = new Context({ content: context }); // ✅ match the model field
      await DBcontext.save();
    }

    res.json({ success: true, message: "Context updated successfully" });
  } catch (error) {
    console.error("Error updating context:", error);
    res.status(500).json({ success: false, message: "Error updating context" });
  }
});

module.exports = router;
