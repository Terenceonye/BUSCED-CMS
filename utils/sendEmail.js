const nodemailer = require("nodemailer");

exports.sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // e.g., "smtp.mailtrap.io", "smtp.yourdomain.com"
    port: parseInt(process.env.SMTP_PORT, 10), // e.g., 465 (SSL) or 587 (TLS)
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
    from: `"UNIVERSITY OF AGRICULTURE AND ENVIRONMENTAL SCIENCE (UAES), UMUAGWO - cms" <${process.env.EMAIL_USER}>`, // Better to add a name
    to,
    subject,
    html,
  });
};
