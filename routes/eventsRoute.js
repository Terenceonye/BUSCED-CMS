const express = require("express");
const router = express.Router();
const Event = require("../models/eventsModel");
const { protect } = require("../middlewares/authMiddleware");

// Event screens are rendered by the React CMS; this router is API only.

// Add event
router.post("/api/events", protect, async (req, res) => {
  try {
    const { title, description, date, startTime, endTime, location } = req.body;
    const event = new Event({
      title,
      description,
      date,
      startTime,
      endTime,
      location,
    });
    await event.save();
    res.status(201).json({ message: "Event created", event });
  } catch (error) {
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Update event
router.put("/api/events/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, startTime, endTime, location } = req.body;

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { title, description, date, startTime, endTime, location },
      { new: true },
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found." });
    }

    res.json({ message: "Event updated", event: updatedEvent });
  } catch (error) {
    res.status(500).json({ message: "Error updating event." });
  }
});

// Delete event
router.delete("/api/events/:id", protect, async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// Get all events or single by ?id=
// GET all events with pagination or a single event by ?id=
router.get("/api/events", protect, async (req, res) => {
  try {
    const { id, page = 1, limit = 6 } = req.query;

    if (id) {
      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      return res.json({ event });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const events = await Event.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Event.countDocuments();

    res.json({ events, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch events." });
  }
});

//=====================================================================
//Public API to get all events
//=====================================================================
router.get("/api/v1/events", async (req, res) => {
  try {
    const { id, page = 1, limit = 6 } = req.query;

    if (id) {
      const event = await Event.findById(id);
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }
      return res.json({ success: true, event });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const today = new Date();

    const events = await Event.find({ date: { $gte: today } })
      .sort({ date: 1 }) // soonest first
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Event.countDocuments({ date: { $gte: today } });

    res.json({ success: true, events, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events." + err.message,
    });
  }
});

module.exports = router;
