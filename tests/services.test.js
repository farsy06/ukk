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
  findAndCountAll: jest.fn(),
}));

jest.mock("../src/models/Alat", () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  findAndCountAll: jest.fn(),
}));

jest.mock("../src/models/Kategori", () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  getKategoriStats: jest.fn(),
}));

jest.mock("../src/models/Peminjaman", () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  findAndCountAll: jest.fn(),
}));

jest.mock("../src/models/LogAktivitas", () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
}));

describe("Service Tests", () => {
  let userService,
    alatService,
    kategoriService,
    peminjamanService,
    reportService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

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

    describe("getAllUsersPaginated", () => {
      it("should fetch paginated users", async () => {
        const User = require("../src/models/User");
        const paged = { rows: [mockUser], count: 1 };
        jest.spyOn(User, "findAndCountAll").mockResolvedValue(paged);

        const result = await userService.getAllUsersPaginated({
          limit: 10,
          offset: 0,
        });

        expect(result).toBe(paged);
        expect(User.findAndCountAll).toHaveBeenCalledTimes(1);
      });
    });

    describe("getById", () => {
      it("should throw error if user not found", async () => {
        const User = require("../src/models/User");
        jest.spyOn(User, "findByPk").mockResolvedValue(null);

        await expect(userService.getById(999)).rejects.toThrow(
          "User tidak ditemukan",
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

      it("should throw error if email already exists", async () => {
        const userData = {
          nama: "New User",
          username: "newuser",
          email: "existing@example.com",
          password: "password123",
          role: "peminjam",
        };

        const adminUser = { id: 1, nama: "Admin" };

        const User = require("../src/models/User");
        jest
          .spyOn(User, "findOne")
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockUser);

        await expect(userService.create(userData, adminUser)).rejects.toThrow(
          "Email sudah digunakan",
        );
      });

      it("should skip activity log for system user", async () => {
        const userData = {
          nama: "System User",
          username: "systemuser",
          email: "system@example.com",
          password: "password123",
          role: "peminjam",
        };

        const adminUser = { id: 0, nama: "System" };

        const User = require("../src/models/User");
        jest
          .spyOn(User, "findOne")
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        jest.spyOn(User, "create").mockResolvedValue(mockUser);

        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create");

        await userService.create(userData, adminUser);

        expect(LogAktivitas.create).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalled();
        expect(mockLogger.info.mock.calls[0][0]).toContain(
          "User registration completed",
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

    describe("getActivityLogs", () => {
      it("should fetch logs from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const logs = [mockLogAktivitas];
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "findAll").mockResolvedValue(logs);

        const result = await userService.getActivityLogs();

        expect(result).toBe(logs);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "admin_log_index",
          logs,
          300,
        );
      });
    });

    describe("counts and uniqueness", () => {
      it("should fetch kategori count", async () => {
        const Kategori = require("../src/models/Kategori");
        jest.spyOn(Kategori, "count").mockResolvedValue(5);

        const result = await userService.getKategoriCount();
        expect(result).toBe(5);
      });

      it("should fetch alat count", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "count").mockResolvedValue(4);

        const result = await userService.getAlatCount();
        expect(result).toBe(4);
      });

      it("should fetch peminjaman count", async () => {
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "count").mockResolvedValue(2);

        const result = await userService.getPeminjamanCount();
        expect(result).toBe(2);
      });

      it("should fetch user count", async () => {
        const User = require("../src/models/User");
        jest.spyOn(User, "count").mockResolvedValue(7);

        const result = await userService.getUserCount();
        expect(result).toBe(7);
      });

      it("should check username uniqueness", async () => {
        const User = require("../src/models/User");
        jest.spyOn(User, "findOne").mockResolvedValue(null);

        const result = await userService.isUsernameUnique("unique");
        expect(result).toBe(true);
      });

      it("should check email uniqueness", async () => {
        const User = require("../src/models/User");
        jest.spyOn(User, "findOne").mockResolvedValue(mockUser);

        const result = await userService.isEmailUnique("taken@example.com");
        expect(result).toBe(false);
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

    describe("getAllForAdmin", () => {
      it("should fetch alat for admin if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockAlatList = [mockAlat];
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findAll").mockResolvedValue(mockAlatList);

        const result = await alatService.getAllForAdmin();

        expect(result).toStrictEqual(mockAlatList);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "alat_admin_index",
          mockAlatList,
          300,
        );
      });
    });

    describe("getById", () => {
      it("should throw error if alat not found", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue(null);

        await expect(alatService.getById(999)).rejects.toThrow(
          "Alat tidak ditemukan",
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

      it("should skip activity log for system user", async () => {
        const alatData = {
          nama_alat: "System Alat",
          kategori_id: 1,
          kondisi: "baik",
          stok: 5,
        };

        const systemUser = { id: 0, nama: "System" };

        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "create").mockResolvedValue(mockAlat);

        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create");

        const result = await alatService.create(alatData, systemUser);

        expect(result).toBe(mockAlat);
        expect(LogAktivitas.create).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalled();
      });

      it("should use default stok of 1 when not provided", async () => {
        const alatData = {
          nama_alat: "Alat Tanpa Stok",
          kategori_id: 1,
          kondisi: "baik",
        };

        const user = { id: 1, nama: "User" };

        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "create").mockResolvedValue(mockAlat);

        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        await alatService.create(alatData, user);

        expect(Alat.create).toHaveBeenCalledWith(
          expect.objectContaining({
            nama_alat: "Alat Tanpa Stok",
            kategori_id: 1,
            kondisi: "baik",
            stok: 1,
          }),
        );
      });
    });

    describe("update", () => {
      it("should update alat successfully", async () => {
        const alatToUpdate = {
          ...mockAlat,
          update: jest.fn().mockResolvedValue(),
        };

        jest.spyOn(alatService, "getById").mockResolvedValue(alatToUpdate);
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);
        const invalidateSpy = jest.spyOn(alatService, "invalidateCache");

        const data = {
          nama_alat: "Updated Alat",
          kategori_id: 2,
          kondisi: "baik",
          status: "tersedia",
          stok: 10,
        };

        const result = await alatService.update(1, data, { id: 1 });

        expect(result).toBe(alatToUpdate);
        expect(alatToUpdate.update).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      it("should use existing stok when not provided in update", async () => {
        const alatToUpdate = {
          ...mockAlat,
          stok: 5,
          update: jest.fn().mockResolvedValue(),
        };

        jest.spyOn(alatService, "getById").mockResolvedValue(alatToUpdate);
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);
        jest.spyOn(alatService, "invalidateCache");

        const data = {
          nama_alat: "Updated Alat",
          kategori_id: 2,
          kondisi: "rusak",
          status: "tersedia",
          // stok not provided
        };

        await alatService.update(1, data, { id: 1 });

        expect(alatToUpdate.update).toHaveBeenCalledWith(
          expect.objectContaining({
            nama_alat: "Updated Alat",
            kategori_id: 2,
            kondisi: "rusak",
            status: "tersedia",
            stok: 5, // should keep existing stock
          }),
        );
      });
    });

    describe("delete", () => {
      it("should delete alat successfully", async () => {
        const alatToDelete = {
          ...mockAlat,
          destroy: jest.fn().mockResolvedValue(),
        };

        jest.spyOn(alatService, "getById").mockResolvedValue(alatToDelete);
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);
        const invalidateSpy = jest.spyOn(alatService, "invalidateCache");

        await alatService.delete(1, { id: 1 });

        expect(alatToDelete.destroy).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe("getKategori", () => {
      it("should fetch kategori for dropdown", async () => {
        const Kategori = require("../src/models/Kategori");
        const list = [mockKategori];
        jest.spyOn(Kategori, "findAll").mockResolvedValue(list);

        const result = await alatService.getKategori();

        expect(result).toBe(list);
        expect(Kategori.findAll).toHaveBeenCalledTimes(1);
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

      it("should return falsy value if alat not found", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue(null);

        const result = await alatService.isAvailable(999);

        expect(result).toBeFalsy();
      });
    });

    describe("updateStock", () => {
      it("should update stock and status", async () => {
        const alatToUpdate = {
          ...mockAlat,
          stok: 2,
          status: "tersedia",
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(alatService, "getById").mockResolvedValue(alatToUpdate);
        const invalidateSpy = jest.spyOn(alatService, "invalidateCache");

        const result = await alatService.updateStock(1, -2);

        expect(result).toBe(alatToUpdate);
        expect(alatToUpdate.update).toHaveBeenCalledWith({
          stok: 0,
          status: "dipinjam",
        });
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      it("should throw error when stock becomes negative", async () => {
        const alatToUpdate = {
          ...mockAlat,
          stok: 1,
        };
        jest.spyOn(alatService, "getById").mockResolvedValue(alatToUpdate);

        await expect(alatService.updateStock(1, -2)).rejects.toThrow(
          "Stok tidak mencukupi",
        );
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
        jest
          .spyOn(Kategori, "getKategoriStats")
          .mockResolvedValue(mockKategoriList);

        const result = await kategoriService.getAll();

        expect(result).toStrictEqual(mockKategoriList);
        expect(Kategori.getKategoriStats).toHaveBeenCalledTimes(1);
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

    describe("getById", () => {
      it("should throw error if kategori not found", async () => {
        const Kategori = require("../src/models/Kategori");
        jest.spyOn(Kategori, "findByPk").mockResolvedValue(null);

        await expect(kategoriService.getById(999)).rejects.toThrow(
          "Kategori tidak ditemukan",
        );
      });
    });

    describe("update", () => {
      it("should update kategori successfully", async () => {
        const kategori = {
          ...mockKategori,
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(kategoriService, "getById").mockResolvedValue(kategori);

        const Kategori = require("../src/models/Kategori");
        jest.spyOn(Kategori, "findOne").mockResolvedValue(null);

        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);
        const invalidateSpy = jest.spyOn(kategoriService, "invalidateCache");

        const result = await kategoriService.update(
          1,
          { nama_kategori: "Updated", deskripsi: "Desc" },
          { id: 1 },
        );

        expect(result).toBe(kategori);
        expect(kategori.update).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });

      it("should throw error if kategori name already used", async () => {
        jest.spyOn(kategoriService, "getById").mockResolvedValue(mockKategori);

        const Kategori = require("../src/models/Kategori");
        jest.spyOn(Kategori, "findOne").mockResolvedValue(mockKategori);

        await expect(
          kategoriService.update(
            1,
            { nama_kategori: "Existing", deskripsi: "Desc" },
            { id: 1 },
          ),
        ).rejects.toThrow("Nama kategori sudah digunakan");
      });
    });

    describe("delete", () => {
      it("should delete kategori successfully", async () => {
        const kategori = {
          ...mockKategori,
          destroy: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(kategoriService, "getById").mockResolvedValue(kategori);

        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);
        const invalidateSpy = jest.spyOn(kategoriService, "invalidateCache");

        await kategoriService.delete(1, { id: 1 });

        expect(kategori.destroy).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe("isNameUnique", () => {
      it("should return true when name is unique", async () => {
        const Kategori = require("../src/models/Kategori");
        jest.spyOn(Kategori, "findOne").mockResolvedValue(null);

        const result = await kategoriService.isNameUnique("Unique");
        expect(result).toBe(true);
      });
    });
  });

  describe("PeminjamanService", () => {
    describe("getById", () => {
      it("should throw error if peminjaman not found", async () => {
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "findByPk").mockResolvedValue(null);

        await expect(peminjamanService.getById(999)).rejects.toThrow(
          "Peminjaman tidak ditemukan",
        );
      });
    });

    describe("getAllForAdmin", () => {
      it("should fetch peminjaman for admin if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockPeminjamanList = [mockPeminjaman];
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "findAll").mockResolvedValue(mockPeminjamanList);

        const result = await peminjamanService.getAllForAdmin();

        expect(result).toStrictEqual(mockPeminjamanList);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "peminjaman_admin",
          mockPeminjamanList,
          180,
        );
      });
    });

    describe("getAllForAdminPaginated", () => {
      it("should fetch paginated peminjaman for admin", async () => {
        const Peminjaman = require("../src/models/Peminjaman");
        const paged = { rows: [mockPeminjaman], count: 1 };
        jest.spyOn(Peminjaman, "findAndCountAll").mockResolvedValue(paged);

        const result = await peminjamanService.getAllForAdminPaginated({
          limit: 5,
          offset: 0,
        });

        expect(result).toBe(paged);
      });
    });

    describe("getForPetugas", () => {
      it("should fetch peminjaman for petugas if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockPeminjamanList = [mockPeminjaman];
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "findAll").mockResolvedValue(mockPeminjamanList);

        const result = await peminjamanService.getForPetugas();

        expect(result).toStrictEqual(mockPeminjamanList);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "peminjaman_petugas",
          mockPeminjamanList,
          120,
        );
      });

      it("should return cached peminjaman for petugas if available", async () => {
        const cached = [mockPeminjaman];
        mockCacheHelper.get.mockReturnValue(cached);

        const result = await peminjamanService.getForPetugas();

        expect(result).toBe(cached);
        expect(mockLogger.info).toHaveBeenCalledWith(
          "Peminjaman petugas index: Cache hit",
        );
      });
    });

    describe("checkAlatAvailability", () => {
      it("should return not found when alat missing", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue(null);

        const result = await peminjamanService.checkAlatAvailability(1, 1);

        expect(result.available).toBe(false);
        expect(result.message).toBe("Alat tidak ditemukan");
      });

      it("should return insufficient stock message", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          status: "tersedia",
          stok: 1,
        });

        const result = await peminjamanService.checkAlatAvailability(1, 3);

        expect(result.available).toBe(false);
        expect(result.message).toContain("Stok tidak mencukupi");
      });

      it("should return not available when status is not tersedia", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          status: "dipinjam",
          stok: 5,
        });

        const result = await peminjamanService.checkAlatAvailability(1, 1);

        expect(result.available).toBe(false);
        expect(result.message).toContain("Alat tidak tersedia");
      });

      it("should return out of stock when stok is 0", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          status: "tersedia",
          stok: 0,
        });

        const result = await peminjamanService.checkAlatAvailability(1, 1);

        expect(result.available).toBe(false);
        expect(result.message).toBe("Stok alat habis");
      });
    });

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
      it("should throw error if data is incomplete", async () => {
        await expect(peminjamanService.create({}, { id: 1 })).rejects.toThrow(
          "Data peminjaman tidak lengkap",
        );
      });

      it("should throw error if jumlah kurang dari 1", async () => {
        const tanggalPinjam = new Date();
        tanggalPinjam.setDate(tanggalPinjam.getDate() + 1);
        const tanggalKembali = new Date(tanggalPinjam);
        tanggalKembali.setDate(tanggalKembali.getDate() + 1);

        await expect(
          peminjamanService.create(
            {
              alat_id: 1,
              tanggal_pinjam: tanggalPinjam,
              tanggal_kembali: tanggalKembali,
              jumlah: -1,
            },
            { id: 1 },
          ),
        ).rejects.toThrow("Jumlah peminjaman minimal 1");
      });

      it("should create peminjaman successfully", async () => {
        const tanggalPinjam = new Date();
        tanggalPinjam.setDate(tanggalPinjam.getDate() + 1);
        tanggalPinjam.setHours(0, 0, 0, 0);

        const tanggalKembali = new Date(tanggalPinjam);
        tanggalKembali.setDate(tanggalKembali.getDate() + 3);

        const peminjamanData = {
          alat_id: 1,
          tanggal_pinjam: tanggalPinjam,
          tanggal_kembali: tanggalKembali,
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
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      });

      it("should throw error if alat is not available", async () => {
        const tanggalPinjam = new Date();
        tanggalPinjam.setDate(tanggalPinjam.getDate() + 1);
        tanggalPinjam.setHours(0, 0, 0, 0);

        const tanggalKembali = new Date(tanggalPinjam);
        tanggalKembali.setDate(tanggalKembali.getDate() + 3);

        const peminjamanData = {
          alat_id: 1,
          tanggal_pinjam: tanggalPinjam,
          tanggal_kembali: tanggalKembali,
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
        ).rejects.toThrow("Alat tidak tersedia (status: dipinjam)");
      });

      it("should throw error if tanggal kembali before pinjam", async () => {
        const tanggalPinjam = new Date();
        tanggalPinjam.setDate(tanggalPinjam.getDate() + 2);
        const tanggalKembali = new Date(tanggalPinjam);
        tanggalKembali.setDate(tanggalKembali.getDate() - 1);

        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          status: "tersedia",
          stok: 5,
        });

        await expect(
          peminjamanService.create(
            {
              alat_id: 1,
              tanggal_pinjam: tanggalPinjam,
              tanggal_kembali: tanggalKembali,
            },
            { id: 1, nama: "User" },
          ),
        ).rejects.toThrow(
          "Tanggal kembali harus lebih besar dari tanggal pinjam",
        );
      });

      it("should throw error if peminjaman lebih dari 7 hari", async () => {
        const tanggalPinjam = new Date();
        tanggalPinjam.setDate(tanggalPinjam.getDate() + 1);
        const tanggalKembali = new Date(tanggalPinjam);
        tanggalKembali.setDate(tanggalKembali.getDate() + 10);

        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          status: "tersedia",
          stok: 5,
        });

        await expect(
          peminjamanService.create(
            {
              alat_id: 1,
              tanggal_pinjam: tanggalPinjam,
              tanggal_kembali: tanggalKembali,
            },
            { id: 1, nama: "User" },
          ),
        ).rejects.toThrow("Maksimal peminjaman adalah 7 hari");
      });

      it("should throw error if tanggal pinjam in the past", async () => {
        const tanggalPinjam = new Date();
        tanggalPinjam.setDate(tanggalPinjam.getDate() - 1);
        const tanggalKembali = new Date();
        tanggalKembali.setDate(tanggalKembali.getDate() + 1);

        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          status: "tersedia",
          stok: 5,
        });

        await expect(
          peminjamanService.create(
            {
              alat_id: 1,
              tanggal_pinjam: tanggalPinjam,
              tanggal_kembali: tanggalKembali,
            },
            { id: 1, nama: "User" },
          ),
        ).rejects.toThrow("Tanggal pinjam tidak boleh di masa lalu");
      });
    });

    describe("approve", () => {
      it("should approve peminjaman successfully", async () => {
        const user = { id: 1, nama: "Petugas" };

        // Create a mock peminjaman with nested alat and user objects
        const mockPeminjamanWithRelations = {
          ...mockPeminjaman,
          status: "pending",
          jumlah: 1,
          alat: { nama_alat: "Test Alat" },
          user: { nama: "Test User" },
          update: jest.fn().mockResolvedValue(),
        };

        // Mock getById
        jest
          .spyOn(peminjamanService, "getById")
          .mockResolvedValue(mockPeminjamanWithRelations);

        // Mock Alat.findByPk for stock deduction
        const Alat = require("../src/models/Alat");
        const mockAlatForApprove = {
          ...mockAlat,
          stok: 5,
          status: "tersedia",
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(Alat, "findByPk").mockResolvedValue(mockAlatForApprove);

        // Mock LogAktivitas.create
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await peminjamanService.approve(1, user);

        expect(result).toBe(mockPeminjamanWithRelations);
        expect(mockPeminjamanWithRelations.update).toHaveBeenCalledTimes(1);
        expect(mockAlatForApprove.update).toHaveBeenCalledTimes(1);
        expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      });

      it("should throw error if status not pending", async () => {
        jest.spyOn(peminjamanService, "getById").mockResolvedValue({
          ...mockPeminjaman,
          status: "disetujui",
        });

        await expect(
          peminjamanService.approve(1, { id: 1, nama: "Petugas" }),
        ).rejects.toThrow("Peminjaman sudah diproses sebelumnya");
      });

      it("should throw error if alat not found", async () => {
        jest.spyOn(peminjamanService, "getById").mockResolvedValue({
          ...mockPeminjaman,
          status: "pending",
          jumlah: 1,
        });

        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue(null);

        await expect(
          peminjamanService.approve(1, { id: 1, nama: "Petugas" }),
        ).rejects.toThrow("Alat tidak ditemukan");
      });

      it("should reject when stock insufficient", async () => {
        const peminjaman = {
          ...mockPeminjaman,
          status: "pending",
          jumlah: 5,
          user: { nama: "Test User" },
          alat: { nama_alat: "Test Alat" },
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue({
          ...mockAlat,
          stok: 1,
          status: "tersedia",
        });

        await expect(
          peminjamanService.approve(1, { id: 1, nama: "Petugas" }),
        ).rejects.toThrow("Stok tidak mencukupi");
        expect(peminjaman.update).toHaveBeenCalledWith({ status: "ditolak" });
      });
    });

    describe("reject", () => {
      it("should reject peminjaman successfully", async () => {
        const peminjaman = {
          ...mockPeminjaman,
          status: "pending",
          alat: { nama_alat: "Test Alat" },
          user: { nama: "Test User" },
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await peminjamanService.reject(1, { id: 1 });

        expect(result).toBe(peminjaman);
        expect(peminjaman.update).toHaveBeenCalledTimes(1);
      });

      it("should throw error if status not pending", async () => {
        jest.spyOn(peminjamanService, "getById").mockResolvedValue({
          ...mockPeminjaman,
          status: "dipinjam",
        });

        await expect(peminjamanService.reject(1, { id: 1 })).rejects.toThrow(
          "Peminjaman sudah diproses sebelumnya",
        );
      });
    });

    describe("returnItem", () => {
      it("should return item and update stock", async () => {
        const peminjaman = {
          ...mockPeminjaman,
          status: "disetujui",
          jumlah: 1,
          alat: { nama_alat: "Test Alat" },
          user: { nama: "Test User" },
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

        const Alat = require("../src/models/Alat");
        const alat = {
          ...mockAlat,
          stok: 0,
          status: "dipinjam",
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(Alat, "findByPk").mockResolvedValue(alat);

        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await peminjamanService.returnItem(1, { id: 1 });

        expect(result).toBe(peminjaman);
        expect(peminjaman.update).toHaveBeenCalledTimes(1);
        expect(alat.update).toHaveBeenCalledTimes(1);
      });

      it("should throw error for invalid status", async () => {
        jest.spyOn(peminjamanService, "getById").mockResolvedValue({
          ...mockPeminjaman,
          status: "pending",
        });

        await expect(
          peminjamanService.returnItem(1, { id: 1 }),
        ).rejects.toThrow("Status peminjaman tidak valid untuk pengembalian");
      });

      it("should return item even if alat not found", async () => {
        const peminjaman = {
          ...mockPeminjaman,
          status: "disetujui",
          jumlah: 1,
          alat: { nama_alat: "Test Alat" },
          user: { nama: "Test User" },
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findByPk").mockResolvedValue(null);

        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await peminjamanService.returnItem(1, { id: 1 });

        expect(result).toBe(peminjaman);
        expect(peminjaman.update).toHaveBeenCalledTimes(1);
      });
    });

    describe("cancel", () => {
      it("should cancel peminjaman successfully", async () => {
        const peminjaman = {
          ...mockPeminjaman,
          status: "pending",
          user_id: 1,
          alat: { nama_alat: "Test Alat" },
          update: jest.fn().mockResolvedValue(),
        };
        jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

        const result = await peminjamanService.cancel(1, { id: 1 });

        expect(result).toBe(peminjaman);
        expect(peminjaman.update).toHaveBeenCalledTimes(1);
      });

      it("should throw error if user not owner", async () => {
        jest.spyOn(peminjamanService, "getById").mockResolvedValue({
          ...mockPeminjaman,
          status: "pending",
          user_id: 2,
        });

        await expect(peminjamanService.cancel(1, { id: 1 })).rejects.toThrow(
          "Anda tidak memiliki akses untuk membatalkan peminjaman ini",
        );
      });

      it("should throw error if status not pending", async () => {
        jest.spyOn(peminjamanService, "getById").mockResolvedValue({
          ...mockPeminjaman,
          status: "disetujui",
          user_id: 1,
        });

        await expect(peminjamanService.cancel(1, { id: 1 })).rejects.toThrow(
          "Peminjaman yang sudah diproses tidak dapat dibatalkan",
        );
      });
    });

    describe("isAlatAvailable", () => {
      it("should return true when no overlapping peminjaman", async () => {
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "findOne").mockResolvedValue(null);

        const result = await peminjamanService.isAlatAvailable(
          1,
          new Date(),
          new Date(),
        );

        expect(result).toBe(true);
      });

      it("should return false when overlapping peminjaman exists", async () => {
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "findOne").mockResolvedValue(mockPeminjaman);

        const result = await peminjamanService.isAlatAvailable(
          1,
          new Date(),
          new Date(),
        );

        expect(result).toBe(false);
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

      it("should apply date filters for user report", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const User = require("../src/models/User");
        jest.spyOn(User, "findAll").mockResolvedValue([mockUser]);

        const result = await reportService.generateUserReport({
          startDate: "2026-02-01",
          endDate: "2026-02-02",
        });

        expect(result.stats.period.start).toBeInstanceOf(Date);
        expect(result.stats.period.end).toBeInstanceOf(Date);
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

      it("should compute kategoriStats", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockAlatList = [
          {
            ...mockAlat,
            status: "tersedia",
            kategori: { nama_kategori: "K1" },
          },
          {
            ...mockAlat,
            status: "dipinjam",
            kategori: { nama_kategori: "K1" },
          },
        ];
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "findAll").mockResolvedValue(mockAlatList);

        const result = await reportService.generateInventoryReport();

        expect(result.kategoriStats.K1.total).toBe(2);
        expect(result.kategoriStats.K1.tersedia).toBe(1);
        expect(result.kategoriStats.K1.dipinjam).toBe(1);
      });
    });

    describe("generatePeminjamanReport", () => {
      it("should generate peminjaman report from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const mockList = [
          {
            status: "diproses",
            alat: { nama_alat: "Alat A" },
          },
          {
            status: "dipinjam",
            alat: { nama_alat: "Alat A" },
          },
          {
            status: "selesai",
            alat: { nama_alat: "Alat B" },
          },
        ];
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "findAll").mockResolvedValue(mockList);

        const result = await reportService.generatePeminjamanReport();

        expect(result.title).toBe("Laporan Peminjaman");
        expect(result.peminjaman).toStrictEqual(mockList);
        expect(result.popularItems["Alat A"]).toBe(2);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "peminjaman_report_{}",
          result,
          300,
        );
      });
    });

    describe("generateActivityReport", () => {
      it("should generate activity report from database if not cached", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const logs = [
          { aktivitas: "Login: ok", user: { username: "u1" } },
          { aktivitas: "Login: ok", user: { username: "u1" } },
          { aktivitas: "Logout: ok", user: { username: "u2" } },
        ];
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "findAll").mockResolvedValue(logs);

        const result = await reportService.generateActivityReport();

        expect(result.title).toBe("Laporan Aktivitas Sistem");
        expect(result.stats.total).toBe(3);
        expect(result.stats.perUser.u1).toBe(2);
        expect(result.stats.perActivity.Login).toBe(2);
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "activity_report_{}",
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

    describe("statistics helpers", () => {
      it("should get user statistics", async () => {
        const User = require("../src/models/User");
        jest.spyOn(User, "count").mockResolvedValue(5);
        jest.spyOn(User, "findAll").mockResolvedValue([
          { role: "peminjam", get: jest.fn().mockReturnValue(4) },
          { role: "petugas", get: jest.fn().mockReturnValue(1) },
        ]);

        const result = await reportService.getUserStatistics();
        expect(result.total).toBe(5);
        expect(result.byRole.peminjam).toBe(4);
      });

      it("should get alat statistics", async () => {
        const Alat = require("../src/models/Alat");
        jest.spyOn(Alat, "count").mockResolvedValue(3);
        jest.spyOn(Alat, "findAll").mockResolvedValueOnce([
          { status: "tersedia", get: jest.fn().mockReturnValue(2) },
          { status: "dipinjam", get: jest.fn().mockReturnValue(1) },
        ]);
        jest.spyOn(Alat, "findAll").mockResolvedValueOnce([
          { kondisi: "baik", get: jest.fn().mockReturnValue(2) },
          { kondisi: "rusak", get: jest.fn().mockReturnValue(1) },
        ]);

        const result = await reportService.getAlatStatistics();
        expect(result.total).toBe(3);
        expect(result.byStatus.tersedia).toBe(2);
        expect(result.byKondisi.rusak).toBe(1);
      });

      it("should get peminjaman statistics", async () => {
        const Peminjaman = require("../src/models/Peminjaman");
        jest.spyOn(Peminjaman, "count").mockResolvedValue(2);
        jest.spyOn(Peminjaman, "findAll").mockResolvedValue([
          { status: "dipinjam", get: jest.fn().mockReturnValue(1) },
          { status: "selesai", get: jest.fn().mockReturnValue(1) },
        ]);

        const result = await reportService.getPeminjamanStatistics();
        expect(result.total).toBe(2);
        expect(result.byStatus.selesai).toBe(1);
      });

      it("should get kategori statistics", async () => {
        const Kategori = require("../src/models/Kategori");
        const Alat = require("../src/models/Alat");
        jest.spyOn(Kategori, "count").mockResolvedValue(2);
        jest
          .spyOn(Alat, "findAll")
          .mockResolvedValue([
            { kategori_id: 1, get: jest.fn().mockReturnValue(3) },
          ]);

        const result = await reportService.getKategoriStatistics();
        expect(result.total).toBe(2);
        expect(result.alatPerKategori[0].count).toBe(3);
      });

      it("should get activity statistics", async () => {
        const LogAktivitas = require("../src/models/LogAktivitas");
        jest.spyOn(LogAktivitas, "count").mockResolvedValue(4);
        jest
          .spyOn(LogAktivitas, "findAll")
          .mockResolvedValue([mockLogAktivitas]);

        const result = await reportService.getActivityStatistics();
        expect(result.total).toBe(4);
        expect(result.recent.length).toBe(1);
      });
    });

    describe("helpers", () => {
      it("should parse date filters", () => {
        const result = reportService.parseDateFilters({
          startDate: "2026-02-01",
          endDate: "2026-02-05",
        });

        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.endDate).toBeInstanceOf(Date);
        expect(result.endDate.getHours()).toBe(23);
      });

      it("should group logs by user and activity", () => {
        const logs = [
          { aktivitas: "Login: ok", user: { username: "u1" } },
          { aktivitas: "Login: ok", user: { username: "u1" } },
          { aktivitas: "Logout: ok", user: null },
        ];

        const byUser = reportService.groupByUser(logs);
        const byActivity = reportService.groupByActivity(logs);

        expect(byUser.u1).toBe(2);
        expect(byUser.System).toBe(1);
        expect(byActivity.Login).toBe(2);
        expect(byActivity.Logout).toBe(1);
      });
    });

    describe("dashboards", () => {
      it("should generate report dashboard data", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const result = await reportService.generateReportDashboard();

        expect(result.title).toBe("Laporan Sistem");
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "report_dashboard",
          result,
          600,
        );
      });

      it("should generate petugas report dashboard data", async () => {
        mockCacheHelper.get.mockReturnValue(null);

        const result = await reportService.generatePetugasReportDashboard();

        expect(result.title).toBe("Laporan Petugas");
        expect(mockCacheHelper.set).toHaveBeenCalledWith(
          "petugas_report_dashboard",
          result,
          600,
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
