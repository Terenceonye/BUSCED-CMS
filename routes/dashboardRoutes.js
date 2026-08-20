// routes/dashboardRoute.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");

const School = require("../models/Faculty");
const Department = require("../models/Department");
const Program = require("../models/Program");
const ProgramType = require("../models/Programtype");
const Staff = require("../models/Staff");
const GalleryImage = require("../models/galleryModel");
const HeroImage = require("../models/heroImagesModel");
const Event = require("../models/eventsModel");
const News = require("../models/newsModel");
const AIRecord = require("../models/faqModel"); // Assuming you have an AI record model

router.get("/api/dashboard-summary", protect, async (req, res) => {
  try {
    const [
      schoolCount,
      departmentCount,
      programCount,
      programTypeCount,
      staffCount,
      galleryCount,
      heroCount,
      eventCount,
      newsCount,
      aiCount,
    ] = await Promise.all([
      School.countDocuments(),
      Department.countDocuments(),
      Program.countDocuments(),
      ProgramType.countDocuments(),
      Staff.countDocuments(),
      GalleryImage.countDocuments(),
      HeroImage.countDocuments(),
      Event.countDocuments(),
      News.countDocuments(),
      AIRecord.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        schoolCount,
        departmentCount,
        programCount,
        programTypeCount,
        staffCount,
        galleryCount,
        heroCount,
        eventCount,
        newsCount,
        aiCount,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load dashboard summary." });
  }
});

module.exports = router;
