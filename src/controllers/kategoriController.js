const Kategori = require("../models/Kategori");
const LogAktivitas = require("../models/LogAktivitas");
const logger = require("../config/logging");
const { cacheHelper } = require("../middleware/caching");

// Menampilkan daftar kategori (untuk admin)
const index = async (req, res) => {
  // Coba dapatkan dari cache terlebih dahulu
  const cacheKey = "kategori_index";
  const cachedData = cacheHelper.get(cacheKey);

  if (cachedData) {
    logger.info("Kategori index: Cache hit");
    return res.render("admin/kategori/index", {
      title: "Kelola Kategori",
      kategori: cachedData,
      user: req.user,
    });
  }

  const kategori = await Kategori.findAll({
    order: [["nama_kategori", "ASC"]],
  });

  // Simpan ke cache
  cacheHelper.set(cacheKey, kategori, 600); // Cache 10 menit

  res.render("admin/kategori/index", {
    title: "Kelola Kategori",
    kategori,
    user: req.user,
  });
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
  const { nama_kategori } = req.body;

  // Cek apakah nama kategori sudah ada
  const existingKategori = await Kategori.findOne({ where: { nama_kategori } });
  if (existingKategori) {
    throw new Error("Nama kategori sudah ada");
  }

  // Buat kategori baru
  await Kategori.create({
    nama_kategori: nama_kategori.trim(),
  });

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Menambah kategori: ${nama_kategori}`,
  });

  // Invalidasi cache kategori
  cacheHelper.del("kategori_index");

  res.redirect("/admin/kategori");
};

// Menampilkan form edit kategori
const showEdit = async (req, res) => {
  try {
    const kategori = await Kategori.findByPk(req.params.id);
    if (!kategori) {
      return res.status(404).send("Kategori tidak ditemukan");
    }

    res.render("admin/kategori/edit", {
      title: "Edit Kategori",
      kategori,
      error: null,
    });
  } catch (error) {
    logger.error("Error di showEdit kategori:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Proses update kategori
const update = async (req, res) => {
  const { nama_kategori } = req.body;
  const kategori = await Kategori.findByPk(req.params.id);

  if (!kategori) {
    return res.status(404).send("Kategori tidak ditemukan");
  }

  // Cek apakah nama kategori sudah digunakan kategori lain
  const existingKategori = await Kategori.findOne({
    where: {
      nama_kategori,
      id: { [require("sequelize").Op.ne]: req.params.id },
    },
  });

  if (existingKategori) {
    throw new Error("Nama kategori sudah digunakan");
  }

  // Update kategori
  await kategori.update({
    nama_kategori: nama_kategori.trim(),
  });

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Mengupdate kategori: ${nama_kategori}`,
  });

  // Invalidasi cache kategori
  cacheHelper.del("kategori_index");

  res.redirect("/admin/kategori");
};

// Hapus kategori
const destroy = async (req, res) => {
  const kategori = await Kategori.findByPk(req.params.id);
  if (!kategori) {
    return res.status(404).send("Kategori tidak ditemukan");
  }

  await kategori.destroy();

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Menghapus kategori: ${kategori.nama_kategori}`,
  });

  // Invalidasi cache kategori
  cacheHelper.del("kategori_index");

  res.redirect("/admin/kategori");
};

module.exports = {
  index,
  showCreate,
  create,
  showEdit,
  update,
  destroy,
};
