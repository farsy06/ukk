const peminjamanService = require("../services/peminjamanService");
const alatService = require("../services/alatService");
const logger = require("../config/logging");

// Menampilkan form pengajuan peminjaman
const showCreate = async (req, res) => {
  try {
    const alat = await alatService.getById(req.params.id);

    if (alat.status !== "tersedia") {
      return res.status(400).send("Alat tidak tersedia untuk dipinjam");
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
    const { alat_id, tanggal_pinjam, tanggal_kembali } = req.body;

    await peminjamanService.create(
      {
        alat_id,
        tanggal_pinjam,
        tanggal_kembali,
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
    const peminjaman = await peminjamanService.getAllForAdmin();

    res.render("admin/peminjaman/index", {
      title: "Kelola Peminjaman",
      peminjaman,
      user: req.user,
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
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in peminjaman approve:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Tolak peminjaman (petugas)
const reject = async (req, res) => {
  try {
    await peminjamanService.reject(req.params.id, req.user);
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in peminjaman reject:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Konfirmasi pengembalian alat (petugas)
const returnItem = async (req, res) => {
  try {
    await peminjamanService.returnItem(req.params.id, req.user);
    res.redirect("/petugas");
  } catch (error) {
    logger.error("Error in peminjaman return:", error);
    res.status(500).send("Terjadi kesalahan");
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
};
