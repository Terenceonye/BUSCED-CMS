function parseStaff(req, res, next) {
  try {
    let staff = req.body.staff;

    if (!staff) {
      return next(); // Nothing to parse
    }

    // If already parsed (object), just continue
    if (typeof staff === "object") {
      return next();
    }

    // If not a string, throw error
    if (typeof staff !== "string") {
      throw new Error("staff field must be a JSON string");
    }

    // Try to parse
    const parsed = JSON.parse(staff);

    // Normalize multiselect fields to arrays
    const ensureArray = (field) => {
      if (parsed[field] && !Array.isArray(parsed[field])) {
        parsed[field] = [parsed[field]];
      }
    };
    ["department", "program"].forEach(ensureArray);

    req.body.staff = parsed;
    next();
  } catch (err) {
    console.error("Failed to parse staff JSON:", err);
    res.status(400).json({
      success: false,
      message: "Invalid JSON in staff field.",
      error: err.message,
    });
  }
}

module.exports = parseStaff;
