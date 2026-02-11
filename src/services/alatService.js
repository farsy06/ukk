const Alat = require("../models/Alat");
const Kategori = require("../models/Kategori");
const LogAktivitas = require("../models/LogAktivitas");
const { cacheHelper } = require("../middleware/caching");
const logger = require("../config/logging");

/**
 * Alat Service
 * Service layer for alat business logic
 */
class AlatService {
  /**
   * Get all available alat for peminjam
   * @returns {Promise<Array>} - Array of available alat
   */
  async getAllAvailable() {
    const cacheKey = "alat_user_index";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Alat index (user): Cache hit");
      return cachedData;
    }

    const alat = await Alat.findAll({
      where: {
        status: "tersedia",
      },
      include: [
        {
          model: Kategori,
          as: "kategori",
        },
      ],
    });

    // Cache for 5 minutes
    cacheHelper.set(cacheKey, alat, 300);
    return alat;
  }

  /**
   * Get all alat for admin (all statuses)
   * @returns {Promise<Array>} - Array of all alat
   */
  async getAllForAdmin() {
    const cacheKey = "alat_admin_index";
    const cachedData = cacheHelper.get(cacheKey);

    if (cachedData) {
      logger.info("Alat index (admin): Cache hit");
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

    // Cache for 5 minutes
    cacheHelper.set(cacheKey, alat, 300);
    return alat;
  }

  /**
   * Get paginated alat for admin (all statuses)
   * @param {Object} options - Pagination options
   * @param {number} options.limit - Items per page
   * @param {number} options.offset - Offset
   * @returns {Promise<{rows: Array, count: number}>}
   */
  async getAllForAdminPaginated({ limit, offset }) {
    return Alat.findAndCountAll({
      include: [
        {
          model: Kategori,
          as: "kategori",
        },
      ],
      order: [["nama_alat", "ASC"]],
      limit,
      offset,
      distinct: true,
    });
  }

  /**
   * Get alat by ID
   * @param {number} id - Alat ID
   * @returns {Promise<Object>} - Alat object
   */
  async getById(id) {
    const alat = await Alat.findByPk(id, {
      include: [
        {
          model: Kategori,
          as: "kategori",
        },
      ],
    });

    if (!alat) {
      throw new Error("Alat tidak ditemukan");
    }

    return alat;
  }

  /**
   * Create new alat
   * @param {Object} data - Alat data
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Created alat
   */
  async create(data, user) {
    const alat = await Alat.create({
      nama_alat: data.nama_alat.trim(),
      kategori_id: parseInt(data.kategori_id),
      kondisi: data.kondisi,
      stok: parseInt(data.stok) || 1,
      status: data.status || "tersedia",
      deskripsi: data.deskripsi || null,
      foto: data.foto || null,
    });

    // Log aktivitas - handle system user (id 0) specially
    if (user.id > 0) {
      await LogAktivitas.create({
        user_id: user.id,
        aktivitas: `Menambah alat baru: ${data.nama_alat} (stok: ${data.stok || 1})`,
      });
    } else {
      // For system activities, we can skip logging or use a different approach
      logger.info(
        `Alat creation completed: ${data.nama_alat} - Skipping activity log for system action`,
      );
    }

    // Invalidasi cache
    this.invalidateCache();

    return alat;
  }

  /**
   * Update alat
   * @param {number} id - Alat ID
   * @param {Object} data - Updated data
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Updated alat
   */
  async update(id, data, user) {
    const alat = await this.getById(id);

    await alat.update({
      nama_alat: data.nama_alat.trim(),
      kategori_id: parseInt(data.kategori_id),
      kondisi: data.kondisi,
      status: data.status,
      stok: parseInt(data.stok) || alat.stok,
      deskripsi: data.deskripsi ?? alat.deskripsi,
      foto: typeof data.foto !== "undefined" ? data.foto : alat.foto,
    });

    // Log aktivitas
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Mengupdate alat: ${data.nama_alat} (stok: ${data.stok || alat.stok})`,
    });

    // Invalidasi cache
    this.invalidateCache();

    return alat;
  }

  /**
   * Delete alat
   * @param {number} id - Alat ID
   * @param {Object} user - User object
   * @returns {Promise<void>}
   */
  async delete(id, user) {
    const alat = await this.getById(id);
    await alat.destroy();

    // Log aktivitas
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Menghapus alat: ${alat.nama_alat}`,
    });

    // Invalidasi cache
    this.invalidateCache();

    return;
  }

  /**
   * Get kategori for dropdown
   * @returns {Promise<Array>} - Array of kategori
   */
  async getKategori() {
    return await Kategori.findAll({
      order: [["nama_kategori", "ASC"]],
    });
  }

  /**
   * Invalidate cache for alat
   * @returns {void}
   */
  invalidateCache() {
    cacheHelper.del("alat_user_index");
    cacheHelper.del("alat_admin_index");
    cacheHelper.del("kategori_index");
    cacheHelper.del("admin_dashboard_stats");
  }

  /**
   * Check if alat is available for peminjaman
   * @param {number} id - Alat ID
   * @returns {Promise<boolean>} - True if available
   */
  async isAvailable(id) {
    const alat = await Alat.findByPk(id);
    return alat && alat.status === "tersedia" && alat.stok > 0;
  }

  /**
   * Update alat stock
   * @param {number} id - Alat ID
   * @param {number} quantity - Quantity to update (can be negative)
   * @returns {Promise<Object>} - Updated alat
   */
  async updateStock(id, quantity) {
    const alat = await this.getById(id);

    const newStock = alat.stok + quantity;
    if (newStock < 0) {
      throw new Error("Stok tidak mencukupi");
    }

    await alat.update({
      stok: newStock,
      status: newStock > 0 ? "tersedia" : "dipinjam",
    });

    // Invalidasi cache
    this.invalidateCache();

    return alat;
  }
}

module.exports = new AlatService();
