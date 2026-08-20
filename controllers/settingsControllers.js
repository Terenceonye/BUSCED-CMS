const fs = require("fs");
const path = require("path");
const Settings = require("../models/settingsModel");

// Only files we uploaded ourselves may be cleaned up. Anything shipped with the
// theme (e.g. /assets/img/logo.jpg) must survive a logo replacement.
const MANAGED_PREFIX = "/uploads/settingsImages/";

const removeManagedFile = (url) => {
  if (!url || !url.startsWith(MANAGED_PREFIX)) return;
  const filePath = path.join(__dirname, "..", "public", url.replace(/^\/+/, ""));
  fs.promises.unlink(filePath).catch(() => {
    // File already gone - nothing to clean up.
  });
};

// GET /api/settings - public so login/auth pages can read branding too.
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      message: "Settings fetched successfully",
      data: {
        siteTitle: settings.siteTitle,
        logoUrl: settings.logoUrl,
        logoSmallUrl: settings.logoSmallUrl,
        faviconUrl: settings.faviconUrl,
        authLogoUrl: settings.authLogoUrl,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};

// PUT /api/settings - updates the title and any uploaded branding images.
exports.updateSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const files = req.files || {};

    const { siteTitle } = req.body;
    if (typeof siteTitle === "string") {
      const trimmed = siteTitle.trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          message: "Site title cannot be empty.",
        });
      }
      if (trimmed.length > 120) {
        return res.status(400).json({
          success: false,
          message: "Site title cannot exceed 120 characters.",
        });
      }
      settings.siteTitle = trimmed;
    }

    // Map upload field name -> settings field it replaces.
    const imageFields = {
      logo: "logoUrl",
      logoSmall: "logoSmallUrl",
      favicon: "faviconUrl",
      authLogo: "authLogoUrl",
    };

    const replaced = [];
    for (const [field, target] of Object.entries(imageFields)) {
      const uploaded = files[field] && files[field][0];
      if (!uploaded) continue;

      replaced.push(settings[target]);
      settings[target] = `/uploads/settingsImages/${uploaded.filename}`;
    }

    await settings.save();

    // Drop the old files only once the new values are safely persisted.
    replaced.forEach(removeManagedFile);

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: {
        siteTitle: settings.siteTitle,
        logoUrl: settings.logoUrl,
        logoSmallUrl: settings.logoSmallUrl,
        faviconUrl: settings.faviconUrl,
        authLogoUrl: settings.authLogoUrl,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
      error: error.message,
    });
  }
};

// POST /api/settings/reset-image - restores one image back to the theme default.
exports.resetImage = async (req, res) => {
  try {
    const { field } = req.body;
    const allowed = ["logoUrl", "logoSmallUrl", "faviconUrl", "authLogoUrl"];

    if (!allowed.includes(field)) {
      return res
        .status(400)
        .json({ success: false, message: "Unknown settings image." });
    }

    const settings = await Settings.getSettings();
    const previous = settings[field];

    settings[field] = Settings.DEFAULTS[field];
    await settings.save();

    removeManagedFile(previous);

    res.json({
      success: true,
      message: "Image reset to default",
      data: { [field]: settings[field] },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reset image",
      error: error.message,
    });
  }
};
