const Peminjaman = require("../models/Peminjaman");
const Alat = require("../models/Alat");
const User = require("../models/User");
const Kategori = require("../models/Kategori");
const LogAktivitas = require("../models/LogAktivitas");
const { cacheHelper } = require("../middleware/caching");
const logger = require("../config/logging");

/**
 * Peminjaman Service
 * Service layer for peminjaman business logic
 */
class PeminjamanService {
  /**
   * Get peminjaman by ID with relations
   * @param {number} id - Peminjaman ID
   * @returns {Promise<Object>} - Peminjaman object
   */
  async getById(id) {
    const peminjaman = await Peminjaman.findByPk(id, {
      include: [
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
        {
          model: User,
          as: "user",
        },
      ],
    });

    if (!peminjaman) {
      throw new Error("Peminjaman tidak ditemukan");
    }

    return peminjaman;
  }

  /**
   * Get all peminjaman for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of peminjaman
   */
  async getByUserId(userId) {
    const cacheKey = `peminjaman_user_${userId}`;
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Peminjaman user index: Cache hit");
      return cachedData;
    }

    const peminjaman = await Peminjaman.findAll({
      where: { user_id: userId },
      include: [
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
        {
          model: User,
          as: "user",
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Cache for 3 minutes
    cacheHelper.set(cacheKey, peminjaman, 180);
    return peminjaman;
  }

  /**
   * Get all peminjaman for admin
   * @returns {Promise<Array>} - Array of peminjaman
   */
  async getAllForAdmin() {
    const cacheKey = "peminjaman_admin";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Peminjaman admin index: Cache hit");
      return cachedData;
    }

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
      order: [["created_at", "DESC"]],
    });

    // Cache for 3 minutes
    cacheHelper.set(cacheKey, peminjaman, 180);
    return peminjaman;
  }

  /**
   * Get paginated peminjaman for admin
   * @param {Object} options - Pagination options
   * @param {number} options.limit - Items per page
   * @param {number} options.offset - Offset
   * @returns {Promise<{rows: Array, count: number}>}
   */
  async getAllForAdminPaginated({ limit, offset }) {
    return Peminjaman.findAndCountAll({
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
      order: [["created_at", "DESC"]],
      limit,
      offset,
      distinct: true,
    });
  }

  /**
   * Get peminjaman for petugas (pending, disetujui, dipinjam)
   * @returns {Promise<Array>} - Array of peminjaman
   */
  async getForPetugas() {
    const cacheKey = "peminjaman_petugas";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Peminjaman petugas index: Cache hit");
      return cachedData;
    }

    const peminjaman = await Peminjaman.findAll({
      where: {
        status: ["pending", "disetujui", "dipinjam"],
      },
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
      order: [["created_at", "DESC"]],
    });

