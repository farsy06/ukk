const Kategori = require("../models/Kategori");
const Alat = require("../models/Alat");
const LogAktivitas = require("../models/LogAktivitas");
const { cacheHelper } = require("../middleware/caching");
const logger = require("../config/logging");

/**
 * Kategori Service
 * Service layer for kategori business logic
 */
class KategoriService {
  /**
   * Get all kategori
   * @returns {Promise<Array>} - Array of kategori
   */
  async getAll() {
    const cacheKey = "kategori_index";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Kategori index: Cache hit");
      return cachedData;
    }

    const kategori = await Kategori.getKategoriStats();

    // Cache for 10 minutes
    cacheHelper.set(cacheKey, kategori, 600);
    return kategori;
  }

  /**
   * Get kategori by ID
   * @param {number} id - Kategori ID
   * @returns {Promise<Object>} - Kategori object
   */
  async getById(id) {
    const kategori = await Kategori.findByPk(id);
    if (!kategori) {
      throw new Error("Kategori tidak ditemukan");
    }
    return kategori;
  }

  /**
   * Create new kategori
   * @param {Object} data - Kategori data
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Created kategori
   */
  async create(data, user) {
    const { nama_kategori, deskripsi } = data;

    // Cek apakah nama kategori sudah ada
    const existingKategori = await Kategori.findOne({
      where: { nama_kategori: nama_kategori.trim() },
    });

    if (existingKategori) {
      throw new Error("Nama kategori sudah ada");
    }

    const kategori = await Kategori.create({
      nama_kategori: nama_kategori.trim(),
      deskripsi: deskripsi || null,
    });

    // Log aktivitas - handle system user (id 0) specially
    if (user.id > 0) {
      await LogAktivitas.create({
        user_id: user.id,
        aktivitas: `Menambah kategori: ${nama_kategori}`,
      });
    } else {
      // For system activities, we can skip logging or use a different approach
      logger.info(
        `Kategori creation completed: ${nama_kategori} - Skipping activity log for system action`,
      );
    }

    // Invalidasi cache
    this.invalidateCache();

    return kategori;
  }

  /**
   * Update kategori
   * @param {number} id - Kategori ID
   * @param {Object} data - Updated data
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Updated kategori
   */
  async update(id, data, user) {
    const { nama_kategori, deskripsi } = data;
    const kategori = await this.getById(id);

    // Cek apakah nama kategori sudah digunakan kategori lain
    const existingKategori = await Kategori.findOne({
      where: {
        nama_kategori: nama_kategori.trim(),
        id: { [require("sequelize").Op.ne]: id },
      },
    });

    if (existingKategori) {
      throw new Error("Nama kategori sudah digunakan");
    }

    await kategori.update({
      nama_kategori: nama_kategori.trim(),
      deskripsi: deskripsi || kategori.deskripsi,
    });

    // Log aktivitas
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Mengupdate kategori: ${nama_kategori}`,
    });

    // Invalidasi cache
    this.invalidateCache();

    return kategori;
  }

  /**
   * Delete kategori
   * @param {number} id - Kategori ID
   * @param {Object} user - User object
   * @returns {Promise<void>}
   */
  async delete(id, user) {
    const kategori = await this.getById(id);
    const alatCount = await Alat.count({ where: { kategori_id: id } });
    if (alatCount > 0) {
      throw new Error("Kategori tidak dapat dihapus karena masih digunakan");
    }
    await kategori.destroy();

    // Log aktivitas
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Menghapus kategori: ${kategori.nama_kategori}`,
    });

    // Invalidasi cache
    this.invalidateCache();
  }

  /**
   * Invalidate cache for kategori
   * @returns {void}
   */
  invalidateCache() {
    cacheHelper.del("kategori_index");
    cacheHelper.del("admin_dashboard_stats");
  }

  /**
   * Check if kategori name is unique
   * @param {string} nama_kategori - Kategori name to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if unique
   */
  async isNameUnique(nama_kategori, excludeId = null) {
    const where = { nama_kategori: nama_kategori.trim() };
    if (excludeId) {
      where.id = { [require("sequelize").Op.ne]: excludeId };
    }

    const existing = await Kategori.findOne({ where });
    return !existing;
  }
}

module.exports = new KategoriService();
