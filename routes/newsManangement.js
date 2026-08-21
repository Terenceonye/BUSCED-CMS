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
        // The base filter has to apply here too. Looking up by id alone would
        // keep an unpublished article readable even once it is gone from the
        // list, which is the same leak by a different route.
        const newsItem = await News.findOne({ ...baseQuery, _id: id });
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

// Both routes are unauthenticated, so both return published articles only.
// Unpublished work is reachable through the authenticated dashboard API
// (/api/v1/admin/news?status=inactive), never from here.
router.get("/news", listNews({ isActive: true }));

// Kept as an explicit alias for callers already pointing at it.
router.get("/news/active", listNews({ isActive: true }));

module.exports = router;
