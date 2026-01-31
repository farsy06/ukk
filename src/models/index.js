// File ini untuk mengatur semua associations dan export models

const User = require("./User");
const Kategori = require("./Kategori");
const Alat = require("./Alat");
const Peminjaman = require("./Peminjaman");
const LogAktivitas = require("./LogAktivitas");

// Export semua models
module.exports = {
  User,
  Kategori,
  Alat,
  Peminjaman,
  LogAktivitas,
};
