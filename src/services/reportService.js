const User = require("../models/User");
const Kategori = require("../models/Kategori");
const Alat = require("../models/Alat");
const Peminjaman = require("../models/Peminjaman");
const LogAktivitas = require("../models/LogAktivitas");
const { cacheHelper } = require("../middleware/caching");
const logger = require("../config/logging");
const { ROLES } = require("../utils/constants");

/**
 * Report Service
 * Service layer for generating system reports
 */
class ReportService {
  /**
   * Generate user report data
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - User report data
   */
  async generateUserReport(filters = {}) {
    const cacheKey = `user_report_${JSON.stringify(filters)}`;
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("User report: Cache hit");
      return cachedData;
    }

    const { startDate, endDate } = this.parseDateFilters(filters);

    const whereClause = {
      role: {
        [require("sequelize").Op.ne]: ROLES.ADMIN,
      },
    };

    if (
      startDate &&
      endDate &&
      startDate instanceof Date &&
      endDate instanceof Date
    ) {
      whereClause.created_at = {
        [require("sequelize").Op.between]: [startDate, endDate],
      };
    }

    const users = await User.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
    });

    const stats = {
      total: users.length,
      petugas: users.filter((u) => u.role === ROLES.PETUGAS).length,
      peminjam: users.filter((u) => u.role === ROLES.PEMINJAM).length,
      period: {
        start: startDate,
        end: endDate,
      },
    };

    const reportData = {
      title: "Laporan User Sistem",
      generatedAt: new Date(),
      stats,
      users,
    };

    // Cache for 10 minutes
    cacheHelper.set(cacheKey, reportData, 600);
    return reportData;
  }

  /**
   * Generate inventory report data
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Inventory report data
   */
  async generateInventoryReport(filters = {}) {
    const cacheKey = `inventory_report_${JSON.stringify(filters)}`;
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Inventory report: Cache hit");
      return cachedData;
    }

    const alat = await Alat.findAll({
      include: [
        {
          model: Kategori,
          as: "kategori",
        },
      ],
      order: [["nama_alat", "ASC"]],
    });

    const stats = {
      total: alat.length,
      tersedia: alat.filter((a) => a.status === "tersedia").length,
      dipinjam: alat.filter((a) => a.status === "dipinjam").length,
      rusak: alat.filter((a) => a.status === "rusak").length,
      baik: alat.filter((a) => a.kondisi === "baik").length,
      rusakKondisi: alat.filter((a) => a.kondisi === "rusak").length,
    };

    const kategoriStats = {};
    alat.forEach((item) => {
      const kategori = item.kategori?.nama_kategori || "Tidak Diketahui";
      if (!kategoriStats[kategori]) {
        kategoriStats[kategori] = {
          total: 0,
          tersedia: 0,
          dipinjam: 0,
          rusak: 0,
        };
      }
      kategoriStats[kategori].total++;
      kategoriStats[kategori][item.status]++;
    });

    const reportData = {
      title: "Laporan Inventori Alat",
      generatedAt: new Date(),
      stats,
      kategoriStats,
      alat,
    };

    // Cache for 5 minutes
    cacheHelper.set(cacheKey, reportData, 300);
    return reportData;
  }

  /**
   * Generate peminjaman report data
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Peminjaman report data
   */
  async generatePeminjamanReport(filters = {}) {
    const cacheKey = `peminjaman_report_${JSON.stringify(filters)}`;
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Peminjaman report: Cache hit");
      return cachedData;
    }

    const { startDate, endDate } = this.parseDateFilters(filters);

    const peminjaman = await Peminjaman.findAll({
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: Alat,
          as: "alat",
          include: [
            {
              model: Kategori,
              as: "kategori",
            },
          ],
        },
      ],
      where: {
        ...(startDate &&
          endDate && {
            tanggal_pinjam: {
              [require("sequelize").Op.between]: [startDate, endDate],
            },
          }),
      },
      order: [["tanggal_pinjam", "DESC"]],
    });

    const stats = {
      total: peminjaman.length,
      diproses: peminjaman.filter((p) => p.status === "diproses").length,
      dipinjam: peminjaman.filter((p) => p.status === "dipinjam").length,
      selesai: peminjaman.filter((p) => p.status === "selesai").length,
      ditolak: peminjaman.filter((p) => p.status === "ditolak").length,
      period: {
        start: startDate,
        end: endDate,
      },
    };

    // Calculate popular items
    const popularItems = {};
    peminjaman.forEach((p) => {
      const itemName = p.alat?.nama_alat || "Tidak Diketahui";
      if (!popularItems[itemName]) {
        popularItems[itemName] = 0;
      }
      popularItems[itemName]++;
    });

    const reportData = {
      title: "Laporan Peminjaman",
      generatedAt: new Date(),
      stats,
      popularItems,
      peminjaman,
    };

    // Cache for 5 minutes
    cacheHelper.set(cacheKey, reportData, 300);
    return reportData;
  }

  /**
   * Generate activity report data
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Activity report data
   */
  async generateActivityReport(filters = {}) {
    const cacheKey = `activity_report_${JSON.stringify(filters)}`;
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Activity report: Cache hit");
      return cachedData;
    }

    const { startDate, endDate } = this.parseDateFilters(filters);

    const logs = await LogAktivitas.findAll({
      include: [
        {
          model: User,
          as: "user",
        },
      ],
      where: {
        ...(startDate &&
          endDate && {
            waktu: {
              [require("sequelize").Op.between]: [startDate, endDate],
            },
          }),
      },
      order: [["waktu", "DESC"]],
    });

    const stats = {
      total: logs.length,
      perUser: this.groupByUser(logs),
      perActivity: this.groupByActivity(logs),
      period: {
        start: startDate,
        end: endDate,
      },
    };

    const reportData = {
      title: "Laporan Aktivitas Sistem",
      generatedAt: new Date(),
      stats,
      logs,
    };

    // Cache for 5 minutes
    cacheHelper.set(cacheKey, reportData, 300);
    return reportData;
  }

  /**
   * Generate statistics for dashboard
   * @returns {Promise<Object>} - Statistics data
   */
  async generateStatistics() {
    const cacheKey = "dashboard_statistics";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Dashboard statistics: Cache hit");
      return cachedData;
    }

    const [
      userStats,
      alatStats,
      peminjamanStats,
      kategoriStats,
      activityStats,
    ] = await Promise.all([
      this.getUserStatistics(),
      this.getAlatStatistics(),
      this.getPeminjamanStatistics(),
      this.getKategoriStatistics(),
      this.getActivityStatistics(),
    ]);

    const stats = {
      users: userStats,
      alat: alatStats,
      peminjaman: peminjamanStats,
      kategori: kategoriStats,
      aktivitas: activityStats,
      generatedAt: new Date(),
    };

    // Cache for 2 minutes
    cacheHelper.set(cacheKey, stats, 120);
    return stats;
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} - User statistics
   */
  async getUserStatistics() {
    const totalUsers = await User.count({
      where: {
        role: {
          [require("sequelize").Op.ne]: ROLES.ADMIN,
        },
      },
    });

    const roleDistribution = await User.findAll({
      attributes: ["role", [require("sequelize").fn("COUNT", "*"), "count"]],
      where: {
        role: {
          [require("sequelize").Op.ne]: ROLES.ADMIN,
        },
      },
      group: ["role"],
    });

    return {
      total: totalUsers,
      byRole: roleDistribution.reduce((acc, item) => {
        acc[item.role] = parseInt(item.get("count"));
        return acc;
      }, {}),
    };
  }

  /**
   * Get alat statistics
   * @returns {Promise<Object>} - Alat statistics
   */
  async getAlatStatistics() {
    const totalAlat = await Alat.count();

    const statusDistribution = await Alat.findAll({
      attributes: ["status", [require("sequelize").fn("COUNT", "*"), "count"]],
      group: ["status"],
    });

    const kondisiDistribution = await Alat.findAll({
      attributes: ["kondisi", [require("sequelize").fn("COUNT", "*"), "count"]],
      group: ["kondisi"],
    });

    return {
      total: totalAlat,
      byStatus: statusDistribution.reduce((acc, item) => {
        acc[item.status] = parseInt(item.get("count"));
        return acc;
      }, {}),
      byKondisi: kondisiDistribution.reduce((acc, item) => {
        acc[item.kondisi] = parseInt(item.get("count"));
        return acc;
      }, {}),
    };
  }

  /**
   * Get peminjaman statistics
   * @returns {Promise<Object>} - Peminjaman statistics
   */
  async getPeminjamanStatistics() {
    const totalPeminjaman = await Peminjaman.count();

    const statusDistribution = await Peminjaman.findAll({
      attributes: ["status", [require("sequelize").fn("COUNT", "*"), "count"]],
      group: ["status"],
    });

    return {
      total: totalPeminjaman,
      byStatus: statusDistribution.reduce((acc, item) => {
        acc[item.status] = parseInt(item.get("count"));
        return acc;
      }, {}),
    };
  }

  /**
   * Get kategori statistics
   * @returns {Promise<Object>} - Kategori statistics
   */
  async getKategoriStatistics() {
    const totalKategori = await Kategori.count();

    const alatPerKategori = await Alat.findAll({
      attributes: [
        "kategori_id",
        [require("sequelize").fn("COUNT", "*"), "count"],
      ],
      group: ["kategori_id"],
    });

    return {
      total: totalKategori,
      alatPerKategori: alatPerKategori.map((item) => ({
        kategori_id: item.kategori_id,
        count: parseInt(item.get("count")),
      })),
    };
  }

  /**
   * Get activity statistics
   * @returns {Promise<Object>} - Activity statistics
   */
  async getActivityStatistics() {
    const totalLogs = await LogAktivitas.count();

    const recentLogs = await LogAktivitas.findAll({
      limit: 10,
      order: [["waktu", "DESC"]],
    });

    return {
      total: totalLogs,
      recent: recentLogs,
    };
  }

  /**
   * Parse date filters
   * @param {Object} filters - Filter options
   * @returns {Object} - Parsed date filters
   */
  parseDateFilters(filters) {
    let startDate = null;
    let endDate = null;

    if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Include full end date
    }

    return { startDate, endDate };
  }

  /**
   * Group logs by user
   * @param {Array} logs - Activity logs
   * @returns {Object} - Grouped by user
   */
  groupByUser(logs) {
    const grouped = {};
    logs.forEach((log) => {
      const username = log.user?.username || "System";
      if (!grouped[username]) {
        grouped[username] = 0;
      }
      grouped[username]++;
    });
    return grouped;
  }

  /**
   * Group logs by activity type
   * @param {Array} logs - Activity logs
   * @returns {Object} - Grouped by activity
   */
  groupByActivity(logs) {
    const grouped = {};
    logs.forEach((log) => {
      const activity = log.aktivitas.split(":")[0]; // Get first part of activity
      if (!grouped[activity]) {
        grouped[activity] = 0;
      }
      grouped[activity]++;
    });
    return grouped;
  }

  /**
   * Invalidate report cache
   * @returns {void}
   */
  invalidateCache() {
    cacheHelper.del("dashboard_statistics");
    // Clear all report caches - we need to use a different approach since cacheHelper.cache may not be accessible
    // For now, we'll manually delete known report cache keys
    const reportKeys = [
      "user_report_{}",
      "inventory_report_{}",
      "peminjaman_report_{}",
      "activity_report_{}",
      "report_dashboard",
      "petugas_report_dashboard",
    ];

    reportKeys.forEach((key) => {
      cacheHelper.del(key);
    });
  }

  /**
   * Generate report dashboard data
   * @returns {Promise<Object>} - Report dashboard data
   */
  async generateReportDashboard() {
    const cacheKey = "report_dashboard";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Report dashboard: Cache hit");
      return cachedData;
    }

    const dashboardData = {
      title: "Laporan Sistem",
      generatedAt: new Date(),
      sections: [
        {
          name: "User Report",
          description: "Laporan pengguna sistem",
          url: "/admin/laporan/user",
        },
        {
          name: "Inventory Report",
          description: "Laporan inventori alat",
          url: "/admin/laporan/alat",
        },
        {
          name: "Peminjaman Report",
          description: "Laporan peminjaman alat",
          url: "/admin/laporan/peminjaman",
        },
        {
          name: "Activity Report",
          description: "Laporan aktivitas sistem",
          url: "/admin/laporan/aktivitas",
        },
        {
          name: "Statistics",
          description: "Statistik sistem",
          url: "/admin/laporan/statistik",
        },
      ],
    };

    // Cache for 10 minutes
    cacheHelper.set(cacheKey, dashboardData, 600);
    return dashboardData;
  }

  /**
   * Generate petugas report dashboard data
   * @returns {Promise<Object>} - Petugas report dashboard data
   */
  async generatePetugasReportDashboard() {
    const cacheKey = "petugas_report_dashboard";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Petugas report dashboard: Cache hit");
      return cachedData;
    }

    const dashboardData = {
      title: "Laporan Petugas",
      generatedAt: new Date(),
      sections: [
        {
          name: "User Report",
          description: "Laporan pengguna sistem",
          url: "/laporan/user",
        },
        {
          name: "Inventory Report",
          description: "Laporan inventori alat",
          url: "/laporan/alat",
        },
        {
          name: "Peminjaman Report",
          description: "Laporan peminjaman alat",
          url: "/laporan/peminjaman",
        },
        {
          name: "Activity Report",
          description: "Laporan aktivitas sistem",
          url: "/laporan/aktivitas",
        },
        {
          name: "Statistics",
          description: "Statistik sistem",
          url: "/laporan/statistik",
        },
      ],
    };

    // Cache for 10 minutes
    cacheHelper.set(cacheKey, dashboardData, 600);
    return dashboardData;
  }
}

module.exports = new ReportService();
