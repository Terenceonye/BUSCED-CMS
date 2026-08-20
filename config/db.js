const mongoose = require("mongoose");
const User = require("../models/User");

const createDefaultAdmin = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const email = "onyeweketerence@gmail.com";
      const password = "Admin@321"; // Strong default password

      const admin = new User({
        email,
        password,
        role: "admin",
      });

      await admin.save();
      console.log(`✅ Default admin user created (${email} / ${password})`);
    } else {
      console.log("👤 Admin already exist. Skipping admin seeding.");
    }
  } catch (err) {
    console.error("❌ Failed to create default admin:", err.message);
  }
};

// The database is remote, so the initial handshake can take a few seconds and
// an occasional blip is normal. Retry with backoff instead of exiting on the
// first failure, which would otherwise take the whole server down for good.
const MAX_ATTEMPTS = 5;

let listenersBound = false;
const bindConnectionLogging = () => {
  if (listenersBound) return;
  listenersBound = true;

  // Once connected, the driver reconnects on its own - just make it visible.
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected - the driver will keep retrying.");
  });
  mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB reconnected.");
  });
  mongoose.connection.on("error", (err) => {
    console.error("⚠️  MongoDB error:", err.message);
  });
};

const connectDB = async (attempt = 1) => {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set. Add it to your .env file.");
    process.exit(1);
  }

  try {
    bindConnectionLogging();

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    await createDefaultAdmin(); // Run after DB connection
  } catch (error) {
    console.error(
      `❌ MongoDB connection error (attempt ${attempt}/${MAX_ATTEMPTS}):`,
      error.message,
    );

    if (attempt >= MAX_ATTEMPTS) {
      // Exit so a process manager (pm2/systemd) restarts us cleanly.
      console.error("❌ Could not reach MongoDB. Giving up.");
      process.exit(1);
    }

    const delayMs = Math.min(30000, 2000 * 2 ** (attempt - 1));
    console.log(`↻ Retrying in ${delayMs / 1000}s...`);
    setTimeout(() => connectDB(attempt + 1), delayMs);
  }
};

module.exports = connectDB;
