/**
 * JSON news API used by the CMS dashboard.
 *
 * The legacy routes in newsManangement.js are form/EJS based (they redirect and
 * use flash messages), so they cannot drive a SPA. These endpoints are additive
 * and leave the existing public routes untouched.
 */
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const News = require("../models/newsModel");
const acceptNewsFile = require("../config/multerConfigNews");
const { protect } = require("../middlewares/authMiddleware");

const NEWS_DIR = path.join(__dirname, "..", "uploadedNewsImages");

// Strips the empty leading/trailing paragraphs a rich text editor leaves behind.
function cleanEditorHtml(html) {
  if (!html) return "";
  return html.replace(
    /^(<p>(<br\s*\/?>|&nbsp;|\s)*<\/p>)+|(<p>(<br\s*\/?>|&nbsp;|\s)*<\/p>)+$/g,
    "",
  );
}

function removeImageFile(url) {
  if (!url) return;
  const filePath = path.join(NEWS_DIR, path.basename(url));
  fs.promises.unlink(filePath).catch(() => {
    // Already gone - nothing to clean up.
  });
}

// Multer errors must become JSON, not an HTML error page.
const uploadImages = (req, res, next) => {
  acceptNewsFile.array("images", 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

/* --------------------------------- List --------------------------------- */

router.get("/", protect, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const { search, status } = req.query;

    const query = {};
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { newsTag: { $regex: search, $options: "i" } },
      ];
    }

    // countDocuments must use the same filter as find(), otherwise the page
    // count is wrong as soon as a search or status filter is applied.
    const [total, items, activeCount] = await Promise.all([
      News.countDocuments(query),
      News.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      News.countDocuments({ isActive: true }),
    ]);

    res.json({
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        activeCount,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch news", error: error.message });
  }
});

/* -------------------------------- Single -------------------------------- */

router.get("/:id", protect, async (req, res) => {
  try {
    const item = await News.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "News not found" });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Invalid news id", error: error.message });
  }
});

/* -------------------------------- Create -------------------------------- */

router.post("/", protect, uploadImages, async (req, res) => {
  const uploaded = req.files || [];
  try {
    const { title, content, newsTag, isActive } = req.body;

    if (!title || !title.trim() || !content || !content.trim()) {
      uploaded.forEach((f) => removeImageFile(f.filename));
      return res
        .status(400)
        .json({ success: false, message: "Title and content are required." });
    }

    const normalisedTitle = title.trim().toUpperCase();
    const duplicate = await News.findOne({ title: normalisedTitle });
    if (duplicate) {
      uploaded.forEach((f) => removeImageFile(f.filename));
      return res
        .status(409)
        .json({ success: false, message: "A news item with that title already exists." });
    }

    const item = await News.create({
      title: normalisedTitle,
      content: cleanEditorHtml(content),
      newsTag: (newsTag || "GENERAL").trim().toUpperCase(),
      isActive: isActive === "true" || isActive === true,
      images: uploaded.map((file) => ({
        filename: file.filename,
        url: `/uploadedNewsImages/${file.filename}`,
        originalName: file.originalname,
      })),
    });

    res.status(201).json({ success: true, message: "News created", data: item });
  } catch (error) {
    uploaded.forEach((f) => removeImageFile(f.filename));
    res
      .status(500)
      .json({ success: false, message: "Failed to create news", error: error.message });
  }
});

/* -------------------------------- Update -------------------------------- */

router.put("/:id", protect, uploadImages, async (req, res) => {
  const uploaded = req.files || [];
  try {
    const item = await News.findById(req.params.id);
    if (!item) {
      uploaded.forEach((f) => removeImageFile(f.filename));
      return res.status(404).json({ success: false, message: "News not found" });
    }

    const { title, content, newsTag, isActive, removeImages } = req.body;

    if (typeof title === "string" && title.trim()) {
      const normalisedTitle = title.trim().toUpperCase();
      if (normalisedTitle !== item.title) {
        const duplicate = await News.findOne({
          title: normalisedTitle,
          _id: { $ne: item._id },
        });
        if (duplicate) {
          uploaded.forEach((f) => removeImageFile(f.filename));
          return res.status(409).json({
            success: false,
            message: "A news item with that title already exists.",
          });
        }
        item.title = normalisedTitle;
      }
    }

    if (typeof content === "string" && content.trim()) {
      item.content = cleanEditorHtml(content);
    }
    if (typeof newsTag === "string" && newsTag.trim()) {
      item.newsTag = newsTag.trim().toUpperCase();
    }
    if (isActive !== undefined) {
      item.isActive = isActive === "true" || isActive === true;
    }

    // Images the user removed in the editor (JSON array of urls or filenames).
    if (removeImages) {
      let toRemove = [];
      try {
        toRemove = Array.isArray(removeImages)
          ? removeImages
          : JSON.parse(removeImages);
      } catch {
        toRemove = [String(removeImages)];
      }

      const removeSet = new Set(toRemove.map((v) => path.basename(String(v))));
      const kept = [];
      item.images.forEach((img) => {
        if (removeSet.has(path.basename(img.url || img.filename || ""))) {
          removeImageFile(img.url || img.filename);
        } else {
          kept.push(img);
        }
      });
      item.images = kept;
    }

    uploaded.forEach((file) => {
      item.images.push({
        filename: file.filename,
        url: `/uploadedNewsImages/${file.filename}`,
        originalName: file.originalname,
      });
    });

    await item.save();
    res.json({ success: true, message: "News updated", data: item });
  } catch (error) {
    uploaded.forEach((f) => removeImageFile(f.filename));
    res
      .status(500)
      .json({ success: false, message: "Failed to update news", error: error.message });
  }
});

/* ----------------------------- Toggle status ---------------------------- */

router.patch("/:id/status", protect, async (req, res) => {
  try {
    const item = await News.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive === true || req.body.isActive === "true" },
      { new: true },
    );
    if (!item) {
      return res.status(404).json({ success: false, message: "News not found" });
    }
    res.json({ success: true, message: "Status updated", data: item });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update status", error: error.message });
  }
});

/* -------------------------------- Delete -------------------------------- */

router.delete("/:id", protect, async (req, res) => {
  try {
    const item = await News.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    item.images.forEach((img) => removeImageFile(img.url || img.filename));
    await News.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "News deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete news", error: error.message });
  }
});

module.exports = router;
