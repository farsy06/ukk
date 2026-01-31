const Alat = require("../models/Alat");
const Kategori = require("../models/Kategori");
const LogAktivitas = require("../models/LogAktivitas");
const logger = require("../config/logging");
const { cacheHelper } = require("../middleware/caching");

// Menampilkan daftar alat (untuk peminjam)
const index = async (req, res) => {
  // Coba dapatkan dari cache terlebih dahulu
  const cacheKey = "alat_user_index";
  const cachedData = cacheHelper.get(cacheKey);

  if (cachedData) {
    logger.info("Alat index (user): Cache hit");
    return res.render("alat/index", {
      title: "Daftar Alat",
      alat: cachedData,
      user: req.user,
    });
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

  // Simpan ke cache
  cacheHelper.set(cacheKey, alat, 300); // Cache 5 menit

  res.render("alat/index", {
    title: "Daftar Alat",
    alat,
    user: req.user,
  });
};

// Menampilkan form tambah alat (untuk admin)
const showCreate = async (req, res) => {
  try {
    const kategori = await Kategori.findAll({
      order: [["nama_kategori", "ASC"]],
    });

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
  const { nama_alat, kategori_id, kondisi, stok } = req.body;

  // Buat alat baru
  await Alat.create({
    nama_alat: nama_alat.trim(),
    kategori_id: parseInt(kategori_id),
    kondisi,
    stok: parseInt(stok) || 1,
  });

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Menambah alat baru: ${nama_alat} (stok: ${stok || 1})`,
  });

  // Invalidasi cache alat
  cacheHelper.del("alat_user_index");
  cacheHelper.del("alat_admin_index");

  res.redirect("/admin/alat");
};

// Menampilkan form edit alat
const showEdit = async (req, res) => {
  try {
    const alat = await Alat.findByPk(req.params.id, {
      include: [
        {
          model: Kategori,
          as: "kategori",
        },
      ],
    });
    if (!alat) {
      return res.status(404).send("Alat tidak ditemukan");
    }

    const kategori = await Kategori.findAll({
      order: [["nama_kategori", "ASC"]],
    });

    res.render("admin/alat/edit", {
      title: "Edit Alat",
      alat,
      kategori,
      error: null,
    });
  } catch (error) {
    logger.error("Error di showEdit alat:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

// Proses update alat
const update = async (req, res) => {
  const { nama_alat, kategori_id, kondisi, status, stok } = req.body;
  const alat = await Alat.findByPk(req.params.id);

  if (!alat) {
    return res.status(404).send("Alat tidak ditemukan");
  }

  // Update alat
  await alat.update({
    nama_alat: nama_alat.trim(),
    kategori_id: parseInt(kategori_id),
    kondisi,
    status,
    stok: parseInt(stok) || alat.stok,
  });

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Mengupdate alat: ${nama_alat} (stok: ${stok || alat.stok})`,
  });

  // Invalidasi cache alat
  cacheHelper.del("alat_user_index");
  cacheHelper.del("alat_admin_index");

  res.redirect("/admin/alat");
};

// Hapus alat
const destroy = async (req, res) => {
  const alat = await Alat.findByPk(req.params.id);
  if (!alat) {
    return res.status(404).send("Alat tidak ditemukan");
  }

  await alat.destroy();

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Menghapus alat: ${alat.nama_alat}`,
  });

  // Invalidasi cache alat
  cacheHelper.del("alat_user_index");
  cacheHelper.del("alat_admin_index");

  res.redirect("/admin/alat");
};

// Menampilkan daftar alat untuk admin (semua status)
const adminIndex = async (req, res) => {
  // Coba dapatkan dari cache terlebih dahulu
  const cacheKey = "alat_admin_index";
  const cachedData = cacheHelper.get(cacheKey);

  if (cachedData) {
    logger.info("Alat index (admin): Cache hit");
    return res.render("admin/alat/index", {
      title: "Kelola Alat",
      alat: cachedData,
      user: req.user,
    });
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

  // Simpan ke cache
  cacheHelper.set(cacheKey, alat, 300); // Cache 5 menit

  res.render("admin/alat/index", {
    title: "Kelola Alat",
    alat,
    user: req.user,
  });
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
