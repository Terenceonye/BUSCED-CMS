const nodemailer = require("nodemailer");
const Settings = require("../models/settingsModel");

// The sender name comes from the CMS settings so mail matches the dashboard
// branding. Following loadSettings.js, branding is never allowed to be the
// reason a message fails to send - fall back to the theme default instead.
async function senderName() {
  try {
    const { siteTitle } = await Settings.getSettings();
    return siteTitle || Settings.DEFAULTS.siteTitle;
  } catch (err) {
    console.error("Could not load settings for the email sender:", err.message);
    return Settings.DEFAULTS.siteTitle;
  }
}

// siteTitle is editable from the CMS, so strip anything that would break out of
// the quoted display name or inject extra headers.
function quoteName(name) {
  return name
    .replace(/[\r\n]+/g, " ")
    .replace(/["\\]/g, "")
    .trim();
}

exports.sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // e.g., "smtp.mailtrap.io", "smtp.yourdomain.com"
    // Unset lets nodemailer pick from `secure`: 465 for SSL, 587 for TLS.
    port: Number(process.env.EMAIL_PORT) || undefined,
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: `"${quoteName(await senderName())}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
