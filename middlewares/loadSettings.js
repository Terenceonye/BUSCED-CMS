const Settings = require("../models/settingsModel");

// Makes the CMS branding available to every EJS view as `settings`, so the
// title and logo are read from one place instead of being hardcoded per page.
// Falls back to the theme defaults if the database is unreachable - branding
// should never be the reason a page fails to render.
module.exports = async function loadSettings(req, res, next) {
  try {
    const settings = await Settings.getSettings();
    res.locals.settings = {
      siteTitle: settings.siteTitle,
      logoUrl: settings.logoUrl,
      logoSmallUrl: settings.logoSmallUrl,
      faviconUrl: settings.faviconUrl,
      authLogoUrl: settings.authLogoUrl,
    };
  } catch (err) {
    console.error("Could not load site settings:", err.message);
    res.locals.settings = { ...Settings.DEFAULTS };
  }
  next();
};
