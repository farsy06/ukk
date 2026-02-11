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

jest.mock("../../src/models/Kategori", () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  getKategoriStats: jest.fn(),
}));

jest.mock("../../src/models/Alat", () => ({
  count: jest.fn(),
}));

jest.mock("../../src/models/LogAktivitas", () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
}));

describe("KategoriService", () => {
  let kategoriService;

  const mockKategori = {
    id: 1,
    nama_kategori: "Test Kategori",
    deskripsi: "Test Description",
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
    kategoriService = require("../../src/services/kategoriService");
    kategoriService.logger = mockLogger;
  });

  describe("getAll", () => {
    it("should return cached kategori if available", async () => {
      const cachedKategori = [mockKategori];
      mockCacheHelper.get.mockReturnValue(cachedKategori);

      const result = await kategoriService.getAll();

      expect(result).toStrictEqual(cachedKategori);
      expect(mockLogger.info).toHaveBeenCalledWith("Kategori index: Cache hit");
    });

    it("should fetch kategori from database if not cached", async () => {
      mockCacheHelper.get.mockReturnValue(null);

      const mockKategoriList = [mockKategori];
      const Kategori = require("../../src/models/Kategori");
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

  describe("getById", () => {
    it("should throw error if kategori not found", async () => {
      const Kategori = require("../../src/models/Kategori");
      jest.spyOn(Kategori, "findByPk").mockResolvedValue(null);

      await expect(kategoriService.getById(999)).rejects.toThrow(
        "Kategori tidak ditemukan",
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

      const Kategori = require("../../src/models/Kategori");
      jest.spyOn(Kategori, "findOne").mockResolvedValue(null);
      jest.spyOn(Kategori, "create").mockResolvedValue(mockKategori);

      const LogAktivitas = require("../../src/models/LogAktivitas");
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

      const Kategori = require("../../src/models/Kategori");
      jest.spyOn(Kategori, "findOne").mockResolvedValue(mockKategori);

      await expect(kategoriService.create(kategoriData, user)).rejects.toThrow(
        "Nama kategori sudah ada",
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

      const Kategori = require("../../src/models/Kategori");
      jest.spyOn(Kategori, "findOne").mockResolvedValue(null);

      const LogAktivitas = require("../../src/models/LogAktivitas");
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

      const Kategori = require("../../src/models/Kategori");
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

      const Alat = require("../../src/models/Alat");
      jest.spyOn(Alat, "count").mockResolvedValue(0);

      const LogAktivitas = require("../../src/models/LogAktivitas");
      jest.spyOn(LogAktivitas, "create").mockResolvedValue(mockLogAktivitas);
      const invalidateSpy = jest.spyOn(kategoriService, "invalidateCache");

      await kategoriService.delete(1, { id: 1 });

      expect(kategori.destroy).toHaveBeenCalledTimes(1);
      expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });

    it("should block delete when kategori is used by alat", async () => {
      jest.spyOn(kategoriService, "getById").mockResolvedValue(mockKategori);

      const Alat = require("../../src/models/Alat");
      jest.spyOn(Alat, "count").mockResolvedValue(2);

      await expect(kategoriService.delete(1, { id: 1 })).rejects.toThrow(
        "Kategori tidak dapat dihapus karena masih digunakan",
      );
    });
  });

  describe("isNameUnique", () => {
    it("should return true when name is unique", async () => {
      const Kategori = require("../../src/models/Kategori");
      jest.spyOn(Kategori, "findOne").mockResolvedValue(null);

      const result = await kategoriService.isNameUnique("Unique");
      expect(result).toBe(true);
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate cache for kategori service", async () => {
      await kategoriService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("kategori_index");
    });
  });
});
