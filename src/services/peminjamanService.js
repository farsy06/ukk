const fs = require("fs");
const path = require("path");
const Peminjaman = require("../models/Peminjaman");
const Alat = require("../models/Alat");
const User = require("../models/User");
const Kategori = require("../models/Kategori");
const LogAktivitas = require("../models/LogAktivitas");
const { cacheHelper } = require("../middleware/caching");
const logger = require("../config/logging");
const appConfig = require("../config/appConfig");
const { Op } = require("sequelize");

/**
 * Peminjaman Service
 * Service layer for peminjaman business logic
 */
class PeminjamanService {
  removePaymentProofFile(filePath) {
    if (!filePath || typeof filePath !== "string") return;

    const normalizedPath = filePath.replace(/\\/g, "/");
    if (!normalizedPath.startsWith("/uploads/pembayaran/")) return;

    const absolutePath = path.join(__dirname, "../../public", normalizedPath);

    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (error) {
        logger.warn(`Gagal menghapus bukti pembayaran lama: ${error.message}`);
      }
    }
  }

  getOverdueFineForReturn(peminjaman, today) {
    if (typeof peminjaman.calculateOverdueFine === "function") {
      return peminjaman.calculateOverdueFine();
    }

    const storedFine = Number(peminjaman.denda_terlambat || 0);
    if (Number.isFinite(storedFine) && storedFine > 0) {
      return storedFine;
    }

    if (!peminjaman.tanggal_kembali) {
      return 0;
    }

    const dueDate = new Date(peminjaman.tanggal_kembali);
    dueDate.setHours(0, 0, 0, 0);

    const returnDate = new Date(today);
    returnDate.setHours(0, 0, 0, 0);

    if (returnDate <= dueDate) {
      return 0;
    }

    const diffTime = returnDate.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays * appConfig.fines.overduePerDay;
  }

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
        status: [
          "pending",
          "disetujui",
          "dipinjam",
          "dikembalikan",
          "ditolak",
          "dibatalkan",
        ],
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

    if (tanggalKembali < tanggalPinjam) {
      throw new Error(
        "Tanggal kembali harus sama dengan atau lebih besar dari tanggal pinjam",
      );
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
  async returnItem(id, user, returnData = {}) {
    const peminjaman = await this.getById(id);

    if (peminjaman.status !== "disetujui" && peminjaman.status !== "dipinjam") {
      throw new Error("Status peminjaman tidak valid untuk pengembalian");
    }

    const jumlah = peminjaman.jumlah || 1;
    const today = new Date();
    const returnConditionRaw = returnData.kondisi_pengembalian || "normal";
    const returnCondition = String(returnConditionRaw).toLowerCase().trim();
    const validReturnCondition = ["normal", "rusak", "hilang"].includes(
      returnCondition,
    )
      ? returnCondition
      : "normal";
    const incidentNotes = (returnData.catatan_insiden || "").trim() || null;
    const incidentCostInput = Number(returnData.biaya_insiden || 0);
    const incidentCost =
      Number.isFinite(incidentCostInput) && incidentCostInput > 0
        ? incidentCostInput
        : 0;
    const hasIncident = validReturnCondition !== "normal";
    if (hasIncident && !incidentNotes) {
      throw new Error("Catatan insiden wajib diisi untuk kondisi rusak/hilang");
    }

    // Calculate fine for overdue items and incident charge
    const overdueFine = this.getOverdueFineForReturn(peminjaman, today);
    const incidentFine = hasIncident ? incidentCost : 0;
    const totalFine = overdueFine + incidentFine;
    const incidentStatus = hasIncident
      ? incidentFine > 0
        ? "dilaporkan"
        : "selesai"
      : "none";

    // Update peminjaman status
    await peminjaman.update({
      status: "dikembalikan",
      tanggal_pengembalian: today,
      denda_terlambat: overdueFine,
      denda_insiden: incidentFine,
      denda: totalFine,
      kondisi_pengembalian: validReturnCondition,
      status_insiden: incidentStatus,
      catatan_insiden: incidentNotes,
      status_pembayaran_denda: totalFine > 0 ? "belum_bayar" : "lunas",
      tanggal_pembayaran_denda: totalFine > 0 ? null : today,
      catatan_verifikasi_denda: null,
    });

    // Add stock back
    const alat = await Alat.findByPk(peminjaman.alat_id);
    if (alat) {
      const shouldRestoreStock = validReturnCondition !== "hilang";
      const newStock = shouldRestoreStock ? alat.stok + jumlah : alat.stok;
      let newStatus = alat.status;
      let newKondisi = alat.kondisi;

      if (validReturnCondition === "normal") {
        if (newStock > 0) {
          newStatus = "tersedia";
        }
      }
      if (validReturnCondition === "rusak") {
        newStatus = "maintenance";
        newKondisi =
          alat.kondisi === "rusak_berat" ? "rusak_berat" : "rusak_ringan";
      }
      if (validReturnCondition === "hilang") {
        newStatus = newStock > 0 ? "tersedia" : "maintenance";
      }

      const alatPayload = {
        stok: newStock,
        status: newStatus,
      };

      if (typeof newKondisi !== "undefined") {
        alatPayload.kondisi = newKondisi;
      }

      await alat.update(alatPayload);

      logger.info(
        `Item returned: ${alat.nama_alat}, condition: ${validReturnCondition}, stock ${alat.stok} -> ${newStock}`,
      );
    }

    // Log activity
    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Mengkonfirmasi pengembalian alat ${peminjaman.alat.nama_alat} dari ${peminjaman.user.nama} (jumlah: ${jumlah}, kondisi: ${validReturnCondition}, denda: Rp ${totalFine})`,
    });

    // Invalidate cache
    this.invalidateCache();

    return peminjaman;
  }

  async submitFineProof(id, user, file) {
    const peminjaman = await this.getById(id);

    if (peminjaman.user_id !== user.id) {
      throw new Error(
        "Anda tidak memiliki akses untuk mengunggah bukti pada peminjaman ini",
      );
    }

    if (peminjaman.status !== "dikembalikan") {
      throw new Error(
        "Bukti pembayaran hanya dapat diunggah setelah pengembalian",
      );
    }

    const totalFine = Number(peminjaman.denda || 0);
    if (!Number.isFinite(totalFine) || totalFine <= 0) {
      throw new Error("Peminjaman ini tidak memiliki denda");
    }

    if (
      !["belum_bayar", "ditolak"].includes(peminjaman.status_pembayaran_denda)
    ) {
      throw new Error("Status pembayaran tidak dapat diunggah ulang");
    }

    if (!file || !file.filename) {
      throw new Error("File bukti pembayaran wajib diunggah");
    }

    const previousProof = peminjaman.bukti_pembayaran;
    const proofPath = `/uploads/pembayaran/${file.filename}`;

    await peminjaman.update({
      bukti_pembayaran: proofPath,
      status_pembayaran_denda: "menunggu_verifikasi",
      tanggal_pembayaran_denda: new Date(),
      catatan_verifikasi_denda: null,
    });

    this.removePaymentProofFile(previousProof);

    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Mengunggah bukti pembayaran denda untuk peminjaman #${peminjaman.id}`,
    });

    this.invalidateCache();
    return peminjaman;
  }

  async verifyFinePayment(id, user, notes = null) {
    const peminjaman = await this.getById(id);

    if (peminjaman.status !== "dikembalikan") {
      throw new Error("Peminjaman belum berada pada status dikembalikan");
    }

    const totalFine = Number(peminjaman.denda || 0);
    if (!Number.isFinite(totalFine) || totalFine <= 0) {
      throw new Error("Peminjaman ini tidak memiliki denda");
    }

    if (peminjaman.status_pembayaran_denda !== "menunggu_verifikasi") {
      throw new Error("Tidak ada pembayaran yang menunggu verifikasi");
    }

    await peminjaman.update({
      status_pembayaran_denda: "lunas",
      catatan_verifikasi_denda:
        (typeof notes === "string" && notes.trim()) || null,
    });

    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Memverifikasi pembayaran denda untuk peminjaman #${peminjaman.id}`,
    });

    this.invalidateCache();
    return peminjaman;
  }

  async rejectFinePayment(id, user, notes = null) {
    const peminjaman = await this.getById(id);

    if (peminjaman.status !== "dikembalikan") {
      throw new Error("Peminjaman belum berada pada status dikembalikan");
    }

    const totalFine = Number(peminjaman.denda || 0);
    if (!Number.isFinite(totalFine) || totalFine <= 0) {
      throw new Error("Peminjaman ini tidak memiliki denda");
    }

    if (peminjaman.status_pembayaran_denda !== "menunggu_verifikasi") {
      throw new Error("Tidak ada pembayaran yang menunggu verifikasi");
    }

    await peminjaman.update({
      status_pembayaran_denda: "ditolak",
      catatan_verifikasi_denda:
        (typeof notes === "string" && notes.trim()) || null,
    });

    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Menolak bukti pembayaran denda untuk peminjaman #${peminjaman.id}`,
    });

    this.invalidateCache();
    return peminjaman;
  }

  async markFinePaidCash(id, user, notes) {
    const peminjaman = await this.getById(id);

    if (peminjaman.status !== "dikembalikan") {
      throw new Error("Peminjaman belum berada pada status dikembalikan");
    }

    const totalFine = Number(peminjaman.denda || 0);
    if (!Number.isFinite(totalFine) || totalFine <= 0) {
      throw new Error("Peminjaman ini tidak memiliki denda");
    }

    if (peminjaman.status_pembayaran_denda === "lunas") {
      throw new Error("Denda sudah berstatus lunas");
    }

    const cashNotes = typeof notes === "string" ? notes.trim() : "";
    if (!cashNotes) {
      throw new Error("Catatan pembayaran tunai wajib diisi");
    }

    await peminjaman.update({
      status_pembayaran_denda: "lunas",
      tanggal_pembayaran_denda: new Date(),
      catatan_verifikasi_denda: `Pembayaran tunai: ${cashNotes}`,
    });

    await LogAktivitas.create({
      user_id: user.id,
      aktivitas: `Menandai pembayaran tunai denda untuk peminjaman #${peminjaman.id}`,
    });

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
