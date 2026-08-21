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

// The React CMS is same-origin (Express serves public/app below), so CORS only
// matters for the public site calling /api/v1. A "*" origin cannot be combined
// with credentials, so reflect allowed origins from CORS_ORIGINS instead
// (comma-separated). Unset means allow any origin.
const allowedOrigins = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests, curl and server-to-server calls send no Origin.
      if (!origin) return callback(null, true);
      if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Not allowlisted: drop the CORS headers and let the browser block the
      // response. Erroring here would also 500 the dashboard's own writes,
      // since same-origin POST/PUT/DELETE carry an Origin header too.
      callback(null, false);
    },
    credentials: true,
  }),
);
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

// Endpoints used to be spread across /api/..., /api/v1/... and the site root.
// They are all served from /api/v1 now; these rules rewrite the older paths
// onto the new ones so the public website and any other existing caller keeps
// working. Delete a rule once nothing requests that path any more.
const LEGACY_API_PATHS = [
  // Auth lived at three different prefixes, including an /api/auth/api/... form.
  [/^\/api\/auth\/api\/(forgot-password|verify-otp|reset-password)(?=$|[/?])/, "/api/v1/auth/$1"],
  [/^\/api\/(forgot-password|verify-otp|reset-password)(?=$|[/?])/, "/api/v1/auth/$1"],
  [/^\/api\/auth(?=$|[/?])/, "/api/v1/auth"],
  // The dashboard's protected events endpoint. It cannot become /api/v1/events,
  // which is a different, public handler returning only upcoming events.
  [/^\/api\/events(?=$|[/?])/, "/api/v1/admin/events"],
  // Everything else keeps its name and only gains the version segment.
  [/^\/api\/(?!v1(?=$|[/?]))/, "/api/v1/"],
];

// Auth endpoints that answered at the site root, from the server-rendered
// dashboard. Matched on method as well as path so the React app's own /login
// and /change-password pages (GET) still render.
const LEGACY_ROOT_PATHS = {
  "POST /login": "/api/v1/auth/login",
  "POST /change-password": "/api/v1/auth/change-password",
  "GET /verify": "/api/v1/auth/verify",
};

app.use((req, res, next) => {
  const [pathname, queryString] = req.url.split("?");
  const rootKey = `${req.method} ${pathname}`;

  if (LEGACY_ROOT_PATHS[rootKey]) {
    req.url = LEGACY_ROOT_PATHS[rootKey] + (queryString ? `?${queryString}` : "");
    return next();
  }

  for (const [pattern, replacement] of LEGACY_API_PATHS) {
    if (pattern.test(pathname)) {
      req.url =
        pathname.replace(pattern, replacement) +
        (queryString ? `?${queryString}` : "");
      break;
    }
  }
  next();
});

// DASHBOARD ROUTES
app.use("/api/v1", require("./routes/dashboardRoutes"));

// Every endpoint lives under /api/v1. Paths used before that rule are rewritten
// onto it by the compatibility layer above, so existing callers keep working.
app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/schools", require("./routes/facultyRoutes"));
app.use("/api/v1/departments", require("./routes/departmentRoutes"));
app.use("/api/v1/program-types", require("./routes/programsTypeRoutes"));
app.use("/api/v1/programs", require("./routes/programRoutes"));
app.use("/api/v1/staff", require("./routes/staffRoutes"));

app.use("/api/v1", faqRoutes);
app.use("/api/v1", chatRoutes);
app.use("/api/v1", sendEmailRoute);

//News Management
app.use("/api/v1", require("./routes/newsManangement"));

// Declares both the public /events and the protected /admin/events.
app.use("/api/v1", require("./routes/eventsRoute"));

app.use("/api/v1", require("./routes/galleryRoutes"));

app.use("/api/v1", require("./routes/heroImagesRoutes"));

app.use("/api/v1", require("./routes/accountDeletionRoutes"));

//Site Settings (CMS title & logo)
app.use("/api/v1", require("./routes/settingsRoutes"));

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
