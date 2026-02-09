const Peminjaman = require("../models/Peminjaman");
const Alat = require("../models/Alat");
const User = require("../models/User");
const Kategori = require("../models/Kategori");
const LogAktivitas = require("../models/LogAktivitas");
const { cacheHelper } = require("../middleware/caching");
const logger = require("../config/logging");
const { Op } = require("sequelize");

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
   * Check if alat is available for borrowing
   * @param {number} alatId - Alat ID
   * @param {number} jumlah - Amount requested
   * @returns {Promise<{available: boolean, message: string}>}
   */
  async checkAlatAvailability(alatId, jumlah) {
    const alat = await Alat.findByPk(alatId);

    if (!alat) {
      return { available: false, message: "Alat tidak ditemukan" };
    }

    if (alat.status !== "tersedia") {
      return {
        available: false,
        message: `Alat tidak tersedia (status: ${alat.status})`,
      };
    }

    if (alat.stok <= 0) {
      return { available: false, message: "Stok alat habis" };
    }

    if (alat.stok < jumlah) {
      return {
        available: false,
        message: `Stok tidak mencukupi. Tersedia: ${alat.stok}, Diminta: ${jumlah}`,
      };
    }

    return { available: true, message: "Alat tersedia" };
  }

  /**
   * Create new peminjaman (borrowing request)
   * @param {Object} data - Peminjaman data
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Created peminjaman
   */
  async create(data, user) {
    const { alat_id, tanggal_pinjam, tanggal_kembali, jumlah, catatan } = data;

    // Validate input
    if (!alat_id || !tanggal_pinjam || !tanggal_kembali) {
      throw new Error("Data peminjaman tidak lengkap");
    }

    const jumlahPinjam = parseInt(jumlah, 10) || 1;

    if (jumlahPinjam < 1) {
      throw new Error("Jumlah peminjaman minimal 1");
    }

    // Check alat availability
    const availability = await this.checkAlatAvailability(
      alat_id,
      jumlahPinjam,
    );
    if (!availability.available) {
      throw new Error(availability.message);
    }

    const alat = await Alat.findByPk(alat_id);

    // Validate dates
    const tanggalPinjam = new Date(tanggal_pinjam);
    const tanggalKembali = new Date(tanggal_kembali);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (tanggalPinjam < today) {
      throw new Error("Tanggal pinjam tidak boleh di masa lalu");
    }

    if (tanggalKembali <= tanggalPinjam) {
      throw new Error("Tanggal kembali harus lebih besar dari tanggal pinjam");
    }

    // Max borrowing 7 days
    const diffDays = Math.ceil(
      (tanggalKembali - tanggalPinjam) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 7) {
      throw new Error("Maksimal peminjaman adalah 7 hari");
    }

    // Create peminjaman
    const peminjaman = await Peminjaman.create({
      user_id: user.id,
      alat_id,
      tanggal_pinjam: tanggalPinjam,
      tanggal_kembali: tanggalKembali,
      jumlah: jumlahPinjam,
      catatan: catatan || null,
      status: "pending",
    });

    // Log activity
    if (user.id > 0) {
      await LogAktivitas.create({
        user_id: user.id,
        aktivitas: `Mengajukan peminjaman alat: ${alat.nama_alat} (jumlah: ${jumlahPinjam})`,
      });
    }

    logger.info(
      `Peminjaman created: ${alat.nama_alat} by user ${user.id}, quantity: ${jumlahPinjam}`,
    );

    // Invalidate cache
    this.invalidateCache();

    return peminjaman;
  }

  /**
   * Approve peminjaman - deduct stock and update status
   * @param {number} id - Peminjaman ID
   * @param {Object} user - User object (petugas)
   * @returns {Promise<Object>} - Updated peminjaman
   */
  async approve(id, user) {
    const peminjaman = await this.getById(id);

    if (peminjaman.status !== "pending") {
      throw new Error("Peminjaman sudah diproses sebelumnya");
    }

    const jumlah = peminjaman.jumlah || 1;
    const alat = await Alat.findByPk(peminjaman.alat_id);

    if (!alat) {
      throw new Error("Alat tidak ditemukan");
    }

    // Double check stock availability
    if (alat.stok < jumlah) {
      // Reject if stock is insufficient
      await peminjaman.update({ status: "ditolak" });
      throw new Error(
        `Stok tidak mencukupi. Tersedia: ${alat.stok}, Diminta: ${jumlah}`,
      );
    }

    // Update peminjaman status
    await peminjaman.update({
      status: "disetujui",
    });

    // Deduct stock
    const newStock = alat.stok - jumlah;
    let newStatus = alat.status;

    // If stock runs out, change status to "dipinjam" (all borrowed out)
    if (newStock === 0) {
      newStatus = "dipinjam";
    }

    await alat.update({
      stok: newStock,
      status: newStatus,
    });

    // Log activity
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Menyetujui peminjaman alat ${alat.nama_alat} untuk ${peminjaman.user.nama} (jumlah: ${jumlah})`,
    });

    logger.info(
      `Peminjaman approved: ${alat.nama_alat}, stock reduced from ${alat.stok} to ${newStock}`,
    );

    // Invalidate cache
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

    if (peminjaman.status !== "pending") {
      throw new Error("Peminjaman sudah diproses sebelumnya");
    }

    await peminjaman.update({
      status: "ditolak",
    });

    // Log activity
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Menolak peminjaman alat ${peminjaman.alat.nama_alat} untuk ${peminjaman.user.nama} (jumlah: ${peminjaman.jumlah || 1})`,
    });

    // Invalidate cache
    this.invalidateCache();

    return peminjaman;
  }

  /**
   * Return item - add stock back and update status
   * @param {number} id - Peminjaman ID
   * @param {Object} user - User object (petugas)
   * @returns {Promise<Object>} - Updated peminjaman
   */
  async returnItem(id, user) {
    const peminjaman = await this.getById(id);

    if (peminjaman.status !== "disetujui" && peminjaman.status !== "dipinjam") {
      throw new Error("Status peminjaman tidak valid untuk pengembalian");
    }

    const jumlah = peminjaman.jumlah || 1;
    const today = new Date();

    // Update peminjaman status
    await peminjaman.update({
      status: "dikembalikan",
      tanggal_pengembalian: today,
    });

    // Add stock back
    const alat = await Alat.findByPk(peminjaman.alat_id);
    if (alat) {
      const newStock = alat.stok + jumlah;

      // If stock was 0 and now available, change status back to "tersedia"
      let newStatus = alat.status;
      if (alat.status === "dipinjam" && newStock > 0) {
        newStatus = "tersedia";
      }

      await alat.update({
        stok: newStock,
        status: newStatus,
      });

      logger.info(
        `Item returned: ${alat.nama_alat}, stock increased from ${alat.stok} to ${newStock}`,
      );
    }

    // Log activity
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Mengkonfirmasi pengembalian alat ${peminjaman.alat.nama_alat} dari ${peminjaman.user.nama} (jumlah: ${jumlah})`,
    });

    // Invalidate cache
    this.invalidateCache();

    return peminjaman;
  }

  /**
   * Cancel peminjaman (by user before approval)
   * @param {number} id - Peminjaman ID
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Updated peminjaman
   */
  async cancel(id, user) {
    const peminjaman = await this.getById(id);

    if (peminjaman.user_id !== user.id) {
      throw new Error(
        "Anda tidak memiliki akses untuk membatalkan peminjaman ini",
      );
    }

    if (peminjaman.status !== "pending") {
      throw new Error("Peminjaman yang sudah diproses tidak dapat dibatalkan");
    }

    await peminjaman.update({
      status: "dibatalkan",
    });

    // Log activity
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Membatalkan peminjaman alat ${peminjaman.alat.nama_alat}`,
    });

    // Invalidate cache
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
        [Op.lte]: tanggal_kembali,
      },
      tanggal_kembali: {
        [Op.gte]: tanggal_pinjam,
      },
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    const existing = await Peminjaman.findOne({ where });
    return !existing;
  }
}

module.exports = new PeminjamanService();
