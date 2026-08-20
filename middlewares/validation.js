const { body, validationResult } = require("express-validator");

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  console.log("Validation Errors:", errors.array());
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: errors.array().map((msg) => msg.msg),
    });
  }
  next();
};

// Login validation
const validateLogin = [
  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

// Forgot password validation
const validateForgotPassword = [
  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Valid email required"),
  validate,
];

// OTP verification validation
const validateVerifyOtp = [
  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Valid email required"),
  body("otp")
    .trim()
    .isLength({ min: 4, max: 4 })
    .withMessage("OTP must be 4 digits"),
  validate,
];

// Reset password validation
const validateResetPassword = [
  body("email")
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Valid email required"),
  body("otp")
    .trim()
    .isLength({ min: 4, max: 4 })
    .withMessage("OTP must be 4 digits"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
  validate,
];

// Faculty validation
const facultyValidation = [
  body("name")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("School name is required")
    .isLength({ min: 3 })
    .withMessage("School name must be at least 3 characters long"),
  body("description")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("School description is required")
    .isLength({ min: 10, max: 50 })
    .withMessage("School description must be between 10 and 50 characters"),
  validate,
];

// Department validation
const departmentValidation = [
  body("name")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Department name is required")
    .isLength({ min: 3 })
    .withMessage("Department name must be at least 3 characters long"),
  body("faculty")
    .trim()
    .isMongoId()
    .withMessage("Valid Faculty ID is required"),
  body("structure")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 1000 })
    .withMessage("Structure must be maximum 1000 characters"),
  body("mission")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 1000 })
    .withMessage("Mission must be maximum 1000 characters"),

  body("researchFocus")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 1000 })
    .withMessage("Research Focus must be maximum 1000 characters"),
  validate,
];

// Program type validation
const programTypeValidation = [
  body("programTypeName")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Program type name is required")
    .isLength({ min: 3 })
    .withMessage("Program type must be at least 3 characters long"),
  validate,
];

const programValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Program name is required")
    .isLength({ min: 3 })
    .withMessage("Program name must be at least 3 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Program description is required")
    .isLength({ max: 1000 })
    .withMessage("Description must be at most 1000 characters"),

  // Normalize single values to arrays

  body("faculty")
    .trim()
    .isMongoId()
    .withMessage("Valid Faculty ID is required"),

  body("department")
    .customSanitizer((value) => (Array.isArray(value) ? value : [value]))
    .isArray({ min: 1 })
    .withMessage("At least one department is required"),
  body("department.*")
    .isMongoId()
    .withMessage("Each department must be a valid Mongo ID"),

  body("programType")
    .customSanitizer((value) => (Array.isArray(value) ? value : [value]))
    .isArray({ min: 1 })
    .withMessage("At least one program type is required"),
  body("programType.*")
    .isMongoId()
    .withMessage("Each program type must be a valid Mongo ID"),

  body("level")
    .customSanitizer((value) => (Array.isArray(value) ? value : [value]))
    .isArray({ min: 1 })
    .withMessage("At least one program level is required"),
  body("level.*").isString().withMessage("Each level must be a string"),

  body("requiredCredit")
    .notEmpty()
    .withMessage("Required credit is required")
    .isInt({ min: 0 })
    .withMessage("Required credit must be a positive integer"),

  body("duration")
    .notEmpty()
    .withMessage("Duration is required")
    .isString()
    .withMessage("Duration must be a string"),

  validate,
];

// Staff validation
const staffValidation = [
  body("fullName")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 3 })
    .withMessage("Full name must be at least 3 characters"),

  body("email")
    .trim()
    .normalizeEmail()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Valid email address is required"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(\+234|0)[789][01]\d{8}$/)
    .withMessage("Enter a valid Nigerian phone number"),

  body("faculty")
    .trim()
    .notEmpty()
    .withMessage("Faculty is required")
    .isMongoId()
    .withMessage("Valid Faculty ID is required"),

  body("department").custom((value) => {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("Department is required and must be an array");
    }
    for (const id of value) {
      if (!/^[a-fA-F\d]{24}$/.test(id)) {
        throw new Error("Each Department ID must be a valid Mongo ID");
      }
    }
    return true;
  }),

  body("program").custom((value) => {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("Program is required and must be an array");
    }
    for (const id of value) {
      if (!/^[a-fA-F\d]{24}$/.test(id)) {
        throw new Error("Each Program ID must be a valid Mongo ID");
      }
    }
    return true;
  }),

  body("position")
    .optional()
    .trim()
    .escape()
    .isLength({ min: 2 })
    .withMessage("Position must be at least 2 characters"),

  body("title")
    .optional()
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Title is required"),

  body("address")
    .optional()
    .trim()
    .escape()
    .isLength({ min: 5 })
    .withMessage("Address must be at least 5 characters"),

  validate,
];

// FAQ VALIDATION
const validateFaq = [
  body("question")
    .notEmpty()
    .withMessage("Question is required")
    .isString()
    .withMessage("Question must be a string")
    .isLength({ min: 5 })
    .withMessage("Question must be more than 4 characters")
    .trim()
    .escape(),

  body("answer")
    .notEmpty()
    .withMessage("Answer is required")
    .isString()
    .withMessage("Answer must be a string")
    .isLength({ min: 5 })
    .withMessage("Answer must be more than 4 characters")
    .trim()
    .escape(),

  validate,
];

const validateContext = [
  body("context")
    .notEmpty()
    .withMessage("Context is required")
    .isString()
    .withMessage("Context must be a string")
    .isLength({ min: 20 })
    .withMessage("Context must be more than 20 characters"),

  validate,
];

//update password validation
const validatePasswordUpdate = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),

  validate,
];

module.exports = {
  validateLogin,
  validateForgotPassword,
  validateVerifyOtp,
  validateResetPassword,
  facultyValidation,
  departmentValidation,
  programTypeValidation,
  programValidation,
  staffValidation,

  validateFaq,
  validateContext,
  validatePasswordUpdate,
};
