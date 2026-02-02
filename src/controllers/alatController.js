const alatService = require("../services/alatService");
const logger = require("../config/logging");

// Menampilkan daftar alat (untuk peminjam)
const index = async (req, res) => {
  try {
    const alat = await alatService.getAllAvailable();

    res.render("alat/index", {
      title: "Daftar Alat",
      alat,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in alat index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Menampilkan form tambah alat (untuk admin)
const showCreate = async (req, res) => {
  try {
    const kategori = await alatService.getKategori();

    res.render("admin/alat/create", {
      title: "Tambah Alat",
      kategori,
      error: null,
    });
  } catch (error) {
    logger.error("Error di showCreate alat:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Proses tambah alat
const create = async (req, res) => {
  try {
    const { nama_alat, kategori_id, kondisi, stok } = req.body;

    await alatService.create(
      {
        nama_alat,
        kategori_id,
        kondisi,
        stok,
      },
      req.user,
    );

    res.redirect("/admin/alat");
  } catch (error) {
    logger.error("Error in alat create:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Menampilkan form edit alat
const showEdit = async (req, res) => {
  try {
    const alat = await alatService.getById(req.params.id);
    const kategori = await alatService.getKategori();

    res.render("admin/alat/edit", {
      title: "Edit Alat",
      alat,
      kategori,
      error: null,
    });
  } catch (error) {
    logger.error("Error di showEdit alat:", error);
    res.status(404).send("Alat tidak ditemukan");
  }
};

// Proses update alat
const update = async (req, res) => {
  try {
    const { nama_alat, kategori_id, kondisi, status, stok } = req.body;

    await alatService.update(
      req.params.id,
      {
        nama_alat,
        kategori_id,
        kondisi,
        status,
        stok,
      },
      req.user,
    );

    res.redirect("/admin/alat");
  } catch (error) {
    logger.error("Error in alat update:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Hapus alat
const destroy = async (req, res) => {
  try {
    await alatService.delete(req.params.id, req.user);
    res.redirect("/admin/alat");
  } catch (error) {
    logger.error("Error in alat delete:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Menampilkan daftar alat untuk admin (semua status)
const adminIndex = async (req, res) => {
  try {
    const alat = await alatService.getAllForAdmin();

    res.render("admin/alat/index", {
      title: "Kelola Alat",
      alat,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in admin alat index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

module.exports = {
  index,
  showCreate,
  create,
  showEdit,
  update,
  destroy,
  adminIndex,
};
