const Alat = require("../models/Alat");
const Kategori = require("../models/Kategori");

// Halaman home/landing page (public access)
// Note: Caching is handled by standardCache.home middleware in routes/web.js
const index = async (req, res) => {
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

  res.render("home/index", {
    title: "Selamat Datang di eSarpra",
    alat,
    totalAlatTersedia,
    totalKategori,
    user: res.locals.user,
  });
};

module.exports = {
  index,
};
