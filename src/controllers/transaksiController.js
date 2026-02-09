const peminjamanService = require("../services/peminjamanService");
const alatService = require("../services/alatService");
const logger = require("../config/logging");
const { getPagination } = require("../utils/helpers");

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

    res.render("peminjaman/create", {
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
    res.status(400).send(error.message);
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
    req.flash("success", "Peminjaman berhasil disetujui.");
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in peminjaman approve:", error);
    req.flash("error", error.message || "Terjadi kesalahan saat menyetujui.");
    res.redirect("/petugas");
  }
};

// Tolak peminjaman (petugas)
const reject = async (req, res) => {
  try {
    await peminjamanService.reject(req.params.id, req.user);
    req.flash("success", "Peminjaman berhasil ditolak.");
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in peminjaman reject:", error);
    req.flash("error", error.message || "Terjadi kesalahan saat menolak.");
    res.redirect("/petugas");
  }
};

// Konfirmasi pengembalian alat (petugas)
const returnItem = async (req, res) => {
  try {
    await peminjamanService.returnItem(req.params.id, req.user);
    req.flash("success", "Pengembalian alat berhasil dikonfirmasi.");
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in peminjaman return:", error);
    req.flash(
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
    req.flash("success", "Peminjaman berhasil dibatalkan.");
    res.redirect("/peminjaman");
  } catch (error) {
    logger.error("Error in peminjaman cancel:", error);
    req.flash("error", error.message || "Terjadi kesalahan saat membatalkan.");
    res.redirect("/peminjaman");
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
};
