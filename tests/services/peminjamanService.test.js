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

jest.mock("../../src/models/Peminjaman", () => ({
  findByPk: jest.fn(),
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  count: jest.fn(),
}));

jest.mock("../../src/models/Alat", () => ({
  findByPk: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
}));

jest.mock("../../src/models/User", () => ({
  findByPk: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
}));

jest.mock("../../src/models/Kategori", () => ({
  findByPk: jest.fn(),
  findAll: jest.fn(),
}));

jest.mock("../../src/models/LogAktivitas", () => ({
  create: jest.fn(),
}));

describe("PeminjamanService", () => {
  let peminjamanService;

  const mockUser = { id: 2, nama: "Petugas" };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    peminjamanService = require("../../src/services/peminjamanService");
    peminjamanService.logger = mockLogger;
  });

  describe("getById", () => {
    it("should throw when peminjaman not found", async () => {
      const Peminjaman = require("../../src/models/Peminjaman");
      Peminjaman.findByPk.mockResolvedValue(null);

      await expect(peminjamanService.getById(999)).rejects.toThrow(
        "Peminjaman tidak ditemukan",
      );
    });
  });

  describe("getByUserId", () => {
    it("should return cached data", async () => {
      const cached = [{ id: 1 }];
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await peminjamanService.getByUserId(1);

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Peminjaman user index: Cache hit",
      );
    });

    it("should fetch and cache if not cached", async () => {
      mockCacheHelper.get.mockReturnValue(null);
      const Peminjaman = require("../../src/models/Peminjaman");
      const rows = [{ id: 1 }];
      Peminjaman.findAll.mockResolvedValue(rows);

      const result = await peminjamanService.getByUserId(3);

      expect(result).toBe(rows);
      expect(mockCacheHelper.set).toHaveBeenCalledWith(
        "peminjaman_user_3",
        rows,
        180,
      );
    });
  });

  describe("getAllForAdmin", () => {
    it("should return cached data", async () => {
      const cached = [{ id: 1 }];
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await peminjamanService.getAllForAdmin();

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Peminjaman admin index: Cache hit",
      );
    });

    it("should fetch and cache if not cached", async () => {
      mockCacheHelper.get.mockReturnValue(null);
      const Peminjaman = require("../../src/models/Peminjaman");
      const rows = [{ id: 1 }];
      Peminjaman.findAll.mockResolvedValue(rows);

      const result = await peminjamanService.getAllForAdmin();

      expect(result).toBe(rows);
      expect(mockCacheHelper.set).toHaveBeenCalledWith(
        "peminjaman_admin",
        rows,
        180,
      );
    });
  });

  describe("getForPetugas", () => {
    it("should return cached data", async () => {
      const cached = [{ id: 1 }];
      mockCacheHelper.get.mockReturnValue(cached);

      const result = await peminjamanService.getForPetugas();

      expect(result).toBe(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Peminjaman petugas index: Cache hit",
      );
    });

    it("should fetch and cache if not cached", async () => {
      mockCacheHelper.get.mockReturnValue(null);
      const Peminjaman = require("../../src/models/Peminjaman");
      const rows = [{ id: 1 }];
      Peminjaman.findAll.mockResolvedValue(rows);

      const result = await peminjamanService.getForPetugas();

      expect(result).toBe(rows);
      expect(mockCacheHelper.set).toHaveBeenCalledWith(
        "peminjaman_petugas",
        rows,
        120,
      );
    });
  });

  describe("checkAlatAvailability", () => {
    it("should return not available when alat missing", async () => {
      const Alat = require("../../src/models/Alat");
      Alat.findByPk.mockResolvedValue(null);

      const result = await peminjamanService.checkAlatAvailability(1, 1);

      expect(result).toStrictEqual({
        available: false,
        message: "Alat tidak ditemukan",
      });
    });

    it("should return not available when status not tersedia", async () => {
      const Alat = require("../../src/models/Alat");
      Alat.findByPk.mockResolvedValue({ status: "dipinjam", stok: 1 });

      const result = await peminjamanService.checkAlatAvailability(1, 1);

      expect(result.available).toBe(false);
      expect(result.message).toContain("dipinjam");
    });

    it("should return not available when stock empty", async () => {
      const Alat = require("../../src/models/Alat");
      Alat.findByPk.mockResolvedValue({ status: "tersedia", stok: 0 });

      const result = await peminjamanService.checkAlatAvailability(1, 1);

      expect(result).toStrictEqual({
        available: false,
        message: "Stok alat habis",
      });
    });

    it("should return not available when stock insufficient", async () => {
      const Alat = require("../../src/models/Alat");
      Alat.findByPk.mockResolvedValue({ status: "tersedia", stok: 1 });

      const result = await peminjamanService.checkAlatAvailability(1, 2);

      expect(result.available).toBe(false);
      expect(result.message).toContain("Stok tidak mencukupi");
    });

    it("should return available when stock ok", async () => {
      const Alat = require("../../src/models/Alat");
      Alat.findByPk.mockResolvedValue({ status: "tersedia", stok: 3 });

      const result = await peminjamanService.checkAlatAvailability(1, 2);

      expect(result).toStrictEqual({
        available: true,
        message: "Alat tersedia",
      });
    });
  });

  describe("create", () => {
    it("should create peminjaman and log activity", async () => {
      jest
        .spyOn(peminjamanService, "checkAlatAvailability")
        .mockResolvedValue({ available: true });

      const Alat = require("../../src/models/Alat");
      Alat.findByPk.mockResolvedValue({ id: 1, nama_alat: "Laptop" });

      const Peminjaman = require("../../src/models/Peminjaman");
      const created = { id: 10, status: "pending" };
      Peminjaman.create.mockResolvedValue(created);

      const LogAktivitas = require("../../src/models/LogAktivitas");
      LogAktivitas.create.mockResolvedValue({ id: 1 });

      const invalidateSpy = jest
        .spyOn(peminjamanService, "invalidateCache")
        .mockImplementation(() => {});

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 2);

      const result = await peminjamanService.create(
        {
          alat_id: 1,
          tanggal_pinjam: tomorrow.toISOString(),
          tanggal_kembali: nextDay.toISOString(),
          jumlah: 1,
        },
        { id: 3, nama: "User" },
      );

      expect(result).toBe(created);
      expect(Peminjaman.create).toHaveBeenCalledTimes(1);
      expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });

    it("should throw when data incomplete", async () => {
      await expect(peminjamanService.create({}, mockUser)).rejects.toThrow(
        "Data peminjaman tidak lengkap",
      );
    });
  });

  describe("approve", () => {
    it("should approve peminjaman and update stock", async () => {
      const peminjaman = {
        id: 1,
        status: "pending",
        jumlah: 2,
        alat_id: 5,
        user: { nama: "User" },
        update: jest.fn(),
      };

      jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

      const Alat = require("../../src/models/Alat");
      const alat = {
        id: 5,
        nama_alat: "Laptop",
        stok: 3,
        status: "tersedia",
        update: jest.fn(),
      };
      Alat.findByPk.mockResolvedValue(alat);

      const LogAktivitas = require("../../src/models/LogAktivitas");
      LogAktivitas.create.mockResolvedValue({ id: 1 });

      const invalidateSpy = jest
        .spyOn(peminjamanService, "invalidateCache")
        .mockImplementation(() => {});

      const result = await peminjamanService.approve(1, mockUser);

      expect(result).toBe(peminjaman);
      expect(peminjaman.update).toHaveBeenCalledWith({ status: "disetujui" });
      expect(alat.update).toHaveBeenCalledWith({ stok: 1, status: "tersedia" });
      expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });

    it("should reject when stock insufficient", async () => {
      const peminjaman = {
        id: 1,
        status: "pending",
        jumlah: 5,
        alat_id: 5,
        user: { nama: "User" },
        update: jest.fn(),
      };

      jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

      const Alat = require("../../src/models/Alat");
      Alat.findByPk.mockResolvedValue({ stok: 2 });

      await expect(peminjamanService.approve(1, mockUser)).rejects.toThrow(
        "Stok tidak mencukupi",
      );
      expect(peminjaman.update).toHaveBeenCalledWith({ status: "ditolak" });
    });
  });

  describe("reject", () => {
    it("should reject peminjaman", async () => {
      const peminjaman = {
        id: 1,
        status: "pending",
        jumlah: 1,
        alat: { nama_alat: "Laptop" },
        user: { nama: "User" },
        update: jest.fn(),
      };

      jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

      const LogAktivitas = require("../../src/models/LogAktivitas");
      LogAktivitas.create.mockResolvedValue({ id: 1 });

      await peminjamanService.reject(1, mockUser);

      expect(peminjaman.update).toHaveBeenCalledWith({ status: "ditolak" });
      expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("returnItem", () => {
    it("should return item and restore stock", async () => {
      const peminjaman = {
        id: 1,
        status: "dipinjam",
        jumlah: 1,
        alat_id: 5,
        alat: { nama_alat: "Laptop" },
        user: { nama: "User" },
        update: jest.fn(),
      };

      jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

      const Alat = require("../../src/models/Alat");
      const alat = {
        stok: 0,
        status: "dipinjam",
        update: jest.fn(),
        nama_alat: "Laptop",
      };
      Alat.findByPk.mockResolvedValue(alat);

      const LogAktivitas = require("../../src/models/LogAktivitas");
      LogAktivitas.create.mockResolvedValue({ id: 1 });

      const invalidateSpy = jest
        .spyOn(peminjamanService, "invalidateCache")
        .mockImplementation(() => {});

      await peminjamanService.returnItem(1, mockUser);

      expect(peminjaman.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "dikembalikan" }),
      );
      expect(alat.update).toHaveBeenCalledWith({ stok: 1, status: "tersedia" });
      expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("cancel", () => {
    it("should cancel peminjaman for same user", async () => {
      const peminjaman = {
        id: 1,
        status: "pending",
        user_id: 3,
        alat: { nama_alat: "Laptop" },
        update: jest.fn(),
      };

      jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

      const LogAktivitas = require("../../src/models/LogAktivitas");
      LogAktivitas.create.mockResolvedValue({ id: 1 });

      await peminjamanService.cancel(1, { id: 3 });

      expect(peminjaman.update).toHaveBeenCalledWith({ status: "dibatalkan" });
      expect(LogAktivitas.create).toHaveBeenCalledTimes(1);
    });

    it("should throw when user mismatch", async () => {
      const peminjaman = {
        id: 1,
        status: "pending",
        user_id: 5,
      };

      jest.spyOn(peminjamanService, "getById").mockResolvedValue(peminjaman);

      await expect(peminjamanService.cancel(1, { id: 3 })).rejects.toThrow(
        "Anda tidak memiliki akses untuk membatalkan",
      );
    });
  });

  describe("isAlatAvailable", () => {
    it("should return true when no overlapping peminjaman", async () => {
      const Peminjaman = require("../../src/models/Peminjaman");
      Peminjaman.findOne.mockResolvedValue(null);

      const result = await peminjamanService.isAlatAvailable(
        1,
        new Date(),
        new Date(),
      );

      expect(result).toBe(true);
    });

    it("should return false when overlapping exists", async () => {
      const Peminjaman = require("../../src/models/Peminjaman");
      Peminjaman.findOne.mockResolvedValue({ id: 1 });

      const result = await peminjamanService.isAlatAvailable(
        1,
        new Date(),
        new Date(),
      );

      expect(result).toBe(false);
    });
  });

  describe("invalidateCache", () => {
    it("should clear cache keys", async () => {
      peminjamanService.invalidateCache();

      expect(mockCacheHelper.del).toHaveBeenCalledWith("peminjaman_admin");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("peminjaman_petugas");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("alat_user_index");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("alat_admin_index");
      expect(mockCacheHelper.del).toHaveBeenCalledWith("admin_dashboard_stats");
    });
  });
});
