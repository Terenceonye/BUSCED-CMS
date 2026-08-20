require("dotenv").config();

const express = require("express");

const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const multer = require("multer");
const sendEmailRoute = require("./routes/sendEmailRoute");
const faqRoutes = require("./routes/faqRoutes");
const chatRoutes = require("./routes/chatRoutes");

const session = require("express-session");

const connectDB = require("./config/db");

// Connect to MongoDB
connectDB();

const app = express();

// The React CMS authenticates with a Bearer token, but authControllers.login
// also populates req.session.user, which authMiddleware accepts as a fallback.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "my super session secret",
    resave: false,
    saveUninitialized: false,
  }),
);

// Middleware

//ALLOW THE MAIN DOMAIN TO PASS CORS
app.use(cors());
// app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(process.env.UPLOAD_PATH || "uploads"));
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(
  "/uploadedNewsImages",
  express.static(path.join(__dirname, "uploadedNewsImages")),
);

app.use(express.static(path.join(__dirname, "public")));

// Built React CMS (Vite output). Serves index.html at "/" and the hashed
// bundles from /app-assets, which is why the SPA does not use /assets.
app.use(express.static(path.join(__dirname, "public", "app")));

// DASHBOARD ROUTES
app.use("/", require("./routes/dashboardRoutes"));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/schools", require("./routes/facultyRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/program-types", require("./routes/programsTypeRoutes"));
app.use("/api/programs", require("./routes/programRoutes"));
app.use("/api/staff", require("./routes/staffRoutes"));

// Use API routes
app.use("/api/v1", faqRoutes);
app.use("/api/v1", chatRoutes);
app.use("/", sendEmailRoute);

//News Management
app.use("/", require("./routes/newsManangement"));

app.use("/", require("./routes/eventsRoute"));

app.use("/", require("./routes/galleryRoutes"));

app.use("/", require("./routes/heroImagesRoutes"));

app.use("/", require("./routes/authRoutes"));

app.use("/api/v1", require("./routes/accountDeletionRoutes"));

//Site Settings (CMS title & logo)
app.use("/", require("./routes/settingsRoutes"));

//News CRUD used by the React dashboard
app.use("/api/v1/admin/news", require("./routes/newsApiRoutes"));

app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is healthy",
    timestamp: new Date(),
  });
});

// SPA fallback: a GET for a client-side route renders the React app so that
// refreshing or deep-linking works. Anything that looks like a file (it has an
// extension) is left to 404 instead of being answered with HTML, which would
// otherwise mask missing assets and poison caches.
const SPA_INDEX = path.join(__dirname, "public", "app", "index.html");
const NON_SPA_PREFIX =
  /^\/(api|uploads|uploadedNewsImages|app-assets|branding)(\/|$)/;

app.get(/.*/, (req, res, next) => {
  if (NON_SPA_PREFIX.test(req.path)) return next();
  if (path.extname(req.path)) return next();
  if (!req.accepts("html")) return next();
  res.sendFile(SPA_INDEX);
});

// Error handler middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds the 250KB limit.",
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    // Other errors
    return res.status(500).json({ success: false, message: err.message });
  }
  next();
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
