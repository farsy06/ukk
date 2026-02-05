const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const csurf = require("@dr.pogodin/csurf");
const xss = require("xss");
const logger = require("../config/logging");
const appConfig = require("../config/appConfig");

/**
 * Rate limiting untuk login
 * Membatasi 5 percobaan login dalam 15 menit (atau relax untuk test environment)
 */
const loginLimiter =
  process.env.NODE_ENV === "test"
    ? (req, res, next) => next() // Disable rate limiting for tests
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 menit
        max: 5, // batas 5 request
        message: {
          error:
            "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
          code: 429,
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res) => {
          logger.warn(`Rate limit exceeded for login from IP: ${req.ip}`);
          res.status(429).json({
            error:
              "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
            code: 429,
            retryAfter: Math.round((15 * 60) / 60), // dalam menit
          });
        },
      });

/**
 * Rate limiting umum untuk seluruh aplikasi
 * Membatasi 100 request per 15 menit per IP (atau relax untuk test environment)
 * Mengabaikan rate limit untuk localhost (127.0.0.1)
 */
const generalLimiter =
  process.env.NODE_ENV === "test"
    ? (req, res, next) => next() // Disable rate limiting for tests
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 menit
        max: 100, // batas 100 request
        message: {
          error: "Terlalu banyak request. Silakan coba lagi nanti.",
          code: 429,
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Skip rate limiting for localhost
        skip: (req) => {
          const clientIp = req.ip || req.connection.remoteAddress;
          return (
            clientIp === "127.0.0.1" ||
            clientIp === "::1" ||
            clientIp === "::ffff:127.0.0.1"
          );
        },
        handler: (req, res) => {
          logger.warn(`General rate limit exceeded from IP: ${req.ip}`);
          res.status(429).json({
            error: "Terlalu banyak request. Silakan coba lagi nanti.",
            code: 429,
          });
        },
      });

/**
 * Input sanitization middleware
 * Membersihkan input dari potensi XSS
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== "string") return str;
    return xss(str);
  };

  const skipKeys = new Set([
    "_csrf",
    "password",
    "confirmPassword",
    "currentPassword",
    "newPassword",
  ]);

  const sanitizeObject = (obj) => {
    Object.keys(obj).forEach((k) => {
      if (skipKeys.has(k)) return;
      if (typeof obj[k] === "string") {
        obj[k] = sanitizeString(obj[k]);
      } else if (typeof obj[k] === "object" && obj[k] !== null) {
        sanitizeObject(obj[k]);
      }
    });
  };

  // Sanitize query parameters
  if (req.query) {
    sanitizeObject(req.query);
  }

  // Sanitize body parameters
  if (req.body) {
    sanitizeObject(req.body);
  }

  // Sanitize params
  if (req.params) {
    sanitizeObject(req.params);
  }

  next();
};

/**
 * Security headers middleware
 * Menambahkan header keamanan
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.googleapis.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: ["no-referrer"] },
  xssFilter: true,
});

// CSRF Protection middleware
const csrfToken = (req, res, next) => {
  // Disable CSRF protection in test environment
  if (process.env.NODE_ENV === "test") {
    res.locals.csrfToken = "test-csrf-token";
    return next();
  }

  if (!appConfig.security.csrf) {
    return next();
  }

  return csurf({ cookie: false })(req, res, (err) => {
    if (err) {
      logger.warn(
        `CSRF token validation failed for IP: ${req.ip} path: ${req.originalUrl}`,
      );
      if (req.accepts("html")) {
        if (typeof req.flash === "function") {
          req.flash("error", "Sesi Anda telah berakhir. Silakan coba lagi.");
        }
        return res.redirect(req.get("Referrer") || "/");
      }

      return res.status(403).json({
        error: "CSRF token validation failed",
        message: "Invalid CSRF token",
      });
    }

    try {
      res.locals.csrfToken = req.csrfToken();
    } catch (e) {
      logger.warn(`Failed to generate CSRF token: ${e.message}`);
      res.locals.csrfToken = "";
    }

    return next();
  });
};

module.exports = {
  loginLimiter,
  generalLimiter,
  sanitizeInput,
  securityHeaders,
  csrfToken,
};
