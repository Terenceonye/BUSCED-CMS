const mongoose = require("mongoose");

// Defaults used when the CMS has never been configured.
const DEFAULTS = {
  siteTitle: "NetPro CMS",
  logoUrl: "/branding/netpro-logo.png",
  logoSmallUrl: "/branding/netpro-mark.png",
  faviconUrl: "/branding/netpro-favicon.ico",
  authLogoUrl: "/branding/netpro-logo.png",
};

const settingsSchema = new mongoose.Schema(
  {
    // "key" keeps this collection a singleton: only one document can ever exist.
    key: {
      type: String,
      default: "site",
      unique: true,
      immutable: true,
    },
    siteTitle: { type: String, trim: true, default: DEFAULTS.siteTitle },
    logoUrl: { type: String, default: DEFAULTS.logoUrl },
    logoSmallUrl: { type: String, default: DEFAULTS.logoSmallUrl },
    faviconUrl: { type: String, default: DEFAULTS.faviconUrl },
    authLogoUrl: { type: String, default: DEFAULTS.authLogoUrl },
  },
  { timestamps: true },
);

// Single source of truth for the CMS name/logo. Creates the document on first
// call so a fresh install still renders sensible branding.
settingsSchema.statics.getSettings = async function () {
  const settings = await this.findOneAndUpdate(
    { key: "site" },
    { $setOnInsert: DEFAULTS },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return settings;
};

settingsSchema.statics.DEFAULTS = DEFAULTS;

module.exports = mongoose.model("Settings", settingsSchema);
