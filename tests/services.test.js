// Mock models
const mockUser = {
  id: 1,
  nama: "Test User",
  username: "testuser",
  email: "test@example.com",
  role: "peminjam",
  password: "hashedpassword",
  save: jest.fn(),
  destroy: jest.fn(),
};

const mockAlat = {
  id: 1,
  nama_alat: "Test Alat",
  kategori_id: 1,
  kondisi: "baik",
  status: "tersedia",
  stok: 5,
  save: jest.fn(),
  destroy: jest.fn(),
};

const mockKategori = {
  id: 1,
  nama_kategori: "Test Kategori",
  deskripsi: "Test Description",
  save: jest.fn(),
  destroy: jest.fn(),
};

const mockPeminjaman = {
  id: 1,
  user_id: 1,
  alat_id: 1,
  tanggal_pinjam: new Date(),
  tanggal_kembali: new Date(),
  status: "pending",
  save: jest.fn(),
  destroy: jest.fn(),
};

const mockLogAktivitas = {
  id: 1,
  user_id: 1,
  aktivitas: "Test activity",
  waktu: new Date(),
  save: jest.fn(),
};

// Mock cache helper at module level
const mockCacheHelper = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  cache: {}, // Add cache property for reportService
};

// Mock logger at module level
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock the caching middleware at module level
jest.mock("../src/middleware/caching", () => ({
  cacheHelper: mockCacheHelper,
}));

// Mock the logger import for reportService
jest.mock("../src/config/logging", () => mockLogger);

