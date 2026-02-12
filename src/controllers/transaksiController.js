const peminjamanService = require("../services/peminjamanService");
const alatService = require("../services/alatService");
const logger = require("../config/logging");
const { getPagination } = require("../utils/helpers");
const { pushFlash } = require("../utils/flash");

// Menampilkan form pengajuan peminjaman
const showCreate = async (req, res) => {
  try {
    const alat = await alatService.getById(req.params.id);

    // Check availability
    const availability = await peminjamanService.checkAlatAvailability(
      alat.id,
      1,
    );

    if (!availability.available) {
      return res.status(400).send(availability.message);
    }

    res.render("peminjaman/tambah", {
      title: "Ajukan Peminjaman",
      alat,
      user: req.user,
      error: null,
    });
  } catch (error) {
    logger.error("Error in showCreate peminjaman:", error);
    res.status(404).send("Alat tidak ditemukan");
  }
};

// Proses pengajuan peminjaman
const create = async (req, res) => {
  try {
    const { alat_id, tanggal_pinjam, tanggal_kembali, jumlah, catatan } =
      req.body;

    await peminjamanService.create(
      {
        alat_id,
        tanggal_pinjam,
        tanggal_kembali,
        jumlah,
        catatan,
      },
      req.user,
    );

    res.redirect("/peminjaman");
  } catch (error) {
    logger.error("Error in peminjaman create:", error);
    pushFlash(req, "error", error.message || "Terjadi kesalahan");
    res.redirect(req.get("Referrer") || "/peminjaman");
  }
};

// Menampilkan riwayat peminjaman peminjam
const userIndex = async (req, res) => {
  try {
    const peminjaman = await peminjamanService.getByUserId(req.user.id);

    res.render("peminjaman/userIndex", {
      title: "Riwayat Peminjaman",
      peminjaman,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in user peminjaman index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Menampilkan daftar peminjaman untuk admin
const adminIndex = async (req, res) => {
  try {
    const { page, limit, offset } = req.pagination || {
      page: 1,
      limit: 10,
      offset: 0,
    };

    const { rows: peminjaman, count } =
      await peminjamanService.getAllForAdminPaginated({
        limit,
        offset,
      });

    const pagination = getPagination(page, limit, count);
    pagination.offset = offset;
    const start = count > 0 ? offset + 1 : 0;
    const end = Math.min(offset + limit, count);

    res.render("admin/peminjaman/index", {
      title: "Kelola Peminjaman",
      peminjaman,
      user: req.user,
      pagination,
      range: { start, end, total: count },
    });
  } catch (error) {
    logger.error("Error in admin peminjaman index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Menampilkan daftar peminjaman untuk petugas
const petugasIndex = async (req, res) => {
  try {
    const peminjaman = await peminjamanService.getForPetugas();

    res.render("petugas/dashboard", {
      title: "Dashboard Petugas",
      peminjaman,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in petugas peminjaman index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Setujui peminjaman (petugas)
const approve = async (req, res) => {
  try {
    await peminjamanService.approve(req.params.id, req.user);
    pushFlash(req, "success", "Peminjaman berhasil disetujui.");
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in peminjaman approve:", error);
    pushFlash(
      req,
      "error",
      error.message || "Terjadi kesalahan saat menyetujui.",
    );
    res.redirect("/petugas");
  }
};

// Tolak peminjaman (petugas)
const reject = async (req, res) => {
  try {
    await peminjamanService.reject(req.params.id, req.user);
    pushFlash(req, "success", "Peminjaman berhasil ditolak.");
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in peminjaman reject:", error);
    pushFlash(req, "error", error.message || "Terjadi kesalahan saat menolak.");
    res.redirect("/petugas");
  }
};

// Konfirmasi pengembalian alat (petugas)
const returnItem = async (req, res) => {
  try {
    const { kondisi_pengembalian, catatan_insiden, biaya_insiden } = req.body;
    await peminjamanService.returnItem(req.params.id, req.user, {
      kondisi_pengembalian,
      catatan_insiden,
      biaya_insiden,
    });
    pushFlash(req, "success", "Pengembalian alat berhasil dikonfirmasi.");
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in peminjaman return:", error);
    pushFlash(
      req,
      "error",
      error.message || "Terjadi kesalahan saat mengembalikan.",
    );
    res.redirect("/petugas");
  }
};

// Batalkan peminjaman (peminjam)
const cancel = async (req, res) => {
  try {
    await peminjamanService.cancel(req.params.id, req.user);
    pushFlash(req, "success", "Peminjaman berhasil dibatalkan.");
    res.redirect("/peminjaman");
  } catch (error) {
    logger.error("Error in peminjaman cancel:", error);
    pushFlash(
      req,
      "error",
      error.message || "Terjadi kesalahan saat membatalkan.",
    );
    res.redirect("/peminjaman");
  }
};

const submitFineProof = async (req, res) => {
  try {
    await peminjamanService.submitFineProof(req.params.id, req.user, req.file);
    pushFlash(req, "success", "Bukti pembayaran berhasil diunggah.");
    res.redirect("/peminjaman");
  } catch (error) {
    logger.error("Error in submit fine proof:", error);
    pushFlash(
      req,
      "error",
      error.message || "Terjadi kesalahan saat mengunggah bukti pembayaran.",
    );
    res.redirect("/peminjaman");
  }
};

const verifyFinePayment = async (req, res) => {
  try {
    await peminjamanService.verifyFinePayment(
      req.params.id,
      req.user,
      req.body.catatan_verifikasi_denda,
    );
    pushFlash(req, "success", "Pembayaran denda berhasil diverifikasi.");
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in verify fine payment:", error);
    pushFlash(
      req,
      "error",
      error.message || "Terjadi kesalahan saat memverifikasi pembayaran.",
    );
    res.redirect("/petugas");
  }
};

const rejectFinePayment = async (req, res) => {
  try {
    await peminjamanService.rejectFinePayment(
      req.params.id,
      req.user,
      req.body.catatan_verifikasi_denda,
    );
    pushFlash(req, "success", "Bukti pembayaran ditolak.");
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in reject fine payment:", error);
    pushFlash(
      req,
      "error",
      error.message || "Terjadi kesalahan saat menolak bukti pembayaran.",
    );
    res.redirect("/petugas");
  }
};

const markFinePaidCash = async (req, res) => {
  try {
    await peminjamanService.markFinePaidCash(
      req.params.id,
      req.user,
      req.body.catatan_verifikasi_denda,
    );
    pushFlash(
      req,
      "success",
      "Pembayaran tunai berhasil dicatat sebagai lunas.",
    );
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in mark fine paid cash:", error);
    pushFlash(
      req,
      "error",
      error.message || "Terjadi kesalahan saat mencatat pembayaran tunai.",
    );
    res.redirect("/petugas");
  }
};

module.exports = {
  showCreate,
  create,
  userIndex,
  adminIndex,
  petugasIndex,
  approve,
  reject,
  returnItem,
  cancel,
  submitFineProof,
  verifyFinePayment,
  rejectFinePayment,
  markFinePaidCash,
};
