const User = require("../models/User");
const LogAktivitas = require("../models/LogAktivitas");
const { cacheHelper } = require("../middleware/caching");
const logger = require("../config/logging");
const { ROLES } = require("../utils/constants");

/**
 * User Service
 * Service layer for user business logic
 */
class UserService {
  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} - Dashboard statistics
   */
  async getDashboardStats() {
    const cacheKey = "admin_dashboard_stats";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Admin dashboard: Cache hit");
      return cachedData;
    }

    const stats = {
      kategori: await this.getKategoriCount(),
      alat: await this.getAlatCount(),
      peminjaman: await this.getPeminjamanCount(),
      user: await this.getUserCount(),
    };

    // Cache for 5 minutes
    cacheHelper.set(cacheKey, stats, 300);
    return stats;
  }

  /**
   * Get all users except admins
   * @returns {Promise<Array>} - Array of users
   */
  async getAllUsers() {
    const cacheKey = "admin_user_index";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Admin user index: Cache hit");
      return cachedData;
    }

    const users = await User.findAll({
      where: {
        role: {
          [require("sequelize").Op.ne]: ROLES.ADMIN,
        },
      },
    });

    // Cache for 10 minutes
    cacheHelper.set(cacheKey, users, 600);
    return users;
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object>} - User object
   */
  async getById(id) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error("User tidak ditemukan");
    }
    return user;
  }

  /**
   * Create new user
   * @param {Object} data - User data
   * @param {Object} adminUser - Admin user object
   * @returns {Promise<Object>} - Created user
   */
  async create(data, adminUser) {
    const { nama, username, email, password, role } = data;

    // Check if username already exists
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      throw new Error("Username sudah digunakan");
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      throw new Error("Email sudah digunakan");
    }

    const user = await User.create({
      nama,
      username,
      email,
      password,
      role,
    });

    // Log activity - handle system user (id 0) specially
    if (adminUser.id > 0) {
      await LogAktivitas.create({
        user_id: adminUser.id,
        aktivitas: `Menambah user baru: ${nama} (${role})`,
      });
    } else {
      // For system activities (registration), we can skip logging or use a different approach
      // Since registration doesn't have a real user yet, we'll skip the log entry
      logger.info(
        `User registration completed: ${nama} (${role}) - Skipping activity log for system action`,
      );
    }

    // Invalidasi cache
    this.invalidateCache();

    return user;
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @param {Object} adminUser - Admin user object
   * @returns {Promise<void>}
   */
  async delete(id, adminUser) {
    const user = await this.getById(id);

    // Don't allow deleting other admins
    if (user.role === ROLES.ADMIN) {
      throw new Error("Tidak dapat menghapus user admin lain");
    }

    await user.destroy();

    // Log activity
    await LogAktivitas.create({
      user_id: adminUser.id,
      aktivitas: `Menghapus user: ${user.nama} (${user.role})`,
    });

    // Invalidasi cache
    this.invalidateCache();
  }

  /**
   * Get activity logs
   * @returns {Promise<Array>} - Array of activity logs
   */
  async getActivityLogs() {
    const cacheKey = "admin_log_index";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Admin log index: Cache hit");
      return cachedData;
    }

    const logs = await LogAktivitas.findAll({
      include: [
        {
          model: User,
          as: "user",
        },
      ],
      order: [["waktu", "DESC"]],
    });

    // Cache for 5 minutes
    cacheHelper.set(cacheKey, logs, 300);
    return logs;
  }

  /**
   * Get kategori count
   * @returns {Promise<number>} - Kategori count
   */
  async getKategoriCount() {
    const Kategori = require("../models/Kategori");
    return await Kategori.count();
  }

  /**
   * Get alat count
   * @returns {Promise<number>} - Alat count
   */
  async getAlatCount() {
    const Alat = require("../models/Alat");
    return await Alat.count();
  }

  /**
   * Get peminjaman count (dipinjam + diproses)
   * @returns {Promise<number>} - Peminjaman count
   */
  async getPeminjamanCount() {
    const Peminjaman = require("../models/Peminjaman");
    return await Peminjaman.count({
      where: {
        status: {
          [require("sequelize").Op.in]: ["dipinjam", "diproses"],
        },
      },
    });
  }

  /**
   * Get user count (excluding admins)
   * @returns {Promise<number>} - User count
   */
  async getUserCount() {
    return await User.count({
      where: {
        role: {
          [require("sequelize").Op.ne]: ROLES.ADMIN,
        },
      },
    });
  }

  /**
   * Invalidate cache for user-related data
   * @returns {void}
   */
  invalidateCache() {
    cacheHelper.del("admin_dashboard_stats");
    cacheHelper.del("admin_user_index");
    cacheHelper.del("admin_log_index");
  }

  /**
   * Check if username is unique
   * @param {string} username - Username to check
   * @param {number} excludeId - Exclude user ID (for updates)
   * @returns {Promise<boolean>} - True if unique
   */
  async isUsernameUnique(username, excludeId = null) {
    const where = { username };
    if (excludeId) {
      where.id = { [require("sequelize").Op.ne]: excludeId };
    }

    const existing = await User.findOne({ where });
    return !existing;
  }

  /**
   * Check if email is unique
   * @param {string} email - Email to check
   * @param {number} excludeId - Exclude user ID (for updates)
   * @returns {Promise<boolean>} - True if unique
   */
  async isEmailUnique(email, excludeId = null) {
    const where = { email };
    if (excludeId) {
      where.id = { [require("sequelize").Op.ne]: excludeId };
    }

    const existing = await User.findOne({ where });
    return !existing;
  }
}

module.exports = new UserService();
