const ValidationError = require("../utils/helpers").ValidationError;
const { pushFlash } = require("../utils/flash");
const { sendWebOrJson } = require("./responseHelpers");

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
  const fs = require("fs");
  const path = require("path");

  // Handle case where err might be undefined or null
  if (!err) {
    logger.error("Error Handler: Received undefined/null error");
    // Check if res is a valid response object
    if (res && typeof res.status === "function") {
      return sendWebOrJson({
        req,
        res,
        status: 500,
        web: {
          mode: "render",
          view: "error",
          data: {
            title: "Error 500",
            message: "Terjadi kesalahan internal server",
            error: null,
          },
        },
        api: {
          success: false,
          error: {
            message: "Terjadi kesalahan internal server",
            code: "INTERNAL_SERVER_ERROR",
          },
        },
      });
    } else {
      // Fallback for when res is not available
      console.error("Error Handler: Cannot send response - invalid res object");
      return;
    }
  }

  const safeUnlinkUpload = (filePath) => {
    if (typeof filePath !== "string") return;
    const uploadsRoot = path.resolve(__dirname, "../../public/uploads/alat");
    const resolvedPath = path.resolve(filePath);
    const uploadsRootWithSep = uploadsRoot.endsWith(path.sep)
      ? uploadsRoot
      : `${uploadsRoot}${path.sep}`;
    if (!resolvedPath.startsWith(uploadsRootWithSep)) return;
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
  };

  // Cleanup uploaded file if validation fails after upload
  if (req && req.file && req.file.path) {
    try {
      safeUnlinkUpload(req.file.path);
    } catch (cleanupErr) {
      logger.warn(`Failed to cleanup uploaded file: ${cleanupErr.message}`);
    }
  }

  // Ensure err is an Error object
  if (!(err instanceof Error)) {
    err = new Error(String(err));
  }

  // Set default status code if not provided
  const statusCode = err.statusCode || 500;
  const respondError = ({ code, message, details }) => {
    return sendWebOrJson({
      req,
      res,
      status: statusCode,
      web: {
        mode: "render",
        view: "error",
        data: {
          title: `Error ${statusCode}`,
          message,
          error:
            process.env.NODE_ENV === "development"
              ? {
                  code,
                  details,
                }
              : null,
        },
      },
      api: {
        success: false,
        error: {
          message,
          ...(code ? { code } : {}),
          ...(details ? { details } : {}),
        },
      },
    });
  };

  // Handle CSRF errors for web requests
  if (err.code === "EBADCSRFTOKEN") {
    logger.warn(`CSRF token validation failed for ${req.originalUrl}`);
    return sendWebOrJson({
      req,
      res,
      status: 403,
      web: {
        mode: "redirect",
        type: "error",
        message: "Sesi Anda telah berakhir. Silakan coba lagi.",
        fallback: "/",
      },
      api: {
        success: false,
        error: {
          message: "Invalid CSRF token",
          code: "CSRF_ERROR",
        },
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
      pushFlash(req, "error", err.message);
      // Preserve all form data except passwords for security
      req.flash("data", {
        nama: req.body.nama,
        username: req.body.username,
        email: req.body.email,
      });
      return res.redirect("/register");
    } else if (req.originalUrl.includes("/login")) {
      pushFlash(req, "error", err.message);
      return res.redirect("/login");
    } else {
      return sendWebOrJson({
        req,
        res,
        status: 400,
        web: {
          mode: "redirect",
          type: "error",
          message: err.message,
          fallback: "/",
        },
        api: {
          success: false,
          error: {
            message: err.message,
            field: err.field,
            code: "VALIDATION_ERROR",
          },
        },
      });
    }
  }

  if (err.name === "AuthenticationError") {
    // Handle authentication errors - redirect to login for web routes
    if (req.originalUrl.includes("/login")) {
      pushFlash(req, "error", err.message);
      return res.redirect("/login");
    }
    // For API routes, return JSON response
    return respondError({
      code: "AUTHENTICATION_ERROR",
      message: err.message,
    });
  }

  if (err.name === "AuthorizationError") {
    return respondError({
      code: "AUTHORIZATION_ERROR",
      message: err.message,
    });
  }

  if (err.name === "NotFoundError") {
    return respondError({
      code: "NOT_FOUND_ERROR",
      message: err.message,
    });
  }

  if (err.name === "DatabaseError") {
    return respondError({
      code: "DATABASE_ERROR",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Terjadi kesalahan pada database",
      details:
        process.env.NODE_ENV === "development"
          ? { originalError: err.originalError }
          : undefined,
    });
  }

  // Handle Sequelize errors
  if (err.name === "SequelizeValidationError") {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));

    return respondError({
      code: "SEQUELIZE_VALIDATION_ERROR",
      message: "Validasi data gagal",
      details: errors,
    });
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return respondError({
      code: "UNIQUE_CONSTRAINT_ERROR",
      message: "Data sudah ada",
      details: { field: err.fields },
    });
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    return respondError({
      code: "FOREIGN_KEY_ERROR",
      message: "Referensi data tidak valid",
      details: { field: err.fields },
    });
  }

  // Handle rate limit errors
  if (err.status === 429) {
    return respondError({
      code: 429,
      message:
        err.message || "Terlalu banyak request. Silakan coba lagi nanti.",
      details: { retryAfter: err.retryAfter || 60 },
    });
  }

  // Default error response
  if (res && typeof res.status === "function") {
    return respondError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Terjadi kesalahan internal server",
      details:
        process.env.NODE_ENV === "development"
          ? { stack: err.stack }
          : undefined,
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

  return sendWebOrJson({
    req,
    res,
    status: 404,
    web: {
      mode: "render",
      view: "error",
      data: {
        title: "Error 404",
        message: "Halaman tidak ditemukan",
        error: null,
      },
    },
    api: {
      success: false,
      error: {
        message: "Halaman tidak ditemukan",
        code: "NOT_FOUND",
        path: req.originalUrl,
        method: req.method,
      },
    },
  });
};

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler,
};
