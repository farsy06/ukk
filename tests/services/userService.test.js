// Mock cache helper at module level
const mockCacheHelper = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  cache: {},
};

// Mock logger at module level
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock("../../src/middleware/caching", () => ({
  cacheHelper: mockCacheHelper,
}));

jest.mock("../../src/config/logging", () => mockLogger);

jest.mock("../../src/config/database", () => ({
  sequelize: {
    authenticate: jest.fn(),
    sync: jest.fn(),
  },
  testConnection: jest.fn(),
}));

jest.mock("../../src/models/User", () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
  count: jest.fn(),
  findAndCountAll: jest.fn(),
  update: jest.fn(),
}));

jest.mock("../../src/models/Kategori", () => ({
  count: jest.fn(),
}));

jest.mock("../../src/models/Alat", () => ({
  count: jest.fn(),
}));

jest.mock("../../src/models/Peminjaman", () => ({
  count: jest.fn(),
}));

jest.mock("../../src/models/LogAktivitas", () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
}));

const { ROLES } = require("../../src/utils/constants");

describe("UserService", () => {
  let userService;
  const safeAttributes = {
    exclude: [
      "password",
      "remember_token",
      "remember_expires",
      "reset_password_token",
      "reset_password_expires",
    ],
  };

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

  const mockLogAktivitas = {
    id: 1,
    user_id: 1,
    aktivitas: "Test activity",
    waktu: new Date(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    userService = require("../../src/services/userService");
    userService.logger = mockLogger;
  });

  describe("getDashboardStats", () => {
    it("should return cached stats if available", async () => {
      const cachedStats = {
        kategori: 5,
        alat: 10,
        peminjaman: 3,
        user: 8,
        peminjam: 6,
        petugas: 2,
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

      jest.spyOn(userService, "getKategoriCount").mockResolvedValue(5);
      jest.spyOn(userService, "getAlatCount").mockResolvedValue(10);
      jest.spyOn(userService, "getPeminjamanCount").mockResolvedValue(3);
      jest.spyOn(userService, "getUserCount").mockResolvedValue(8);
      jest.spyOn(userService, "getPeminjamCount").mockResolvedValue(6);
      jest.spyOn(userService, "getPetugasCount").mockResolvedValue(2);

      const result = await userService.getDashboardStats();

      expect(result).toStrictEqual({
        kategori: 5,
        alat: 10,
        peminjaman: 3,
        user: 8,
        peminjam: 6,
        petugas: 2,
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
      const User = require("../../src/models/User");
      jest.spyOn(User, "findAll").mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(result).toStrictEqual(mockUsers);
      expect(User.findAll).toHaveBeenCalledWith({
        where: {
          role: {
            [require("sequelize").Op.ne]: ROLES.ADMIN,
          },
        },
        attributes: safeAttributes,
      });
      expect(mockCacheHelper.set).toHaveBeenCalledWith(
        "admin_user_index",
        mockUsers,
        600,
      );
    });
  });

  describe("getAllUsersPaginated", () => {
    it("should fetch paginated users", async () => {
      const User = require("../../src/models/User");
      const paged = { rows: [mockUser], count: 1 };
      jest.spyOn(User, "findAndCountAll").mockResolvedValue(paged);

      const result = await userService.getAllUsersPaginated({
        limit: 10,
        offset: 0,
      });

      expect(result).toBe(paged);
      expect(User.findAndCountAll).toHaveBeenCalledWith({
        where: {
          role: {
            [require("sequelize").Op.ne]: ROLES.ADMIN,
          },
        },
        order: [["created_at", "DESC"]],
        limit: 10,
        offset: 0,
        attributes: safeAttributes,
      });
    });
  });

  describe("getById", () => {
    it("should throw error if user not found", async () => {
      const User = require("../../src/models/User");
      jest.spyOn(User, "findByPk").mockResolvedValue(null);

      await expect(userService.getById(999)).rejects.toThrow(
        "User tidak ditemukan",
      );
      expect(User.findByPk).toHaveBeenCalledWith(999, {
        attributes: safeAttributes,
      });
    });
  });

  describe("authentication/session helpers", () => {
    it("recordLogin should update last_login and save user", async () => {
      const loginUser = {
        ...mockUser,
        save: jest.fn(),
        generateRememberToken: jest.fn(() => "remember-token"),
      };

      const token = await userService.recordLogin(loginUser, false);

      expect(token).toBeNull();
      expect(loginUser.last_login).toBeInstanceOf(Date);
      expect(loginUser.generateRememberToken).not.toHaveBeenCalled();
      expect(loginUser.save).toHaveBeenCalledTimes(1);
    });

    it("recordLogin should issue remember token when rememberMe is true", async () => {
      const loginUser = {
        ...mockUser,
        save: jest.fn(),
        generateRememberToken: jest.fn(() => "remember-token"),
      };

      const token = await userService.recordLogin(loginUser, true);

      expect(token).toBe("remember-token");
      expect(loginUser.last_login).toBeInstanceOf(Date);
      expect(loginUser.generateRememberToken).toHaveBeenCalledTimes(1);
      expect(loginUser.save).toHaveBeenCalledTimes(1);
    });

    it("rotateRememberToken should issue new token and persist user", async () => {
      const rememberUser = {
        ...mockUser,
        save: jest.fn(),
        generateRememberToken: jest.fn(() => "rotated-token"),
      };

      const token = await userService.rotateRememberToken(rememberUser);

      expect(token).toBe("rotated-token");
      expect(rememberUser.last_login).toBeInstanceOf(Date);
      expect(rememberUser.generateRememberToken).toHaveBeenCalledTimes(1);
      expect(rememberUser.save).toHaveBeenCalledTimes(1);
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

      const User = require("../../src/models/User");
      jest.spyOn(User, "findOne").mockResolvedValue(null);
      jest.spyOn(User, "create").mockResolvedValue(mockUser);

      const LogAktivitas = require("../../src/models/LogAktivitas");
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

      const User = require("../../src/models/User");
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

      const User = require("../../src/models/User");
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

      const User = require("../../src/models/User");
      jest
        .spyOn(User, "findOne")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      jest.spyOn(User, "create").mockResolvedValue(mockUser);

      const LogAktivitas = require("../../src/models/LogAktivitas");
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

      jest.spyOn(userService, "getById").mockResolvedValue(mockUser);

      const LogAktivitas = require("../../src/models/LogAktivitas");
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

  describe("toggleActive", () => {
    it("should toggle user activation status", async () => {
      const adminUser = { id: 1, nama: "Admin" };
      const User = require("../../src/models/User");
      const LogAktivitas = require("../../src/models/LogAktivitas");

      jest.spyOn(User, "findByPk").mockResolvedValue({
        id: 2,
        nama: "User",
        role: "peminjam",
        is_active: true,
      });
      jest.spyOn(User, "update").mockResolvedValue([1]);
      jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

      const result = await userService.toggleActive(2, adminUser);

      expect(result).toEqual({ id: 2, is_active: false });
      expect(User.update).toHaveBeenCalledWith(
        { is_active: false, remember_token: null, remember_expires: null },
        { where: { id: 2 } },
      );
      expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
    });

    it("should block toggling admin user", async () => {
      const adminUser = { id: 1, nama: "Admin" };
      const User = require("../../src/models/User");

      jest.spyOn(User, "findByPk").mockResolvedValue({
        id: 2,
        nama: "Admin2",
        role: "admin",
        is_active: true,
      });

      await expect(userService.toggleActive(2, adminUser)).rejects.toThrow(
        "Tidak dapat menonaktifkan user admin",
      );
    });
  });

  describe("getActivityLogs", () => {
    it("should fetch logs from database if not cached", async () => {
      mockCacheHelper.get.mockReturnValue(null);

      const logs = [mockLogAktivitas];
      const LogAktivitas = require("../../src/models/LogAktivitas");
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
      const Kategori = require("../../src/models/Kategori");
      jest.spyOn(Kategori, "count").mockResolvedValue(5);

      const result = await userService.getKategoriCount();
      expect(result).toBe(5);
    });

    it("should fetch alat count", async () => {
      const Alat = require("../../src/models/Alat");
      jest.spyOn(Alat, "count").mockResolvedValue(4);

      const result = await userService.getAlatCount();
      expect(result).toBe(4);
    });

    it("should fetch peminjaman count", async () => {
      const Peminjaman = require("../../src/models/Peminjaman");
      jest.spyOn(Peminjaman, "count").mockResolvedValue(2);

      const result = await userService.getPeminjamanCount();
      expect(result).toBe(2);
    });

    it("should fetch user count", async () => {
      const User = require("../../src/models/User");
      jest.spyOn(User, "count").mockResolvedValue(7);

      const result = await userService.getUserCount();
      expect(result).toBe(7);
    });

    it("should fetch peminjam count", async () => {
      const User = require("../../src/models/User");
      jest.spyOn(User, "count").mockResolvedValue(5);

      const result = await userService.getPeminjamCount();
      expect(result).toBe(5);
    });

    it("should fetch petugas count", async () => {
      const User = require("../../src/models/User");
      jest.spyOn(User, "count").mockResolvedValue(2);

      const result = await userService.getPetugasCount();
      expect(result).toBe(2);
    });

    it("should check username uniqueness", async () => {
      const User = require("../../src/models/User");
      jest.spyOn(User, "findOne").mockResolvedValue(null);

      const result = await userService.isUsernameUnique("unique");
      expect(result).toBe(true);
    });

    it("should check email uniqueness", async () => {
      const User = require("../../src/models/User");
      jest.spyOn(User, "findOne").mockResolvedValue(mockUser);

      const result = await userService.isEmailUnique("taken@example.com");
      expect(result).toBe(false);
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate cache for user service", async () => {
      await userService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("admin_dashboard_stats");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("admin_user_index");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("admin_log_index");
    });
  });
});
