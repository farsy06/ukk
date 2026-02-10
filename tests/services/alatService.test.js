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

jest.mock("../../src/models/Alat", () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  findAndCountAll: jest.fn(),
}));

jest.mock("../../src/models/Kategori", () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  getKategoriStats: jest.fn(),
}));

jest.mock("../../src/models/LogAktivitas", () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
}));

describe("AlatService", () => {
  let alatService;

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
    alatService = require("../../src/services/alatService");
    alatService.logger = mockLogger;
  });

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
      const Alat = require("../../src/models/Alat");
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
      const Alat = require("../../src/models/Alat");
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
      const Alat = require("../../src/models/Alat");
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

      const Alat = require("../../src/models/Alat");
      jest.spyOn(Alat, "create").mockResolvedValue(mockAlat);

      const LogAktivitas = require("../../src/models/LogAktivitas");
      jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);

      const result = await alatService.create(alatData, user);

      expect(result).toBe(mockAlat);
      expect(Alat.create).toHaveBeenCalledTimes(1);
      expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("update", () => {
    it("should update alat successfully", async () => {
      const alatToUpdate = {
        ...mockAlat,
        update: jest.fn().mockResolvedValue(),
      };

      jest.spyOn(alatService, "getById").mockResolvedValue(alatToUpdate);
      const LogAktivitas = require("../../src/models/LogAktivitas");
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
  });

  describe("delete", () => {
    it("should delete alat successfully", async () => {
      const alatToDelete = {
        ...mockAlat,
        destroy: jest.fn().mockResolvedValue(),
      };

      jest.spyOn(alatService, "getById").mockResolvedValue(alatToDelete);
      const LogAktivitas = require("../../src/models/LogAktivitas");
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
      const Kategori = require("../../src/models/Kategori");
      const list = [{ id: 1, nama_kategori: "K1" }];
      jest.spyOn(Kategori, "findAll").mockResolvedValue(list);

      const result = await alatService.getKategori();

      expect(result).toBe(list);
      expect(Kategori.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("isAvailable", () => {
    it("should return true if alat is available", async () => {
      const Alat = require("../../src/models/Alat");
      jest.spyOn(Alat, "findByPk").mockResolvedValue({
        ...mockAlat,
        status: "tersedia",
        stok: 5,
      });

      const result = await alatService.isAvailable(1);

      expect(result).toBe(true);
    });

    it("should return false if alat is not available", async () => {
      const Alat = require("../../src/models/Alat");
      jest.spyOn(Alat, "findByPk").mockResolvedValue({
        ...mockAlat,
        status: "dipinjam",
        stok: 0,
      });

      const result = await alatService.isAvailable(1);

      expect(result).toBe(false);
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

  describe("Cache Invalidation", () => {
    it("should invalidate cache for alat service", async () => {
      await alatService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("alat_user_index");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("alat_admin_index");
    });
  });
});
