const User = require("../models/User");
const logger = require("../config/logging");
const { AuthenticationError, AuthorizationError } = require("../utils/helpers");
const constants = require("../utils/constants");

/**
 * Middleware untuk mengecek apakah user sudah login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const isAuthenticated = async (req, res, next) => {
  try {
    // Cek apakah session userId ada
    if (!req.session.userId) {
      logger.warn(`Unauthenticated access attempt to ${req.originalUrl}`);
      return res.redirect("/login");
    }

    // Ambil data user dari database
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      logger.warn(`Invalid session for userId: ${req.session.userId}`);
      req.session.destroy();
      return res.redirect("/login");
    }

    // Simpan user ke request
    req.user = user;
    logger.debug(`User authenticated: ${user.id} (${user.role})`);

    next();
  } catch (error) {
    logger.error("Error in isAuthenticated middleware:", error);
    return res.redirect("/login");
  }
};

/**
 * Middleware untuk mengecek role user
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} - Express middleware function
 */
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      // Pastikan user sudah terautentikasi
      if (!req.user) {
        logger.warn(
          `Role check failed: user not authenticated for ${req.originalUrl}`,
        );
        throw new AuthenticationError("User belum terautentikasi");
      }

      // Cek apakah role user termasuk dalam roles yang diizinkan
      if (!roles.includes(req.user.role)) {
        logger.warn(
          `Authorization failed: user ${req.user.id} (${req.user.role}) accessing ${req.originalUrl}`,
        );
        throw new AuthorizationError(
          `Akses ditolak! Role ${req.user.role} tidak memiliki izin`,
        );
      }

      logger.debug(
        `Role check passed: user ${req.user.id} (${req.user.role}) accessing ${req.originalUrl}`,
      );
      next();
    } catch (error) {
      logger.error("Error in checkRole middleware:", error);

      if (error instanceof AuthenticationError) {
        return res.redirect("/login");
      }

      if (error instanceof AuthorizationError) {
        return res.status(403).render("errors/403", {
          title: "Akses Ditolak",
          message: error.message,
        });
      }

      // Untuk error lainnya, lempar ke error handler
      next(error);
    }
  };
};

/**
 * Middleware khusus untuk role tertentu
 * @description Fungsi helper untuk memudahkan penggunaan checkRole
 */
const isAdmin = checkRole([constants.ROLES.ADMIN]);
const isPetugas = checkRole([constants.ROLES.ADMIN, constants.ROLES.PETUGAS]);
const isPeminjam = checkRole([
  constants.ROLES.ADMIN,
  constants.ROLES.PETUGAS,
  constants.ROLES.PEMINJAM,
]);

/**
 * Middleware untuk cek apakah user adalah admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const requireAdmin = (req, res, next) => {
  isAdmin(req, res, next);
};

/**
 * Middleware untuk cek apakah user adalah petugas atau admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const requirePetugas = (req, res, next) => {
  isPetugas(req, res, next);
};

/**
 * Middleware untuk cek apakah user adalah peminjam, petugas, atau admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
const requirePeminjam = (req, res, next) => {
  isPeminjam(req, res, next);
};

/**
 * Middleware untuk cek apakah user memiliki role tertentu
 * @param {string} role - Role yang dibutuhkan
 * @returns {Function} - Express middleware function
 */
const requireRole = (role) => {
  return checkRole([role]);
};

/**
 * Middleware untuk cek apakah user memiliki salah satu dari beberapa role
 * @param {Array} roleList - Array of roles
 * @returns {Function} - Express middleware function
 */
const requireAnyRole = (roleList) => {
  return checkRole(roleList);
};

module.exports = {
  // Core middleware
  isAuthenticated,
  checkRole,

  // Specific role middleware
  isAdmin,
  isPetugas,
  isPeminjam,

  // Named middleware functions
  requireAdmin,
  requirePetugas,
  requirePeminjam,

  // Utility middleware
  requireRole,
  requireAnyRole,
};
