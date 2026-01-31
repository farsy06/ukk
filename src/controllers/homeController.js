const Alat = require("../models/Alat");
const Kategori = require("../models/Kategori");
const logger = require("../config/logging");
const { cacheHelper } = require("../middleware/caching");

// Halaman home/landing page (public access)
const index = async (req, res) => {
  // Coba dapatkan dari cache terlebih dahulu
  const cacheKey = "home_alat_terbaru";
  const cachedData = cacheHelper.get(cacheKey);

  if (cachedData) {
    logger.info("Home index: Cache hit");
    return res.render("home/index", {
      title: "Selamat Datang di Sistem Peminjaman Alat",
      alat: cachedData.alat,
      totalAlatTersedia: cachedData.totalAlatTersedia,
      totalKategori: cachedData.totalKategori,
      user: res.locals.user,
    });
  }

  // Ambil beberapa alat yang tersedia untuk ditampilkan di home
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
    limit: 6, // Batasi 6 alat saja untuk home
    order: [["nama_alat", "ASC"]],
  });

  // Hitung total alat tersedia
  const totalAlatTersedia = await Alat.count({
    where: { status: "tersedia" },
  });

  // Hitung total kategori
  const totalKategori = await Kategori.count();

  // Simpan ke cache
  const cacheData = {
    alat,
    totalAlatTersedia,
    totalKategori,
  };
  cacheHelper.set(cacheKey, cacheData, 600); // Cache 10 menit

  res.render("home/index", {
    title: "Selamat Datang di Sistem Peminjaman Alat",
    alat,
    totalAlatTersedia,
    totalKategori,
    user: res.locals.user,
  });
};

module.exports = {
  index,
};
