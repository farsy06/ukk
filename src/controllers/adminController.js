const userService = require("../services/userService");
const reportService = require("../services/reportService");
const logger = require("../config/logging");
const { getPagination } = require("../utils/helpers");

/**
 * Display admin dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered admin dashboard view
 */
const dashboard = async (req, res) => {
  try {
    logger.info(`Admin dashboard accessed by user: ${req.user.id}`);

    const stats = await userService.getDashboardStats();

    res.render("admin/dashboard", {
      title: "Dashboard Admin",
      user: req.user,
      stats,
    });
  } catch (error) {
    logger.error("Error in admin dashboard:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Display list of users for admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered user management view
 */
const userIndex = async (req, res) => {
  try {
    logger.info(`User list accessed by admin: ${req.user.id}`);

    const { page, limit, offset } = req.pagination || {
      page: 1,
      limit: 10,
      offset: 0,
    };

    const { rows: users, count } = await userService.getAllUsersPaginated({
      limit,
      offset,
    });

    const pagination = getPagination(page, limit, count);
    pagination.offset = offset;
    const start = count > 0 ? offset + 1 : 0;
    const end = Math.min(offset + limit, count);

    res.render("admin/user/index", {
      title: "Kelola User",
      users,
      user: req.user,
      pagination,
      range: { start, end, total: count },
    });
  } catch (error) {
    logger.error("Error in admin user index:", error);
    res.status(500).send("Terjadi kesalahan");
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
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Process creation of new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect or rendered view with errors
 */
const createUser = async (req, res) => {
  try {
    const { nama, username, email, password, role } = req.body;
    logger.info(`Admin ${req.user.id} attempting to create user: ${username}`);

    const newUser = await userService.create(
      { nama, username, email, password, role },
      req.user,
    );

    logger.info(
      `Admin ${req.user.id} successfully created user: ${newUser.id}`,
    );
    req.flash("success", "User berhasil ditambahkan");

    res.redirect("/admin/user");
  } catch (error) {
    logger.error("Error in create user:", error);
    res.status(400).render("admin/user/create", {
      title: "Tambah User",
      error: error.message,
    });
  }
};

/**
 * Delete user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect or error response
 */
const destroyUser = async (req, res) => {
  try {
    const userId = req.params.id;
    logger.info(`Admin ${req.user.id} attempting to delete user: ${userId}`);

    await userService.delete(userId, req.user);

    logger.info(`Admin ${req.user.id} successfully deleted user: ${userId}`);
    req.flash("success", "User berhasil dihapus");

    res.redirect("/admin/user");
  } catch (error) {
    logger.error("Error in delete user:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Display activity logs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered log view
 */
const logIndex = async (req, res) => {
  try {
    logger.info(`Admin ${req.user.id} accessing activity logs`);

    const logs = await userService.getActivityLogs();

    res.render("admin/log/index", {
      title: "Log Aktivitas",
      logs,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in log index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Display report dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered report dashboard view
 */
const reportIndex = async (req, res) => {
  try {
    logger.info(`Admin ${req.user.id} accessing report dashboard`);

    const dashboardData = await reportService.generateReportDashboard();

    res.render("admin/laporan/index", {
      title: dashboardData.title,
      dashboardData,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in report index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Display petugas report dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered petugas report dashboard view
 */
const petugasReportIndex = async (req, res) => {
  try {
    logger.info(`Petugas ${req.user.id} accessing report dashboard`);

    const dashboardData = await reportService.generatePetugasReportDashboard();

    res.render("petugas/laporan/index", {
      title: dashboardData.title,
      dashboardData,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in petugas report index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Generate user report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered user report view
 */
const generateUserReport = async (req, res) => {
  try {
    logger.info(`Admin ${req.user.id} generating user report`);

    const filters = {
      startDate: req.query.start_date,
      endDate: req.query.end_date,
    };

    const reportData = await reportService.generateUserReport(filters);

    res.render("admin/laporan/user", {
      title: reportData.title,
      reportData,
      user: req.user,
      filters,
    });
  } catch (error) {
    logger.error("Error generating user report:", error);
    res.status(500).send("Terjadi kesalahan saat membuat laporan user");
  }
};

/**
 * Generate inventory report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered inventory report view
 */
const generateInventoryReport = async (req, res) => {
  try {
    logger.info(`Admin ${req.user.id} generating inventory report`);

    const filters = {
      startDate: req.query.start_date,
      endDate: req.query.end_date,
    };

    const reportData = await reportService.generateInventoryReport(filters);

    res.render("admin/laporan/inventory", {
      title: reportData.title,
      reportData,
      user: req.user,
      filters,
    });
  } catch (error) {
    logger.error("Error generating inventory report:", error);
    res.status(500).send("Terjadi kesalahan saat membuat laporan inventori");
  }
};

/**
 * Generate peminjaman report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered peminjaman report view
 */
const generatePeminjamanReport = async (req, res) => {
  try {
    logger.info(`Admin ${req.user.id} generating peminjaman report`);

    const filters = {
      startDate: req.query.start_date,
      endDate: req.query.end_date,
    };

    const reportData = await reportService.generatePeminjamanReport(filters);

    res.render("admin/laporan/peminjaman", {
      title: reportData.title,
      reportData,
      user: req.user,
      filters,
    });
  } catch (error) {
    logger.error("Error generating peminjaman report:", error);
    res.status(500).send("Terjadi kesalahan saat membuat laporan peminjaman");
  }
};

/**
 * Generate activity report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered activity report view
 */
const generateActivityReport = async (req, res) => {
  try {
    logger.info(`Admin ${req.user.id} generating activity report`);

    const filters = {
      startDate: req.query.start_date,
      endDate: req.query.end_date,
    };

    const reportData = await reportService.generateActivityReport(filters);

    res.render("admin/laporan/activity", {
      title: reportData.title,
      reportData,
      user: req.user,
      filters,
    });
  } catch (error) {
    logger.error("Error generating activity report:", error);
    res.status(500).send("Terjadi kesalahan saat membuat laporan aktivitas");
  }
};

/**
 * Generate statistics dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered statistics view
 */
const generateStatistics = async (req, res) => {
  try {
    logger.info(`Admin ${req.user.id} generating statistics`);

    const stats = await reportService.generateStatistics();

    res.render("admin/laporan/statistics", {
      title: "Statistik Sistem",
      stats,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error generating statistics:", error);
    res.status(500).send("Terjadi kesalahan saat membuat statistik");
  }
};

module.exports = {
  dashboard,
  userIndex,
  showCreateUser,
  createUser,
  destroyUser,
  logIndex,
  reportIndex,
  petugasReportIndex,
  generateUserReport,
  generateInventoryReport,
  generatePeminjamanReport,
  generateActivityReport,
  generateStatistics,
};
