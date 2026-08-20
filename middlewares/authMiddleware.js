// const jwt = require("jsonwebtoken");
// const JWT_SECRET = process.env.JWT_SECRET;

// exports.protect = (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {

//     return res.status(401).redirect("/adminlogin");
//   }

//   const token = authHeader.split(" ")[1];
//   console.log("Then token is", token);
//   console.log("authheader", authHeader);
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//     console.log("The decoded is", decoded);
//     req.user = decoded; // Add user info to request

//     next();
//   } catch (err) {
//     res.status(401).json({ success: false, message: "Invalid token" });
//   }
// };

//THIS WILL BE USED FOR BOTH API AND FORM-BASED AUTHENTICATION BECAUSE IT CHECKS FOR JWT IN THE HEADER AND SESSION IN THE REQUEST OBJECT

// THIS IS BECAUSE THE APPLICATION WAS BUILT FROM COMBININING DIFFERENT SUB APPLICATIONS WHICH I HAVE BUILT BEFORE USING 2 DIFFERENT AUTHENTICATION METHODS

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check for Bearer token (API routes)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Attach decoded JWT payload
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  }

  // 2. Check for session (form-based routes)
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  // 3. If neither is valid
  const isApiRequest = req.originalUrl.startsWith("/api");
  if (isApiRequest) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  } else {
    return res.redirect("/adminlogin");
  }
};
