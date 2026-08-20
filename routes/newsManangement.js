/**
 * Public, read-only news API.
 *
 * The CMS itself uses routes/newsApiRoutes.js (/api/v1/admin/news). These
 * endpoints stay for any external consumer (website or mobile app) that reads
 * published news.
 */
const express = require("express");
const router = express.Router();
const News = require("../models/newsModel");

// Shared list handler: ?id= returns one item, otherwise a paginated list.
function listNews(baseQuery = {}) {
  return async (req, res) => {
    try {
      const { id } = req.query;

      if (id) {
        const newsItem = await News.findById(id);
        if (!newsItem) {
          return res
            .status(404)
            .json({ success: false, message: "News not found" });
        }
        return res.json({ news: newsItem });
      }

      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 10, 1),
        100,
      );

      const query = { ...baseQuery };
      if (req.query.filter === "active") query.isActive = true;
      if (req.query.search) {
        query.$or = [
          { title: { $regex: req.query.search, $options: "i" } },
          { content: { $regex: req.query.search, $options: "i" } },
        ];
      }

      // Count with the same filter as the query, so paging stays correct
      // once a search or status filter is applied.
      const [total, news] = await Promise.all([
        News.countDocuments(query),
        News.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
      ]);

      res.json({ success: true, total, page, news });
    } catch (error) {
      console.error("Error fetching news (API):", error);
      res.status(500).json({ success: false, message: "Failed to fetch news" });
    }
  };
}

// All news
router.get("/api/v1/news", listNews());

// Published news only
router.get("/api/v1/news/active", listNews({ isActive: true }));

module.exports = router;