    // Cache for 2 minutes
    cacheHelper.set(cacheKey, peminjaman, 120);
    return peminjaman;
  }

  /**
   * Create new peminjaman
   * @param {Object} data - Peminjaman data
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Created peminjaman
   */
  async create(data, user) {
    const { alat_id, tanggal_pinjam, tanggal_kembali } = data;

    const alat = await Alat.findByPk(alat_id);
    if (!alat) {
      throw new Error("Alat tidak ditemukan");
    }

    if (alat.status !== "tersedia") {
      throw new Error("Alat tidak tersedia untuk dipinjam");
    }

    const tanggalPinjam = new Date(tanggal_pinjam);
    const tanggalKembali = new Date(tanggal_kembali);

    // Cek apakah alat sudah dipinjam pada tanggal tersebut
    const existingPeminjaman = await Peminjaman.findOne({
      where: {
        alat_id,
        status: ["disetujui", "dipinjam"],
        tanggal_pinjam: {
          [require("sequelize").Op.lte]: tanggalKembali,
        },
        tanggal_kembali: {
          [require("sequelize").Op.gte]: tanggalPinjam,
        },
      },
    });

    if (existingPeminjaman) {
      throw new Error("Alat sudah dipinjam pada tanggal tersebut");
    }

    const peminjaman = await Peminjaman.create({
      user_id: user.id,
      alat_id,
      tanggal_pinjam: tanggalPinjam,
      tanggal_kembali: tanggalKembali,
    });

    // Update status alat
    await alat.update({ status: "dipinjam" });

    // Log aktivitas - handle system user (id 0) specially
    if (user.id > 0) {
      await LogAktivitas.create({
        user_id: user.id,
        aktivitas: `Mengajukan peminjaman alat: ${alat.nama_alat}`,
      });
    } else {
      // For system activities, we can skip logging or use a different approach
      logger.info(
        `Peminjaman request completed: ${alat.nama_alat} - Skipping activity log for system action`,
      );
    }

    // Invalidasi cache
    this.invalidateCache();

    return peminjaman;
  }

  /**
   * Approve peminjaman
   * @param {number} id - Peminjaman ID
   * @param {Object} user - User object (petugas)
   * @returns {Promise<Object>} - Updated peminjaman
   */
  async approve(id, user) {
    const peminjaman = await this.getById(id);

    await peminjaman.update({
      status: "disetujui",
    });

    // Update status alat
    await Alat.update(
      { status: "dipinjam" },
      { where: { id: peminjaman.alat_id } },
    );

    // Log aktivitas
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Menyetujui peminjaman alat ${peminjaman.alat.nama_alat} untuk ${peminjaman.user.nama}`,
    });

    // Invalidasi cache
    this.invalidateCache();

    return peminjaman;
  }

  /**
   * Reject peminjaman
   * @param {number} id - Peminjaman ID
   * @param {Object} user - User object (petugas)
   * @returns {Promise<Object>} - Updated peminjaman
   */
  async reject(id, user) {
    const peminjaman = await this.getById(id);

    await peminjaman.update({
      status: "ditolak",
    });

    // Update status alat kembali ke tersedia
    await Alat.update(
      { status: "tersedia" },
      { where: { id: peminjaman.alat_id } },
    );

    // Log aktivitas
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Menolak peminjaman alat ${peminjaman.alat.nama_alat} untuk ${peminjaman.user.nama}`,
    });

    // Invalidasi cache
    this.invalidateCache();

    return peminjaman;
  }

  /**
   * Return item (konfirmasi pengembalian)
   * @param {number} id - Peminjaman ID
   * @param {Object} user - User object (petugas)
   * @returns {Promise<Object>} - Updated peminjaman
   */
  async returnItem(id, user) {
    const peminjaman = await this.getById(id);

    const today = new Date();
    await peminjaman.update({
      status: "dikembalikan",
      tanggal_pengembalian: today,
    });

    // Update status alat
    await Alat.update(
      { status: "tersedia" },
      { where: { id: peminjaman.alat_id } },
    );

    // Log aktivitas
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Mengkonfirmasi pengembalian alat ${peminjaman.alat.nama_alat} dari ${peminjaman.user.nama}`,
    });

    // Invalidasi cache
    this.invalidateCache();

    return peminjaman;
  }

  /**
   * Invalidate cache for peminjaman
   * @returns {void}
   */
  invalidateCache() {
    cacheHelper.del("peminjaman_admin");
    cacheHelper.del("peminjaman_petugas");
    cacheHelper.del("alat_user_index");
    cacheHelper.del("alat_admin_index");
    cacheHelper.del("admin_dashboard_stats");
  }

  /**
   * Check if alat is available for peminjaman on specific dates
   * @param {number} alat_id - Alat ID
   * @param {Date} tanggal_pinjam - Tanggal pinjam
   * @param {Date} tanggal_kembali - Tanggal kembali
   * @param {number} excludeId - Exclude peminjaman ID (for updates)
   * @returns {Promise<boolean>} - True if available
   */
  async isAlatAvailable(
    alat_id,
    tanggal_pinjam,
    tanggal_kembali,
    excludeId = null,
  ) {
    const where = {
      alat_id,
      status: ["disetujui", "dipinjam"],
      tanggal_pinjam: {
        [require("sequelize").Op.lte]: tanggal_kembali,
      },
      tanggal_kembali: {
        [require("sequelize").Op.gte]: tanggal_pinjam,
      },
    };

    if (excludeId) {
      where.id = { [require("sequelize").Op.ne]: excludeId };
    }

    const existing = await Peminjaman.findOne({ where });
    return !existing;
  }
}

module.exports = new PeminjamanService();