describe("Service Tests", () => {
  let userService,
    alatService,
    kategoriService,
    peminjamanService,
    reportService;

  beforeAll(() => {
    // Mock database connection to prevent actual connections during tests
    jest.mock("../src/config/database", () => ({
      sequelize: {
        authenticate: jest.fn(),
        sync: jest.fn(),
      },
      testConnection: jest.fn(),
    }));

    // Mock models to prevent database operations
    jest.mock("../src/models/User", () => ({
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findByPk: jest.fn(),
      count: jest.fn(),
    }));

    jest.mock("../src/models/Alat", () => ({
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    }));

    jest.mock("../src/models/Kategori", () => ({
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    }));

    jest.mock("../src/models/Peminjaman", () => ({
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    }));

    jest.mock("../src/models/LogAktivitas", () => ({
      create: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    }));
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock services with dependencies
    userService = require("../src/services/userService");
    alatService = require("../src/services/alatService");
    kategoriService = require("../src/services/kategoriService");
    peminjamanService = require("../src/services/peminjamanService");
    reportService = require("../src/services/reportService");

    // Replace dependencies with mocks
    userService.logger = mockLogger;
    alatService.logger = mockLogger;
    kategoriService.logger = mockLogger;
    peminjamanService.logger = mockLogger;
    reportService.logger = mockLogger;
  });

  describe("UserService", () => {
    describe("getDashboardStats", () => {
      it("should return cached stats if available", async () => {
        const cachedStats = {
          kategori: 5,
          alat: 10,
          peminjaman: 3,
          user: 8,
        };

        mockCacheHelper.get.mockReturnValue(cachedStats);

        const result = await userService.getDashboardStats();

        expect(result).toStrictEqual(cachedStats);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Admin dashboard: Cache hit",
        );
      });

      it("should fetch and cache stats if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        // Mock count methods to return actual values
        jest.spyOn(userService, "getKategoriCount").mockResolvedValue(5);
        jest.spyOn(userService, "getAlatCount").mockResolvedValue(10);
        jest.spyOn(userService, "getPeminjamanCount").mockResolvedValue(3);
        jest.spyOn(userService, "getUserCount").mockResolvedValue(8);

        const result = await userService.getDashboardStats();

        expect(result).toStrictEqual({
          kategori: 5,
          alat: 10,
          peminjaman: 3,
          user: 8,
        });
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "admin_dashboard_stats",
          result,
          300,
        );
      });
    });

    describe("getAllUsers", () => {
      it("should return cached users if available", async () => {
        const cachedUsers = [mockUser];
        mockCacheHelper.get.mockReturnValue(cachedUsers);

        const result = await userService.getAllUsers();

        expect(result).toStrictEqual(cachedUsers);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Admin user index: Cache hit",
        );
      });

      it("should fetch users from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockUsers = [mockUser];
        const User = require("../src/models/User");
        jest.spyOn(User, "findAll").mockResolvedValue(mockUsers);

        const result = await userService.getAllUsers();

        expect(result).toStrictEqual(mockUsers);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "admin_user_index",
          mockUsers,
          600,
        );
      });
    });

    describe("create", () => {
      it("should create user successfully", async () => {
        const userData = {
          nama: "New User",
          username: "newuser",
          email: "new@example.com",
          password: "password123",
          role: "peminjam",
        };

        const adminUser = { id: 1, nama: "Admin" };

        // Mock User.findOne to return null (no existing user)
        const User = require("../src/models/User");
        jest.spyOn(User, "findOne").mockResolvedValue(null);

        // Mock User.create
        jest.spyOn(User, "create").mockResolvedValue(mockUser);

        // Mock LogAktivitas.create
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await userService.create(userData, adminUser);

        expect(result).toBe(mockUser);
        expect(User.create).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      });

      it("should throw error if username already exists", async () => {
        const userData = {
          nama: "New User",
          username: "existinguser",
          email: "new@example.com",
          password: "password123",
          role: "peminjam",
        };

        const adminUser = { id: 1, nama: "Admin" };

        // Mock User.findOne to return existing user
        const User = require("../src/models/User");
        jest.spyOn(User, "findOne").mockResolvedValue(mockUser);

        await expect(userService.create(userData, adminUser)).rejects.toThrow(
          "Username sudah digunakan",
        );
      });
    });

    describe("delete", () => {
      it("should delete user successfully", async () => {
        const adminUser = { id: 1, nama: "Admin" };

        // Mock getById
        jest.spyOn(userService, "getById").mockResolvedValue(mockUser);

        // Mock LogAktivitas.create
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        await userService.delete(1, adminUser);

        expect(mockUser.destroy).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      });

      it("should throw error if trying to delete admin", async () => {
        const adminUser = { id: 1, nama: "Admin" };
        const adminUserToDelete = { ...mockUser, role: "admin" };

        jest.spyOn(userService, "getById").mockResolvedValue(adminUserToDelete);

        await expect(userService.delete(1, adminUser)).rejects.toThrow(
          "Tidak dapat menghapus user admin lain",
        );
      });
    });
  });

  describe("AlatService", () => {
    describe("getAllAvailable", () => {
      it("should return cached alat if available", async () => {
        const cachedAlat = [mockAlat];
        mockCacheHelper.get.mockReturnValue(cachedAlat);

        const result = await alatService.getAllAvailable();

        expect(result).toStrictEqual(cachedAlat);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Alat index (user): Cache hit",
        );
      });

      it("should fetch alat from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockAlatList = [mockAlat];
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findAll").mockResolvedValue(mockAlatList);

        const result = await alatService.getAllAvailable();

        expect(result).toStrictEqual(mockAlatList);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "alat_user_index",
          mockAlatList,
          300,
        );
      });
    });

    describe("create", () => {
      it("should create alat successfully", async () => {
        const alatData = {
          nama_alat: "New Alat",
          kategori_id: 1,
          kondisi: "baik",
          stok: 5,
        };

        const user = { id: 1, nama: "User" };

        // Mock Alat.create
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "create").mockResolvedValue(mockAlat);

        // Mock LogAktivitas.create
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await alatService.create(alatData, user);

        expect(result).toBe(mockAlat);
        expect(Alat.create).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      });
    });

    describe("isAvailable", () => {
      it("should return true if alat is available", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          status: "tersedia",
          stok: 5,
        });

        const result = await alatService.isAvailable(1);

        expect(result).toBe(true);
      });

      it("should return false if alat is not available", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          status: "dipinjam",
          stok: 0,
        });

        const result = await alatService.isAvailable(1);

        expect(result).toBe(false);
      });
    });
  });

  describe("KategoriService", () => {
    describe("getAll", () => {
      it("should return cached kategori if available", async () => {
        const cachedKategori = [mockKategori];
        mockCacheHelper.get.mockReturnValue(cachedKategori);

        const result = await kategoriService.getAll();

        expect(result).toStrictEqual(cachedKategori);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Kategori index: Cache hit",
        );
      });

      it("should fetch kategori from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockKategoriList = [mockKategori];
        const Kategori = require("../src/models/Kategori");
        jest.spyOn(Kategori, "findAll").mockResolvedValue(mockKategoriList);

        const result = await kategoriService.getAll();

        expect(result).toStrictEqual(mockKategoriList);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "kategori_index",
          mockKategoriList,
          600,
        );
      });
    });

    describe("create", () => {
      it("should create kategori successfully", async () => {
        const kategoriData = {
          nama_kategori: "New Kategori",
          deskripsi: "New Description",
        };

        const user = { id: 1, nama: "User" };

        // Mock Kategori.findOne to return null (no existing kategori)
        const Kategori = require("../src/models/Kategori");
        jest.spyOn(Kategori, "findOne").mockResolvedValue(null);

        // Mock Kategori.create
        jest.spyOn(Kategori, "create").mockResolvedValue(mockKategori);

        // Mock LogAktivitas.create
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await kategoriService.create(kategoriData, user);

        expect(result).toBe(mockKategori);
        expect(Kategori.create).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      });

      it("should throw error if kategori name already exists", async () => {
        const kategoriData = {
          nama_kategori: "existingkategori",
          deskripsi: "Description",
        };

        const user = { id: 1, nama: "User" };

        // Mock Kategori.findOne to return existing kategori
        const Kategori = require("../src/models/Kategori");
        jest.spyOn(Kategori, "findOne").mockResolvedValue(mockKategori);

        await expect(
          kategoriService.create(kategoriData, user),
        ).rejects.toThrow("Nama kategori sudah ada");
      });
    });
  });

  describe("PeminjamanService", () => {
    describe("getByUserId", () => {
      it("should return cached peminjaman if available", async () => {
        const cachedPeminjaman = [mockPeminjaman];
        mockCacheHelper.get.mockReturnValue(cachedPeminjaman);

        const result = await peminjamanService.getByUserId(1);

        expect(result).toStrictEqual(cachedPeminjaman);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Peminjaman user index: Cache hit",
        );
      });

      it("should fetch peminjaman from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockPeminjamanList = [mockPeminjaman];
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "findAll").mockResolvedValue(mockPeminjamanList);

        const result = await peminjamanService.getByUserId(1);

        expect(result).toStrictEqual(mockPeminjamanList);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "peminjaman_user_1",
          mockPeminjamanList,
          180,
        );
      });
    });

    describe("create", () => {
      it("should create peminjaman successfully", async () => {
        const peminjamanData = {
          alat_id: 1,
          tanggal_pinjam: "2024-01-01",
          tanggal_kembali: "2024-01-07",
        };

        const user = { id: 1, nama: "User" };

        // Mock Alat.findByPk
        const Alat = require("../src/models/Alat");
        const mockAlatWithUpdate = {
          ...mockAlat,
          status: "tersedia",
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(Alat, "findByPk").mockResolvedValue(mockAlatWithUpdate);

        // Mock Peminjaman.findOne to return null (no existing peminjaman)
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "findOne").mockResolvedValue(null);

        // Mock Peminjaman.create
        jest.spyOn(Peminjaman, "create").mockResolvedValue(mockPeminjaman);

        // Mock LogAktivitas.create
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await peminjamanService.create(peminjamanData, user);

        expect(result).toBe(mockPeminjaman);
        expect(Peminjaman.create).toHaveBeenCalledTimes(1);
        expect(mockAlatWithUpdate.update).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      });

      it("should throw error if alat is not available", async () => {
        const peminjamanData = {
          alat_id: 1,
          tanggal_pinjam: "2024-01-01",
          tanggal_kembali: "2024-01-07",
        };

        const user = { id: 1, nama: "User" };

        // Mock Alat.findByPk
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          status: "dipinjam",
        });

        await expect(
          peminjamanService.create(peminjamanData, user),
        ).rejects.toThrow("Alat tidak tersedia untuk dipinjam");
      });
    });

    describe("approve", () => {
      it("should approve peminjaman successfully", async () => {
        const user = { id: 1, nama: "Petugas" };

        // Create a mock peminjaman with nested alat and user objects
        const mockPeminjamanWithRelations = {
          ...mockPeminjaman,
          alat: { nama_alat: "Test Alat" },
          user: { nama: "Test User" },
          update: jest.fn().mockResolvedValue(),
        };

        // Mock getById
        jest
          .spyOn(peminjamanService, "getById")
          .mockResolvedValue(mockPeminjamanWithRelations);

        // Mock Alat.update
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "update").mockResolvedValue();

        // Mock LogAktivitas.create
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await peminjamanService.approve(1, user);

        expect(result).toBe(mockPeminjamanWithRelations);
        expect(mockPeminjamanWithRelations.update).toHaveBeenCalledTimes(1);
        expect(Alat.update).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("ReportService", () => {
    describe("generateUserReport", () => {
      it("should return cached user report if available", async () => {
        const cachedReport = { title: "Laporan User", users: [] };
        mockCacheHelper.get.mockReturnValue(cachedReport);

        const result = await reportService.generateUserReport();

        expect(result).toStrictEqual(cachedReport);
        expect(mockLogger.info).toHaveBeenCalledWith("User report: Cache hit");
      });

      it("should generate user report from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockUsers = [mockUser];
        const User = require("../src/models/User");
        jest.spyOn(User, "findAll").mockResolvedValue(mockUsers);

        const result = await reportService.generateUserReport();

        expect(result.title).toBe("Laporan User Sistem");
        expect(result.users).toStrictEqual(mockUsers);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "user_report_{}",
          result,
          600,
        );
      });
    });

    describe("generateInventoryReport", () => {
      it("should return cached inventory report if available", async () => {
        const cachedReport = { title: "Laporan Inventori", alat: [] };
        mockCacheHelper.get.mockReturnValue(cachedReport);

        const result = await reportService.generateInventoryReport();

        expect(result).toStrictEqual(cachedReport);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Inventory report: Cache hit",
        );
      });

      it("should generate inventory report from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockAlatList = [{ ...mockAlat, status: "tersedia" }];
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findAll").mockResolvedValue(mockAlatList);

        const result = await reportService.generateInventoryReport();

        expect(result.title).toBe("Laporan Inventori Alat");
        expect(result.alat).toStrictEqual(mockAlatList);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "inventory_report_{}",
          result,
          300,
        );
      });
    });

    describe("generateStatistics", () => {
      it("should return cached statistics if available", async () => {
        const cachedStats = { users: {}, alat: {}, peminjaman: {} };
        mockCacheHelper.get.mockReturnValue(cachedStats);

        const result = await reportService.generateStatistics();

        expect(result).toStrictEqual(cachedStats);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Dashboard statistics: Cache hit",
        );
      });

      it("should generate statistics from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        // Mock count methods
        const User = require("../src/models/User");
        const Alat = require("../src/models/Alat");
        const Peminjaman = require("../src/models/Peminjaman");
        const Kategori = require("../src/models/Kategori");
        const LogAktivitas = require("../src/models/LogAktivitas");

        jest.spyOn(User, "count").mockResolvedValue(10);
        jest.spyOn(Alat, "count").mockResolvedValue(5);
        jest.spyOn(Peminjaman, "count").mockResolvedValue(3);
        jest.spyOn(Kategori, "count").mockResolvedValue(2);
        jest.spyOn(LogAktivitas, "count").mockResolvedValue(100);

        // Mock findAll methods for statistics calculations
        jest.spyOn(User, "findAll").mockResolvedValue([
          { role: "peminjam", get: jest.fn().mockReturnValue(7) },
          { role: "petugas", get: jest.fn().mockReturnValue(3) },
        ]);
        jest.spyOn(Alat, "findAll").mockResolvedValue([
          { status: "tersedia", get: jest.fn().mockReturnValue(3) },
          { status: "dipinjam", get: jest.fn().mockReturnValue(2) },
          { kondisi: "baik", get: jest.fn().mockReturnValue(4) },
          { kondisi: "rusak", get: jest.fn().mockReturnValue(1) },
        ]);
        jest.spyOn(Peminjaman, "findAll").mockResolvedValue([
          { status: "dipinjam", get: jest.fn().mockReturnValue(2) },
          { status: "selesai", get: jest.fn().mockReturnValue(1) },
        ]);
        jest.spyOn(Kategori, "findAll").mockResolvedValue([
          { kategori_id: 1, get: jest.fn().mockReturnValue(3) },
          { kategori_id: 2, get: jest.fn().mockReturnValue(2) },
        ]);

        const result = await reportService.generateStatistics();

        expect(result).toHaveProperty("users");
        expect(result).toHaveProperty("alat");
        expect(result).toHaveProperty("peminjaman");
        expect(result).toHaveProperty("generatedAt");
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "dashboard_statistics",
          result,
          120,
        );
      });
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate cache for user service", async () => {
      await userService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("admin_dashboard_stats");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("admin_user_index");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("admin_log_index");
    });

    it("should invalidate cache for alat service", async () => {
      await alatService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("alat_user_index");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("alat_admin_index");
    });

    it("should invalidate cache for kategori service", async () => {
      await kategoriService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("kategori_index");
    });

    it("should invalidate cache for peminjaman service", async () => {
      await peminjamanService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("peminjaman_admin");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("peminjaman_petugas");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("alat_user_index");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("alat_admin_index");
    });

    it("should invalidate cache for report service", async () => {
      await reportService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("dashboard_statistics");
    });
  });
});
