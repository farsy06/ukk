# eSarpra

[![Node.js](https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express.js](https://img.shields.io/badge/Express.js-%23404d59.svg?logo=express&logoColor=%2361DAFB)](https://expressjs.com)
[![EJS](https://img.shields.io/badge/EJS-B4CA65?logo=ejs&logoColor=fff)](https://ejs.co)
[![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?logo=sequelize&logoColor=fff)](https://sequelize.org)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=fff)](https://mysql.com)

**eSarpra** - Sistem peminjaman alat untuk keperluan proyek, lab, dan kegiatan operasional.

## Ringkasan

eSarpra membantu pencatatan peminjaman alat secara terstruktur: mulai dari data alat, data peminjam, proses peminjaman/pengembalian, hingga laporan.

## Tentang eSarpra

eSarpra (Sarana dan Prasarana) adalah sistem serbaguna untuk mengelola peminjaman aset dan perlengkapan di lingkungan sekolah, kampus, kantor, atau organisasi. Dirancang agar mudah dioperasikan, transparan, dan siap digunakan untuk kebutuhan produksi.

## Fitur Utama

- Manajemen data alat
- Manajemen data peminjam
- Peminjaman dan pengembalian
- Riwayat transaksi
- Laporan ringkas

## Struktur Proyek (ringkas)

- `src/` - kode sumber aplikasi
- `src/routes/` - definisi route
- `src/middleware/` - middleware otentikasi & helper
- `src/views/` - tampilan (EJS)

## Menjalankan Proyek (contoh)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

   atau

   ```bash
   npm start
   ```

## Catatan

Sesuaikan konfigurasi environment (misalnya database atau port) sesuai kebutuhan proyek UKK.

## Dokumentasi UKK

- [UKK_Dokumentasi.md](docs/UKK_Dokumentasi.md)
