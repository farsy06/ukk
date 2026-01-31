const User = require("../models/User");
const Peminjaman = require("../models/Peminjaman");
const Alat = require("../models/Alat");
const Kategori = require("../models/Kategori");
const LogAktivitas = require("../models/LogAktivitas");
const logger = require("../config/logging");
const {
  DatabaseError,
  NotFoundError,
  AuthorizationError,
  ValidationError,
} = require("../utils/helpers");
const {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
} = require("../utils/constants");
const { cacheHelper } = require("../middleware/caching");

/**
 * Display admin dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered admin dashboard view
 */
const dashboard = async (req, res) => {
  // Coba dapatkan dari cache terlebih dahulu
  const cacheKey = "admin_dashboard_stats";
  const cachedData = cacheHelper.get(cacheKey);

  if (cachedData) {
    logger.info("Admin dashboard: Cache hit");
    return res.render("admin/dashboard", {
      title: "Dashboard Admin",
      user: req.user,
      stats: cachedData,
    });
  }

  logger.info(`Admin dashboard accessed by user: ${req.user.id}`);

  // Get statistics
  const stats = {
    kategori: await Kategori.count(),
    alat: await Alat.count(),
    peminjaman: await Peminjaman.count({
      where: {
        status: {
          [require("sequelize").Op.in]: ["dipinjam", "diproses"],
        },
      },
    }),
    user: await User.count({
      where: {
        role: {
          [require("sequelize").Op.ne]: ROLES.ADMIN,
        },
      },
    }),
  };

  // Simpan ke cache
  cacheHelper.set(cacheKey, stats, 300); // Cache 5 menit

  res.render("admin/dashboard", {
    title: "Dashboard Admin",
    user: req.user,
    stats,
  });
};

/**
 * Display list of users for admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered user management view
 */
const userIndex = async (req, res) => {
  // Coba dapatkan dari cache terlebih dahulu
  const cacheKey = "admin_user_index";
  const cachedData = cacheHelper.get(cacheKey);

  if (cachedData) {
    logger.info("Admin user index: Cache hit");
    return res.render("admin/user/index", {
      title: "Kelola User",
      users: cachedData,
      user: req.user,
    });
  }

  try {
    logger.info(`User list accessed by admin: ${req.user.id}`);

    const users = await User.findAll({
      where: {
        role: {
          [require("sequelize").Op.ne]: ROLES.ADMIN,
        },
      },
    });

    // Simpan ke cache
    cacheHelper.set(cacheKey, users, 600); // Cache 10 menit

    res.render("admin/user/index", {
      title: "Kelola User",
      users,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in admin user index:", error);
    throw new DatabaseError("Gagal memuat daftar user", error);
  }
};

/**
 * Display form to add new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered user creation form
 */
const showCreateUser = (req, res) => {
  try {
    logger.info(`Create user form accessed by admin: ${req.user.id}`);
    res.render("admin/user/create", {
      title: "Tambah User",
      error: null,
    });
  } catch (error) {
    logger.error("Error displaying create user form:", error);
    throw new DatabaseError("Gagal memuat form tambah user", error);
  }
};

/**
 * Process creation of new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect or rendered view with errors
 */
const createUser = async (req, res) => {
  const { nama, username, email, password, role } = req.body;
  logger.info(`Admin ${req.user.id} attempting to create user: ${username}`);

  // Check if username already exists
  const existingUsername = await User.findOne({ where: { username } });
  if (existingUsername) {
    logger.warn(`Create user failed: username ${username} already exists`);
    throw new ValidationError(
      ERROR_MESSAGES.VALIDATION.USERNAME_TAKEN,
      "username",
    );
  }

  // Check if email already exists
  const existingEmail = await User.findOne({ where: { email } });
  if (existingEmail) {
    logger.warn(`Create user failed: email ${email} already exists`);
    throw new ValidationError(ERROR_MESSAGES.VALIDATION.EMAIL_TAKEN, "email");
  }

  // Create new user
  const newUser = await User.create({
    nama,
    username,
    email,
    password,
    role,
  });

  // Log activity
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Menambah user baru: ${nama} (${role})`,
  });

  logger.info(`Admin ${req.user.id} successfully created user: ${newUser.id}`);
  req.flash("success", SUCCESS_MESSAGES.USER_CREATED);

  // Invalidasi cache user
  cacheHelper.del("admin_user_index");

  res.redirect("/admin/user");
};

/**
 * Delete user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect or error response
 */
const destroyUser = async (req, res) => {
  const userId = req.params.id;
  logger.info(`Admin ${req.user.id} attempting to delete user: ${userId}`);

  const user = await User.findByPk(userId);
  if (!user) {
    logger.warn(`Delete user failed: user ${userId} not found`);
    throw new NotFoundError("User");
  }

  // Don't allow deleting other admins
  if (user.role === ROLES.ADMIN) {
    logger.warn(`Delete user failed: cannot delete admin user ${userId}`);
    throw new AuthorizationError(
      ERROR_MESSAGES.AUTHORIZATION.CANNOT_DELETE_ADMIN,
    );
  }

  await user.destroy();

  // Log activity
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Menghapus user: ${user.nama} (${user.role})`,
  });

  logger.info(`Admin ${req.user.id} successfully deleted user: ${userId}`);
  req.flash("success", SUCCESS_MESSAGES.USER_DELETED);

  // Invalidasi cache user
  cacheHelper.del("admin_user_index");

  res.redirect("/admin/user");
};

/**
 * Display activity logs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered log view
 */
const logIndex = async (req, res) => {
  // Coba dapatkan dari cache terlebih dahulu
  const cacheKey = "admin_log_index";
  const cachedData = cacheHelper.get(cacheKey);

  if (cachedData) {
    logger.info("Admin log index: Cache hit");
    return res.render("admin/log/index", {
      title: "Log Aktivitas",
      logs: cachedData,
      user: req.user,
    });
  }

  try {
    logger.info(`Admin ${req.user.id} accessing activity logs`);

    const logs = await LogAktivitas.findAll({
      include: [
        {
          model: User,
          as: "user",
        },
      ],
      order: [["waktu", "DESC"]],
    });

    // Simpan ke cache
    cacheHelper.set(cacheKey, logs, 300); // Cache 5 menit

    res.render("admin/log/index", {
      title: "Log Aktivitas",
      logs,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in log index:", error);
    throw new DatabaseError("Gagal memuat log aktivitas", error);
  }
};

module.exports = {
  dashboard,
  userIndex,
  showCreateUser,
  createUser,
  destroyUser,
  logIndex,
};
