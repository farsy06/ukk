const ValidationError = require("../utils/helpers").ValidationError;

/**
 * Async Handler Middleware
 * Menangani async/await errors tanpa perlu try-catch di setiap controller
 * @param {Function} fn - Async function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error Handler Middleware
 * Menangani semua error secara konsisten
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const logger = require("../config/logging");

  // Handle case where err might be undefined or null
  if (!err) {
    logger.error("Error Handler: Received undefined/null error");
    // Check if res is a valid response object
    if (res && typeof res.status === "function") {
      return res.status(500).json({
        success: false,
        error: {
          message: "Terjadi kesalahan internal server",
          code: "INTERNAL_SERVER_ERROR",
        },
      });
    } else {
      // Fallback for when res is not available
      console.error("Error Handler: Cannot send response - invalid res object");
      return;
    }
  }

  // Ensure err is an Error object
  if (!(err instanceof Error)) {
    err = new Error(String(err));
  }

  // Set default status code if not provided
  const statusCode = err.statusCode || 500;

  // Handle CSRF errors for web requests
  if (err.code === "EBADCSRFTOKEN") {
    logger.warn(`CSRF token validation failed for ${req.originalUrl}`);
    if (req.accepts("html")) {
      req.flash("error", "Sesi Anda telah berakhir. Silakan coba lagi.");
      return res.redirect(req.get("Referrer") || "/");
    }

    return res.status(403).json({
      success: false,
      error: {
        message: "Invalid CSRF token",
        code: "CSRF_ERROR",
      },
    });
  }

  // Log the error details
  logger.error(`Error Handler: ${err.message}`, {
    statusCode,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    user: req.user ? req.user.id : "anonymous",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Handle specific error types
  if (err instanceof ValidationError) {
    // Redirect kembali ke form dengan flash message
    if (req.originalUrl.includes("/register")) {
      req.flash("error", err.message);
      // Preserve all form data except passwords for security
      req.flash("data", {
        nama: req.body.nama,
        username: req.body.username,
        email: req.body.email,
      });
      return res.redirect("/register");
    } else if (req.originalUrl.includes("/login")) {
      req.flash("error", err.message);
      return res.redirect("/login");
    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: err.message,
          field: err.field,
          code: "VALIDATION_ERROR",
        },
      });
    }
  }

  if (err.name === "AuthenticationError") {
    // Handle authentication errors - redirect to login for web routes
    if (req.originalUrl.includes("/login")) {
      req.flash("error", err.message);
      return res.redirect("/login");
    }
    // For API routes, return JSON response
    return res.status(401).json({
      success: false,
      error: {
        message: err.message,
        code: "AUTHENTICATION_ERROR",
      },
    });
  }

  if (err.name === "AuthorizationError") {
    return res.status(403).json({
      success: false,
      error: {
        message: err.message,
        code: "AUTHORIZATION_ERROR",
      },
    });
  }

  if (err.name === "NotFoundError") {
    return res.status(404).json({
      success: false,
      error: {
        message: err.message,
        code: "NOT_FOUND_ERROR",
      },
    });
  }

  if (err.name === "DatabaseError") {
    return res.status(statusCode).json({
      success: false,
      error: {
        message:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Terjadi kesalahan pada database",
        code: "DATABASE_ERROR",
        ...(process.env.NODE_ENV === "development" && {
          originalError: err.originalError,
        }),
      },
    });
  }

  // Handle Sequelize errors
  if (err.name === "SequelizeValidationError") {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      error: {
        message: "Validasi data gagal",
        details: errors,
        code: "SEQUELIZE_VALIDATION_ERROR",
      },
    });
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      error: {
        message: "Data sudah ada",
        field: err.fields,
        code: "UNIQUE_CONSTRAINT_ERROR",
      },
    });
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(400).json({
      success: false,
      error: {
        message: "Referensi data tidak valid",
        field: err.fields,
        code: "FOREIGN_KEY_ERROR",
      },
    });
  }

  // Handle rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: {
        message:
          err.message || "Terlalu banyak request. Silakan coba lagi nanti.",
        code: 429,
        retryAfter: err.retryAfter || 60,
      },
    });
  }

  // Default error response
  if (res && typeof res.status === "function") {
    res.status(statusCode).json({
      success: false,
      error: {
        message:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Terjadi kesalahan internal server",
        code: "INTERNAL_SERVER_ERROR",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
    });
  } else {
    // Fallback for when res is not available
    console.error("Error Handler: Cannot send response - invalid res object");
  }
};

/**
 * Not Found Handler
 * Menangani 404 errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  const logger = require("../config/logging");

  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    user: req.user ? req.user.id : "anonymous",
  });

  res.status(404).json({
    success: false,
    error: {
      message: "Halaman tidak ditemukan",
      code: "NOT_FOUND",
      path: req.originalUrl,
      method: req.method,
    },
  });
};

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler,
};
