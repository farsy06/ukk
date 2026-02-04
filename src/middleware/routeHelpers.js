const {
  validateRequired,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRole,
  validateAlatStatus,
  validateAlatKondisi,
  validateTanggalPeminjaman,
} = require("./validation");

/**
 * Route Helper Middleware
 * Helper functions untuk mengurangi duplikasi middleware di routes
 */

/**
 * Middleware untuk validasi registrasi user
 * Menggabungkan semua validasi yang dibutuhkan untuk registrasi
 */
const validateUserRegistration = [
  validateRequired([
    "nama",
    "username",
    "email",
    "password",
    "confirmPassword",
  ]),
  validateEmail("email"),
  validatePassword("password"),
  validatePasswordMatch("password", "confirmPassword"),
];

/**
 * Middleware untuk validasi pembuatan user oleh admin
 * Menggabungkan validasi registrasi + validasi role
 */
const validateUserCreation = [
  validateRequired([
    "nama",
    "username",
    "email",
    "password",
    "confirmPassword",
    "role",
  ]),
  validateEmail("email"),
  validatePassword("password"),
  validatePasswordMatch("password", "confirmPassword"),
  validateRole(["petugas", "peminjam"]),
];

/**
 * Middleware untuk validasi CRUD alat
 * Menggabungkan validasi yang dibutuhkan untuk operasi alat
 */
const validateAlatManagement = [
  validateRequired(["nama_alat", "kategori_id", "kondisi", "status"]),
  validateAlatStatus(),
  validateAlatKondisi(),
];

/**
 * Middleware untuk validasi peminjaman
 * Menggabungkan validasi yang dibutuhkan untuk peminjaman
 */
const validatePeminjaman = [
  validateRequired(["alat_id", "tanggal_pinjam", "tanggal_kembali"]),
  validateTanggalPeminjaman(),
];

/**
 * Middleware untuk cache dengan TTL standar berdasarkan jenis data
 */
const standardCache = {
  user: (req, res, next) => {
    const { cacheMiddleware } = require("./caching");
    return cacheMiddleware("user", 600)(req, res, next); // 10 menit
  },

  alat: (req, res, next) => {
    const { cacheMiddleware } = require("./caching");
    return cacheMiddleware("alat", 300)(req, res, next); // 5 menit
  },

  peminjaman: (req, res, next) => {
    const { cacheMiddleware } = require("./caching");
    return cacheMiddleware("peminjaman", 180)(req, res, next); // 3 menit
  },

  kategori: (req, res, next) => {
    const { cacheMiddleware } = require("./caching");
    return cacheMiddleware("kategori", 600)(req, res, next); // 10 menit
  },

  log: (req, res, next) => {
    const { cacheMiddleware } = require("./caching");
    return cacheMiddleware("log", 300)(req, res, next); // 5 menit
  },

  home: (req, res, next) => {
    const { cacheMiddleware } = require("./caching");
    return cacheMiddleware("home", 600)(req, res, next); // 10 menit
  },
};

/**
 * Middleware untuk invalidasi cache yang lebih komprehensif
 */
const invalidateCache = (patterns) => {
  const { invalidateCache: originalInvalidate } = require("./caching");

  // Tambahkan pattern default yang sering diinvalidasi
  const extendedPatterns = [...patterns];

  // Jika invalidasi alat, tambahkan juga peminjaman karena terkait
  if (patterns.includes("alat")) {
    extendedPatterns.push("peminjaman");
  }

  // Jika invalidasi peminjaman, tambahkan juga alat karena status bisa berubah
  if (patterns.includes("peminjaman")) {
    extendedPatterns.push("alat");
  }

  return originalInvalidate(extendedPatterns);
};

/**
 * Middleware untuk role check yang lebih fleksibel
 * Mendukung multiple roles dan custom error message
 */
const requireRoles = (roles, options = {}) => {
  const { requireAnyRole } = require("./auth");
  const { AuthorizationError } = require("../utils/helpers");

  return async (req, res, next) => {
    try {
      // Gunakan middleware auth yang sudah ada
      await requireAnyRole(roles)(req, res, (err) => {
        if (err) return next(err);

        // Jika berhasil, lanjutkan
        next();
      });
    } catch (error) {
      // Custom error message jika diberikan
      if (options.customMessage) {
        throw new AuthorizationError(options.customMessage);
      }
      next(error);
    }
  };
};

/**
 * Middleware untuk pagination standar
 */
const paginate = (defaultLimit = 10, maxLimit = 50) => {
  return (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || defaultLimit;
    const offset = (page - 1) * limit;

    // Validasi limit
    if (limit > maxLimit) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Limit maksimal adalah ${maxLimit}`,
          code: "INVALID_LIMIT",
        },
      });
    }

    // Simpan ke request untuk digunakan di controller
    req.pagination = {
      page,
      limit,
      offset,
      maxLimit,
    };

    next();
  };
};

/**
 * Middleware untuk rate limiting endpoint tertentu
 */
const rateLimitEndpoint = (options = {}) => {
  const rateLimit = require("express-rate-limit");

  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: {
        message: "Terlalu banyak request. Silakan coba lagi nanti.",
        code: "RATE_LIMIT_EXCEEDED",
      },
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  };

  const limiter = rateLimit({
    ...defaultOptions,
    ...options,
  });

  return limiter;
};

module.exports = {
  validateUserRegistration,
  validateUserCreation,
  validateAlatManagement,
  validatePeminjaman,
  standardCache,
  invalidateCache,
  requireRoles,
  paginate,
  rateLimitEndpoint,
};
