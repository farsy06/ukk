const userService = require("../services/userService");
const reportService = require("../services/reportService");
const reportExportService = require("../services/reportExportService");
const logger = require("../config/logging");
const { getPagination } = require("../utils/helpers");

const getReportFilters = (req) => ({
  startDate: req.query.start_date,
  endDate: req.query.end_date,
});

const renderReport = async ({
  req,
  res,
  logLabel,
  generator,
  view,
  mapResult = (data) => ({ reportData: data }),
  includeFilters = true,
  exportHandlers = null,
  exportPrefix = "laporan",
}) => {
  try {
    logger.info(`${logLabel} by user: ${req.user.id}`);

    const reportBasePath = req.originalUrl.startsWith("/admin/")
      ? "/admin/laporan"
      : "/laporan";
    const filters = includeFilters ? getReportFilters(req) : undefined;
    const result = await (includeFilters
      ? generator.call(reportService, filters)
      : generator.call(reportService));

    const format = (req.query.format || "").toLowerCase();
    if (format && exportHandlers && exportHandlers[format]) {
      const { buffer, contentType, extension } = await exportHandlers[format](
        result,
        filters,
      );
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "")
        .slice(0, 15);
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${exportPrefix}-${timestamp}.${extension}"`,
      );
      return res.send(buffer);
    }

    res.render(view, {
      user: req.user,
      filters,
      reportBasePath,
      ...mapResult(result),
    });
  } catch (error) {
    logger.error(`Error in ${logLabel}:`, error);
    res.status(500).send("Terjadi kesalahan");
  }
};

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
    res.render("admin/user/tambah", {
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
    res.status(400).render("admin/user/tambah", {
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
  return renderReport({
    req,
    res,
    logLabel: "Admin report dashboard",
    generator: reportService.generateReportDashboard,
    view: "admin/laporan/index",
    includeFilters: false,
    mapResult: (dashboardData) => ({
      title: dashboardData.title,
      dashboardData,
    }),
  });
};

/**
 * Display petugas report dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered petugas report dashboard view
 */
const petugasReportIndex = async (req, res) => {
  return renderReport({
    req,
    res,
    logLabel: "Petugas report dashboard",
    generator: reportService.generatePetugasReportDashboard,
    view: "petugas/laporan/index",
    includeFilters: false,
    mapResult: (dashboardData) => ({
      title: dashboardData.title,
      dashboardData,
    }),
  });
};

/**
 * Generate user report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered user report view
 */
const generateUserReport = async (req, res) => {
  return renderReport({
    req,
    res,
    logLabel: "Generating user report",
    generator: reportService.generateUserReport,
    view: "admin/laporan/user",
    exportPrefix: "laporan-user",
    exportHandlers: {
      pdf: async (reportData, filters) => ({
        buffer: await reportExportService.buildUserPdf(reportData, filters),
        contentType: "application/pdf",
        extension: "pdf",
      }),
      excel: async (reportData, filters) => ({
        buffer: await reportExportService.buildUserExcel(reportData, filters),
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: "xlsx",
      }),
    },
    mapResult: (reportData) => ({
      title: reportData.title,
      reportData,
    }),
  });
};

/**
 * Generate inventory report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered inventory report view
 */
const generateInventoryReport = async (req, res) => {
  return renderReport({
    req,
    res,
    logLabel: "Generating inventory report",
    generator: reportService.generateInventoryReport,
    view: "admin/laporan/alat",
    exportPrefix: "laporan-alat",
    exportHandlers: {
      pdf: async (reportData) => ({
        buffer: await reportExportService.buildInventoryPdf(reportData),
        contentType: "application/pdf",
        extension: "pdf",
      }),
      excel: async (reportData) => ({
        buffer: await reportExportService.buildInventoryExcel(reportData),
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: "xlsx",
      }),
    },
    mapResult: (reportData) => ({
      title: reportData.title,
      reportData,
    }),
  });
};

/**
 * Generate peminjaman report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered peminjaman report view
 */
const generatePeminjamanReport = async (req, res) => {
  return renderReport({
    req,
    res,
    logLabel: "Generating peminjaman report",
    generator: reportService.generatePeminjamanReport,
    view: "admin/laporan/peminjaman",
    exportPrefix: "laporan-peminjaman",
    exportHandlers: {
      pdf: async (reportData, filters) => ({
        buffer: await reportExportService.buildPeminjamanPdf(
          reportData,
          filters,
        ),
        contentType: "application/pdf",
        extension: "pdf",
      }),
      excel: async (reportData, filters) => ({
        buffer: await reportExportService.buildPeminjamanExcel(
          reportData,
          filters,
        ),
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: "xlsx",
      }),
    },
    mapResult: (reportData) => ({
      title: reportData.title,
      reportData,
    }),
  });
};

/**
 * Generate activity report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered activity report view
 */
const generateActivityReport = async (req, res) => {
  return renderReport({
    req,
    res,
    logLabel: "Generating activity report",
    generator: reportService.generateActivityReport,
    view: "admin/laporan/activity",
    exportPrefix: "laporan-aktivitas",
    exportHandlers: {
      pdf: async (reportData, filters) => ({
        buffer: await reportExportService.buildActivityPdf(reportData, filters),
        contentType: "application/pdf",
        extension: "pdf",
      }),
      excel: async (reportData, filters) => ({
        buffer: await reportExportService.buildActivityExcel(
          reportData,
          filters,
        ),
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: "xlsx",
      }),
    },
    mapResult: (reportData) => ({
      title: reportData.title,
      reportData,
    }),
  });
};

/**
 * Generate statistics dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered statistics view
 */
const generateStatistics = async (req, res) => {
  return renderReport({
    req,
    res,
    logLabel: "Generating statistics",
    generator: reportService.generateStatistics,
    view: "admin/laporan/statistics",
    includeFilters: false,
    exportPrefix: "laporan-statistik",
    exportHandlers: {
      pdf: async (stats) => ({
        buffer: await reportExportService.buildStatisticsPdf(stats),
        contentType: "application/pdf",
        extension: "pdf",
      }),
      excel: async (stats) => ({
        buffer: await reportExportService.buildStatisticsExcel(stats),
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: "xlsx",
      }),
    },
    mapResult: (stats) => ({
      title: "Statistik Sistem",
      stats,
    }),
  });
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
