// Mock cache helper
const mockCacheHelper = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock("../../src/middleware/caching", () => ({
  cacheHelper: mockCacheHelper,
}));

jest.mock("../../src/config/logging", () => mockLogger);

jest.mock("../../src/models/User", () => ({
  findAll: jest.fn(),
  count: jest.fn(),
}));

jest.mock("../../src/models/Kategori", () => ({
  count: jest.fn(),
}));

jest.mock("../../src/models/Alat", () => ({
  findAll: jest.fn(),
  count: jest.fn(),
}));

jest.mock("../../src/models/Peminjaman", () => ({
  findAll: jest.fn(),
  count: jest.fn(),
}));

jest.mock("../../src/models/LogAktivitas", () => ({
  findAll: jest.fn(),
  count: jest.fn(),
}));

describe("ReportService", () => {
  let reportService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    reportService = require("../../src/services/reportService");
    reportService.logger = mockLogger;
  });

  describe("generateUserReport", () => {
    it("should return cached report", async () => {
      const cached = { title: "cached" };
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await reportService.generateUserReport();

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith("User report: Cache hit");
    });

    it("should generate report and cache", async () => {
      mockCacheHelper.get.mockReturnValue(null);

      const User = require("../../src/models/User");
      User.findAll.mockResolvedValue([
        { id: 1, role: "petugas" },
        { id: 2, role: "peminjam" },
      ]);

      const result = await reportService.generateUserReport({});

      expect(result.stats.total).toBe(2);
      expect(result.stats.petugas).toBe(1);
      expect(result.stats.peminjam).toBe(1);
      expect(mockCacheHelper.set).toHaveBeenCalled();
    });
  });

  describe("generateInventoryReport", () => {
    it("should return cached report", async () => {
      const cached = { title: "cached" };
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await reportService.generateInventoryReport();

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Inventory report: Cache hit",
      );
    });

    it("should generate report with kategori stats", async () => {
      mockCacheHelper.get.mockReturnValue(null);

      const Alat = require("../../src/models/Alat");
      Alat.findAll.mockResolvedValue([
        {
          nama_alat: "Laptop",
          status: "tersedia",
          kondisi: "baik",
          kategori: { nama_kategori: "Elektronik" },
        },
        {
          nama_alat: "Printer",
          status: "dipinjam",
          kondisi: "rusak",
          kategori: { nama_kategori: "Elektronik" },
        },
      ]);

      const result = await reportService.generateInventoryReport();

      expect(result.stats.total).toBe(2);
      expect(result.stats.tersedia).toBe(1);
      expect(result.kategoriStats.Elektronik.total).toBe(2);
      expect(mockCacheHelper.set).toHaveBeenCalled();
    });
  });

  describe("generatePeminjamanReport", () => {
    it("should return cached report", async () => {
      const cached = { title: "cached" };
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await reportService.generatePeminjamanReport();

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Peminjaman report: Cache hit",
      );
    });

    it("should generate report with popular items", async () => {
      mockCacheHelper.get.mockReturnValue(null);

      const Peminjaman = require("../../src/models/Peminjaman");
      Peminjaman.findAll.mockResolvedValue([
        { status: "dipinjam", alat: { nama_alat: "Laptop" } },
        { status: "ditolak", alat: { nama_alat: "Laptop" } },
      ]);

      const result = await reportService.generatePeminjamanReport();

      expect(result.stats.total).toBe(2);
      expect(result.popularItems.Laptop).toBe(2);
      expect(mockCacheHelper.set).toHaveBeenCalled();
    });
  });

  describe("generateActivityReport", () => {
    it("should return cached report", async () => {
      const cached = { title: "cached" };
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await reportService.generateActivityReport();

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Activity report: Cache hit",
      );
    });

    it("should generate report with grouping", async () => {
      mockCacheHelper.get.mockReturnValue(null);

      const LogAktivitas = require("../../src/models/LogAktivitas");
      LogAktivitas.findAll.mockResolvedValue([
        { user: { username: "alice" }, aktivitas: "Login: ok" },
        { user: { username: "alice" }, aktivitas: "Logout: ok" },
        { user: { username: "bob" }, aktivitas: "Login: ok" },
      ]);

      const result = await reportService.generateActivityReport();

      expect(result.stats.total).toBe(3);
      expect(result.stats.perUser.alice).toBe(2);
      expect(result.stats.perActivity.Login).toBe(2);
      expect(mockCacheHelper.set).toHaveBeenCalled();
    });
  });

  describe("generateStatistics", () => {
    it("should return cached statistics", async () => {
      const cached = { users: { total: 1 } };
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await reportService.generateStatistics();

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Dashboard statistics: Cache hit",
      );
    });

    it("should generate and cache statistics", async () => {
      mockCacheHelper.get.mockReturnValue(null);

      jest
        .spyOn(reportService, "getUserStatistics")
        .mockResolvedValue({ total: 2, byRole: {} });
      jest
        .spyOn(reportService, "getAlatStatistics")
        .mockResolvedValue({ total: 3, byStatus: {}, byKondisi: {} });
      jest
        .spyOn(reportService, "getPeminjamanStatistics")
        .mockResolvedValue({ total: 4, byStatus: {} });
      jest
        .spyOn(reportService, "getKategoriStatistics")
        .mockResolvedValue({ total: 1, alatPerKategori: [] });
      jest
        .spyOn(reportService, "getActivityStatistics")
        .mockResolvedValue({ total: 5, recent: [] });

      const result = await reportService.generateStatistics();

      expect(result.users.total).toBe(2);
      expect(mockCacheHelper.set).toHaveBeenCalledWith(
        "dashboard_statistics",
        result,
        120,
      );
    });
  });

  describe("getUserStatistics", () => {
    it("should build distribution map", async () => {
      const User = require("../../src/models/User");
      User.count.mockResolvedValue(3);
      User.findAll.mockResolvedValue([
        { role: "petugas", get: () => "2" },
        { role: "peminjam", get: () => "1" },
      ]);

      const result = await reportService.getUserStatistics();

      expect(result.total).toBe(3);
      expect(result.byRole.petugas).toBe(2);
    });
  });

  describe("getAlatStatistics", () => {
    it("should build status and kondisi map", async () => {
      const Alat = require("../../src/models/Alat");
      Alat.count.mockResolvedValue(4);
      Alat.findAll
        .mockResolvedValueOnce([
          { status: "tersedia", get: () => "2" },
          { status: "dipinjam", get: () => "2" },
        ])
        .mockResolvedValueOnce([
          { kondisi: "baik", get: () => "3" },
          { kondisi: "rusak", get: () => "1" },
        ]);

      const result = await reportService.getAlatStatistics();

      expect(result.total).toBe(4);
      expect(result.byStatus.tersedia).toBe(2);
      expect(result.byKondisi.rusak).toBe(1);
    });
  });

  describe("getPeminjamanStatistics", () => {
    it("should build status map", async () => {
      const Peminjaman = require("../../src/models/Peminjaman");
      Peminjaman.count.mockResolvedValue(2);
      Peminjaman.findAll.mockResolvedValue([
        { status: "dipinjam", get: () => "1" },
        { status: "ditolak", get: () => "1" },
      ]);

      const result = await reportService.getPeminjamanStatistics();

      expect(result.total).toBe(2);
      expect(result.byStatus.dipinjam).toBe(1);
    });
  });

  describe("getKategoriStatistics", () => {
    it("should map kategori counts", async () => {
      const Kategori = require("../../src/models/Kategori");
      const Alat = require("../../src/models/Alat");
      Kategori.count.mockResolvedValue(1);
      Alat.findAll.mockResolvedValue([{ kategori_id: 1, get: () => "4" }]);

      const result = await reportService.getKategoriStatistics();

      expect(result.total).toBe(1);
      expect(result.alatPerKategori[0]).toStrictEqual({
        kategori_id: 1,
        count: 4,
      });
    });
  });

  describe("getActivityStatistics", () => {
    it("should return total and recent logs", async () => {
      const LogAktivitas = require("../../src/models/LogAktivitas");
      LogAktivitas.count.mockResolvedValue(2);
      LogAktivitas.findAll.mockResolvedValue([{ id: 1 }]);

      const result = await reportService.getActivityStatistics();

      expect(result.total).toBe(2);
      expect(result.recent.length).toBe(1);
    });
  });

  describe("parseDateFilters", () => {
    it("should parse dates and set end date time", () => {
      const result = reportService.parseDateFilters({
        startDate: "2026-02-01",
        endDate: "2026-02-02",
      });

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.endDate.getHours()).toBe(23);
    });
  });

  describe("groupByUser/groupByActivity", () => {
    it("should group logs", () => {
      const logs = [
        { user: { username: "alice" }, aktivitas: "Login: ok" },
        { user: null, aktivitas: "Login: ok" },
      ];

      const byUser = reportService.groupByUser(logs);
      const byActivity = reportService.groupByActivity(logs);

      expect(byUser.alice).toBe(1);
      expect(byUser.System).toBe(1);
      expect(byActivity.Login).toBe(2);
    });
  });

  describe("invalidateCache", () => {
    it("should remove known keys", () => {
      reportService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("dashboard_statistics");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("user_report_{}");
      expect(mockCacheHelper.del).toHaveBeenCalledWith(
        "petugas_report_dashboard",
      );
    });
  });

  describe("generateReportDashboard", () => {
    it("should return cached dashboard", async () => {
      const cached = { title: "cached" };
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await reportService.generateReportDashboard();

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Report dashboard: Cache hit",
      );
    });

    it("should generate dashboard data", async () => {
      mockCacheHelper.get.mockReturnValue(null);

      const result = await reportService.generateReportDashboard();

      expect(result.sections[0].url).toBe("/admin/laporan/user");
      expect(mockCacheHelper.set).toHaveBeenCalledWith(
        "report_dashboard",
        result,
        600,
      );
    });
  });

  describe("generatePetugasReportDashboard", () => {
    it("should return cached dashboard", async () => {
      const cached = { title: "cached" };
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await reportService.generatePetugasReportDashboard();

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Petugas report dashboard: Cache hit",
      );
    });

    it("should generate dashboard data", async () => {
      mockCacheHelper.get.mockReturnValue(null);

      const result = await reportService.generatePetugasReportDashboard();

      expect(result.sections[0].url).toBe("/laporan/user");
      expect(mockCacheHelper.set).toHaveBeenCalledWith(
        "petugas_report_dashboard",
        result,
        600,
      );
    });
  });
});
