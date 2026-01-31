const Peminjaman = require("../models/Peminjaman");
const Alat = require("../models/Alat");
const User = require("../models/User");
const Kategori = require("../models/Kategori");
const LogAktivitas = require("../models/LogAktivitas");
const { cacheHelper } = require("../middleware/caching");

// Menampilkan form pengajuan peminjaman
const showCreate = async (req, res) => {
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

  if (alat.status !== "tersedia") {
    return res.status(400).send("Alat tidak tersedia untuk dipinjam");
  }

  res.render("peminjaman/create", {
    title: "Ajukan Peminjaman",
    alat,
    user: req.user,
    error: null,
  });
};

// Proses pengajuan peminjaman
const create = async (req, res) => {
  const { alat_id, tanggal_pinjam, tanggal_kembali } = req.body;

  const alat = await Alat.findByPk(alat_id);
  if (!alat) {
    return res.status(404).send("Alat tidak ditemukan");
  }

  if (alat.status !== "tersedia") {
    return res.status(400).send("Alat tidak tersedia untuk dipinjam");
  }

  const tanggalPinjam = new Date(tanggal_pinjam);
  const tanggalKembali = new Date(tanggal_kembali);

  // Cek apakah alat sudah dipinjam pada tanggal tersebut
  const existingPeminjaman = await Peminjaman.findOne({
    where: {
      alat_id,
      status: ["disetujui", "dipinjam"],
      tanggal_pinjam: {
        [require("sequelize").Op.lte]: tanggalKembali,
      },
      tanggal_kembali: {
        [require("sequelize").Op.gte]: tanggalPinjam,
      },
    },
  });

  if (existingPeminjaman) {
    throw new Error("Alat sudah dipinjam pada tanggal tersebut");
  }

  // Buat peminjaman baru
  await Peminjaman.create({
    user_id: req.user.id,
    alat_id,
    tanggal_pinjam: tanggalPinjam,
    tanggal_kembali: tanggalKembali,
  });

  // Update status alat
  await alat.update({ status: "dipinjam" });

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Mengajukan peminjaman alat: ${alat.nama_alat}`,
  });

  // Invalidasi cache
  cacheHelper.del("alat_user_index");
  cacheHelper.del("peminjaman_user");

  res.redirect("/peminjaman");
};

// Menampilkan riwayat peminjaman peminjam
const userIndex = async (req, res) => {
  const peminjaman = await Peminjaman.findAll({
    where: { user_id: req.user.id },
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

  res.render("peminjaman/userIndex", {
    title: "Riwayat Peminjaman",
    peminjaman,
    user: req.user,
  });
};

// Menampilkan daftar peminjaman untuk admin
const adminIndex = async (req, res) => {
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

  res.render("admin/peminjaman/index", {
    title: "Kelola Peminjaman",
    peminjaman,
    user: req.user,
  });
};

// Menampilkan daftar peminjaman untuk petugas
const petugasIndex = async (req, res) => {
  const peminjaman = await Peminjaman.findAll({
    where: {
      status: ["pending", "disetujui", "dipinjam"],
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

  res.render("petugas/dashboard", {
    title: "Dashboard Petugas",
    peminjaman,
    user: req.user,
  });
};

// Setujui peminjaman (petugas)
const approve = async (req, res) => {
  const peminjaman = await Peminjaman.findByPk(req.params.id, {
    include: [
      { model: Alat, as: "alat" },
      { model: User, as: "user" },
    ],
  });
  if (!peminjaman) {
    return res.status(404).send("Peminjaman tidak ditemukan");
  }

  await peminjaman.update({
    status: "disetujui",
  });

  // Update status alat
  await Alat.update(
    { status: "dipinjam" },
    { where: { id: peminjaman.alat_id } },
  );

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Menyetujui peminjaman alat ${peminjaman.alat.nama_alat} untuk ${peminjaman.user.nama}`,
  });

  // Invalidasi cache
  cacheHelper.del("peminjaman_admin");
  cacheHelper.del("peminjaman_user");

  res.redirect("/petugas");
};

// Tolak peminjaman (petugas)
const reject = async (req, res) => {
  const peminjaman = await Peminjaman.findByPk(req.params.id, {
    include: [
      { model: Alat, as: "alat" },
      { model: User, as: "user" },
    ],
  });
  if (!peminjaman) {
    return res.status(404).send("Peminjaman tidak ditemukan");
  }

  await peminjaman.update({
    status: "ditolak",
  });

  // Update status alat kembali ke tersedia
  await Alat.update(
    { status: "tersedia" },
    { where: { id: peminjaman.alat_id } },
  );

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Menolak peminjaman alat ${peminjaman.alat.nama_alat} untuk ${peminjaman.user.nama}`,
  });

  // Invalidasi cache
  cacheHelper.del("peminjaman_admin");
  cacheHelper.del("peminjaman_user");
  cacheHelper.del("alat_user_index");

  res.redirect("/petugas");
};

// Konfirmasi pengembalian alat (petugas)
const returnItem = async (req, res) => {
  const peminjaman = await Peminjaman.findByPk(req.params.id, {
    include: [
      { model: Alat, as: "alat" },
      { model: User, as: "user" },
    ],
  });
  if (!peminjaman) {
    return res.status(404).send("Peminjaman tidak ditemukan");
  }

  const today = new Date();
  await peminjaman.update({
    status: "dikembalikan",
    tanggal_pengembalian: today,
  });

  // Update status alat
  await Alat.update(
    { status: "tersedia" },
    { where: { id: peminjaman.alat_id } },
  );

  // Log aktivitas
  await LogAktivitas.create({
    user_id: req.user.id,
    aktivitas: `Mengkonfirmasi pengembalian alat ${peminjaman.alat.nama_alat} dari ${peminjaman.user.nama}`,
  });

  // Invalidasi cache
  cacheHelper.del("peminjaman_admin");
  cacheHelper.del("peminjaman_user");
  cacheHelper.del("alat_user_index");

  res.redirect("/petugas");
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
