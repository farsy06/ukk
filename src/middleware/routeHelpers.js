const {
  validateRequired,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRole,
  validateAlatStatus,
  validateAlatKondisi,
  validateTanggalPeminjaman,
  validateJumlahPeminjaman,
} = require("./validation");

const { requireAnyRole } = require("./auth");
const { AuthorizationError } = require("../utils/helpers");

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
 * Middleware untuk validasi kategori
 * Menggabungkan validasi yang dibutuhkan untuk kategori
 */
const validateKategori = [validateRequired(["nama_kategori"])];

/**
 * Middleware untuk validasi CRUD alat
 * Menggabungkan validasi yang dibutuhkan untuk operasi alat
 */
const validateAlatCreate = [
  validateRequired(["nama_alat", "kategori_id", "kondisi"]),
  validateAlatKondisi(),
];

const validateAlatUpdate = [
  validateRequired(["nama_alat", "kategori_id", "kondisi", "status"]),
  validateAlatStatus(),
  validateAlatKondisi(),
];

const validateAlatManagement = validateAlatUpdate;

/**
 * Middleware untuk validasi peminjaman
 * Menggabungkan validasi yang dibutuhkan untuk peminjaman
 */
const validatePeminjaman = [
  validateRequired(["alat_id", "tanggal_pinjam", "tanggal_kembali", "jumlah"]),
  validateTanggalPeminjaman(),
  validateJumlahPeminjaman(),
];

/**
 * Middleware untuk role check yang lebih fleksibel
 * Mendukung multiple roles dan custom error message
 */
const requireRoles = (roles, options = {}) => {
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

const rateLimit = require("express-rate-limit");

/**
 * Middleware untuk rate limiting endpoint tertentu
 */
const rateLimitEndpoint = (options = {}) => {
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
  validateKategori,
  validateAlatCreate,
  validateAlatUpdate,
  validateAlatManagement,
  validatePeminjaman,
  requireRoles,
  paginate,
  rateLimitEndpoint,
};
