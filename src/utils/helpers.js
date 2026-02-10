/**
 * Utility Functions and Helpers
 * Common functions used throughout the application
 */

const logger = require("../config/logging");
const appConfig = require("../config/appConfig");
const xss = require("xss");
const validator = require("validator");
const logDetails = process.env.NODE_ENV === "development";

/**
 * Custom Error Classes
 */

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.statusCode = 400;
    logger.warn("Validation Error", field ? { field } : undefined);
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = 401;
    if (logDetails) {
      logger.warn(`Authentication Error: ${message}`);
    } else {
      logger.warn("Authentication Error");
    }
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = 403;
    if (logDetails) {
      logger.warn(`Authorization Error: ${message}`);
    } else {
      logger.warn("Authorization Error");
    }
  }
}

class DatabaseError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = "DatabaseError";
    this.statusCode = 500;
    this.originalError = originalError;
    if (logDetails) {
      logger.error(`Database Error: ${message}`, originalError);
    } else {
      logger.error("Database Error");
    }
  }
}

class NotFoundError extends Error {
  constructor(resource = "Resource") {
    super(`${resource} tidak ditemukan`);
    this.name = "NotFoundError";
    this.statusCode = 404;
    if (logDetails) {
      logger.warn(`Not Found Error: ${resource}`);
    } else {
      logger.warn("Not Found Error");
    }
  }
}

/**
 * Error Handler Middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function errorHandler(err, req, res) {
  logger.error(`Unhandled Error: ${err.message}`, err.stack);

  // Set default status code if not provided
  const statusCode = err.statusCode || 500;

  // Log the error details
  logger.error(`Error Details:`, {
    statusCode,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    user: req.user ? req.user.id : "anonymous",
  });

  // Render appropriate error response
  if (req.accepts("html")) {
    res.status(statusCode).render("error", {
      title: `Error ${statusCode}`,
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Terjadi kesalahan",
      error: process.env.NODE_ENV === "development" ? err : null,
    });
  } else if (req.accepts("json")) {
    res.status(statusCode).json({
      error: {
        message:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Terjadi kesalahan",
        code: statusCode,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
    });
  } else {
    res
      .status(statusCode)
      .send(
        process.env.NODE_ENV === "development"
          ? err.message
          : "Terjadi kesalahan",
      );
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email is valid
 */
function isValidEmail(email) {
  if (typeof email !== "string") return false;
  return validator.isEmail(email, {
    allow_display_name: false,
    require_display_name: false,
    allow_utf8_local_part: true,
  });
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password meets requirements
 */
function isValidPassword(password) {
  if (password.length < appConfig.password.minLength) {
    return false;
  }

  if (
    appConfig.password.requireSpecialChar &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    return false;
  }

  if (appConfig.password.requireNumber && !/\d/.test(password)) {
    return false;
  }

  if (appConfig.password.requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }

  return true;
}

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} - Pagination metadata
 */
function getPagination(
  page = 1,
  limit = appConfig.pagination.defaultLimit,
  total = 0,
) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || appConfig.pagination.defaultLimit;

  return {
    currentPage: pageInt,
    perPage: limitInt,
    totalItems: total,
    totalPages: Math.ceil(total / limitInt),
    hasPrevious: pageInt > 1,
    hasNext: pageInt < Math.ceil(total / limitInt),
    previousPage: pageInt > 1 ? pageInt - 1 : null,
    nextPage: pageInt < Math.ceil(total / limitInt) ? pageInt + 1 : null,
  };
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {string} format - Format string (default: 'DD/MM/YYYY HH:mm')
 * @returns {string} - Formatted date string
 */
function formatDate(date, format = "DD/MM/YYYY HH:mm") {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return format
    .replace("DD", day)
    .replace("MM", month)
    .replace("YYYY", year)
    .replace("HH", hours)
    .replace("mm", minutes);
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== "string") {
    return input;
  }

  return xss(input);
}

module.exports = {
  // Error classes
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  NotFoundError,

  // Utility functions
  errorHandler,
  isValidEmail,
  isValidPassword,
  getPagination,
  formatDate,
  sanitizeInput,

  // Config access
  appConfig,
};
