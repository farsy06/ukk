const kategoriService = require("../services/kategoriService");
const logger = require("../config/logging");

// Menampilkan daftar kategori (untuk admin)
const index = async (req, res) => {
  try {
    const kategoriData = await kategoriService.getAll();
    // Convert to plain objects so toJSON() is called and alat_count is computed
    const kategori = kategoriData.map((item) => item.toJSON());

    res.render("admin/kategori/index", {
      title: "Kelola Kategori",
      kategori,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in kategori index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Menampilkan form tambah kategori
const showCreate = (req, res) => {
  res.render("admin/kategori/create", {
    title: "Tambah Kategori",
    error: null,
  });
};

// Proses tambah kategori
const create = async (req, res) => {
  try {
    const { nama_kategori } = req.body;

    await kategoriService.create({ nama_kategori }, req.user);
    res.redirect("/admin/kategori");
  } catch (error) {
    logger.error("Error in kategori create:", error);
    res.status(400).render("admin/kategori/create", {
      title: "Tambah Kategori",
      error: error.message,
    });
  }
};

// Menampilkan form edit kategori
const showEdit = async (req, res) => {
  try {
    const kategori = await kategoriService.getById(req.params.id);

    res.render("admin/kategori/edit", {
      title: "Edit Kategori",
      kategori,
      error: null,
    });
  } catch (error) {
    logger.error("Error di showEdit kategori:", error);
    res.status(404).send("Kategori tidak ditemukan");
  }
};

// Proses update kategori
const update = async (req, res) => {
  try {
    const { nama_kategori } = req.body;

    await kategoriService.update(req.params.id, { nama_kategori }, req.user);
    res.redirect("/admin/kategori");
  } catch (error) {
    logger.error("Error in kategori update:", error);
    const kategori = await kategoriService.getById(req.params.id);
    res.status(400).render("admin/kategori/edit", {
      title: "Edit Kategori",
      kategori,
      error: error.message,
    });
  }
};

// Hapus kategori
const destroy = async (req, res) => {
  try {
    await kategoriService.delete(req.params.id, req.user);
    res.redirect("/admin/kategori");
  } catch (error) {
    logger.error("Error in kategori delete:", error);
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
};
