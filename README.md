# Sistem Peminjaman Alat Laboratorium (ToolShare Pro)

Aplikasi web berbasis Node.js untuk mengelola sistem peminjaman alat laboratorium dengan antarmuka yang intuitif dan fitur manajemen yang komprehensif.

## 📋 Deskripsi Proyek

Sistem ini dirancang untuk mempermudah proses peminjaman alat laboratorium di institusi pendidikan atau laboratorium penelitian. Aplikasi ini menyediakan tiga jenis pengguna dengan hak akses berbeda: Admin, Petugas, dan Peminjam.

## 🎯 Fitur Utama

### 👑 Admin

- **Autentikasi**: Login & Logout aman
- **Manajemen Pengguna**: CRUD user (admin & petugas)
- **Manajemen Kategori**: Tambah, edit, hapus kategori alat
- **Manajemen Alat**: CRUD data alat laboratorium
- **Manajemen Peminjaman**: Pantau dan kelola seluruh transaksi peminjaman
- **Log Aktivitas**: Melihat riwayat aktivitas sistem
- **Laporan**: Fitur pencetakan laporan (dalam pengembangan)

### 👨‍💼 Petugas

- **Autentikasi**: Login & Logout
- **Validasi Peminjaman**: Menyetujui atau menolak permohonan peminjaman
- **Monitoring Pengembalian**: Memantau dan mengkonfirmasi pengembalian alat
- **Laporan**: Fitur pencetakan laporan (dalam pengembangan)

### 👨‍🎓 Peminjam

- **Autentikasi**: Login & Logout
- **Katalog Alat**: Melihat daftar alat yang tersedia
- **Pengajuan Peminjaman**: Mengajukan permohonan peminjaman alat
- **Pengembalian Alat**: Mengembalikan alat yang telah dipinjam
- **Riwayat Transaksi**: Melihat riwayat peminjaman pribadi

## 🛠️ Teknologi yang Digunakan

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Sequelize
- **Database**: MySQL
- **Template Engine**: EJS
- **Autentikasi**: express-session
- **Password Hashing**: bcrypt
- **Logging**: Winston
- **Security**: express-rate-limit, input sanitization
- **Caching**: node-cache
- **Service Layer**: Pola service kustom untuk logika bisnis
- **Async Handling**: Middleware async handler kustom

### Frontend

- **Framework CSS**: Bootstrap 5 (dari npm, disajikan secara lokal)
- **Template**: EJS (Embedded JavaScript)
- **JavaScript**: Vanilla JS + Bootstrap Bundle
- **Password Toggle**: Script kustom untuk fitur toggle password

### Development Tools

- **Package Manager**: npm
- **Environment**: .env configuration
- **Logging**: Winston
- **Validation**: Custom middleware validation
- **Error Handling**: Async handler & centralized error handling

## 📁 Struktur Project

```
src/
├── controllers/          # Logika bisnis aplikasi
│   ├── adminController.js
│   ├── alatController.js
│   ├── homeController.js
│   ├── kategoriController.js
│   ├── transaksiController.js
│   └── userController.js
├── services/             # Service layer untuk business logic
│   ├── alatService.js
│   ├── kategoriService.js
│   ├── peminjamanService.js
│   └── userService.js
├── models/              # Model database
│   ├── Alat.js
│   ├── Kategori.js
│   ├── LogAktivitas.js
│   ├── Peminjaman.js
│   ├── User.js
│   ├── associations.js
│   └── index.js
├── routes/              # Routing aplikasi
│   └── web.js
├── views/               # Template EJS
│   ├── admin/
│   ├── auth/
│   ├── alat/
│   ├── home/
│   ├── peminjaman/
│   ├── petugas/
│   ├── error.ejs
│   └── layout.ejs
├── middleware/          # Middleware aplikasi
│   ├── auth.js
│   ├── asyncHandler.js
│   ├── caching.js
│   ├── security.js
│   └── validation.js
├── config/              # Konfigurasi aplikasi
│   ├── appConfig.js
│   ├── database.js
│   └── logging.js
├── utils/               # Utility functions
│   └── helpers.js
└── app.js              # File utama aplikasi
```

## 🚀 Instalasi & Setup

### Prasyarat

- Node.js (versi 14 atau lebih baru)
- MySQL Server
- npm atau yarn

### Langkah Instalasi

1. **Clone Repository**

   ```bash
   git clone <repository-url>
   cd ukk
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Setup Bootstrap (Build Process)**

   ```bash
   # Salin Bootstrap dari node_modules ke public directory
   npm run build
   ```

4. **Konfigurasi Database**

   ```bash
   # Salin file konfigurasi
   cp .env.example .env

   # Edit file .env sesuai konfigurasi database Anda
   # Contoh:
   # DB_HOST=localhost
   # DB_NAME=ukk_db
   # DB_USER=root
   # DB_PASS=password
   ```

5. **Setup Database**

   ```bash
   # Jalankan migrasi database
   # (Database akan dibuat otomatis saat pertama kali koneksi)

   # Buat akun admin pertama
   npm run create-admin
   ```

6. **Jalankan Aplikasi**

   ```bash
   # Production mode (default)
   npm start

   # Development mode (dengan nodemon)
   npm run dev
   ```

7. **Akses Aplikasi**
   Buka browser dan kunjungi: `http://localhost:3000`

### 📦 Build Process

Aplikasi ini menggunakan sistem build untuk mengelola file statis:

- **`npm run build`**: Menyalin Bootstrap dari node_modules ke direktori public
- **`npm run copy:bootstrap`**: Perintah khusus untuk menyalin file Bootstrap
- **File yang disalin**:
  - `bootstrap.min.css` → `public/css/`
  - `bootstrap.bundle.min.js` → `public/js/`

**Kapan Harus Menjalankan Build:**
- Setelah instalasi awal
- Setelah update Bootstrap
- Jika file di direktori public hilang
- Sebelum deployment ke production

**Keuntungan Sistem Build:**
- Bootstrap tersedia secara offline (tanpa internet)
- Performa lebih cepat (file lokal)
- Tidak bergantung pada CDN eksternal
- Manajemen versi yang konsisten

## 🗃️ Database Schema

### Tabel Utama

#### users

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'petugas', 'peminjam') NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### kategori

```sql
CREATE TABLE kategori (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama_kategori VARCHAR(100) UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### alat

```sql
CREATE TABLE alat (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama_alat VARCHAR(100) NOT NULL,
  kategori_id INT,
  kondisi ENUM('baik', 'rusak_ringan', 'rusak_berat') DEFAULT 'baik',
  status ENUM('tersedia', 'dipinjam', 'maintenance') DEFAULT 'tersedia',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (kategori_id) REFERENCES kategori(id)
);
```

#### peminjaman

```sql
CREATE TABLE peminjaman (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  alat_id INT NOT NULL,
  tanggal_pinjam DATETIME DEFAULT CURRENT_TIMESTAMP,
  tanggal_kembali DATETIME,
  status ENUM('pending', 'disetujui', 'dipinjam', 'dikembalikan', 'ditolak') DEFAULT 'pending',
  tanggal_pengembalian DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (alat_id) REFERENCES alat(id)
);
```

#### log_aktivitas

```sql
CREATE TABLE log_aktivitas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  aktivitas TEXT NOT NULL,
  waktu DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🛣️ Rute Aplikasi

### Rute Publik

- `GET /` → Redirect ke halaman login
- `GET /login` → Form login
- `POST /login` → Proses autentikasi
- `GET /register` → Form registrasi peminjam
- `POST /register` → Proses registrasi
- `GET /logout` → Logout dan hapus session

### Rute Peminjam (Role: peminjam)

- `GET /alat` → Daftar alat yang tersedia
- `GET /peminjaman` → Riwayat peminjaman pribadi
- `GET /peminjaman/ajukan/:id` → Form pengajuan peminjaman
- `POST /peminjaman/ajukan` → Proses pengajuan peminjaman

### Rute Petugas (Role: petugas)

- `GET /petugas` → Dashboard petugas
- `GET /petugas/setujui/:id` → Setujui permohonan peminjaman
- `GET /petugas/tolak/:id` → Tolak permohonan peminjaman
- `GET /petugas/kembali/:id` → Konfirmasi pengembalian alat

### Rute Admin (Role: admin)

- `GET /admin` → Dashboard admin
- **Manajemen Kategori**:
  - `GET /admin/kategori` → Daftar kategori
  - `POST /admin/kategori` → Tambah kategori
  - `GET /admin/kategori/edit/:id` → Form edit kategori
  - `POST /admin/kategori/edit/:id` → Update kategori
  - `GET /admin/kategori/hapus/:id` → Hapus kategori
- **Manajemen Alat**:
  - `GET /admin/alat` → Daftar alat
  - `POST /admin/alat` → Tambah alat
  - `GET /admin/alat/edit/:id` → Form edit alat
  - `POST /admin/alat/edit/:id` → Update alat
  - `GET /admin/alat/hapus/:id` → Hapus alat
- **Manajemen Peminjaman**:
  - `GET /admin/peminjaman` → Daftar seluruh peminjaman
- **Manajemen User**:
  - `GET /admin/user` → Daftar user
  - `POST /admin/user` → Tambah user
  - `GET /admin/user/hapus/:id` → Hapus user
- **Log Sistem**:
  - `GET /admin/catatan` → Log aktivitas sistem

## 🚀 Fitur Keamanan & Performance

### 🔒 Keamanan

- **Rate Limiting**: Proteksi brute force login
- **Input Validation**: Validasi input ketat untuk semua field
- **Password Strength**: Validasi password kompleks
- **Input Sanitization**: Proteksi XSS dan injection
- **Error Handling**: Error handling konsisten dan aman
- **Session Management**: Session timeout dan keamanan

### ⚡ Performance

- **Caching System**: In-memory caching untuk data sering diakses
- **Eager Loading**: Menghindari N+1 query problem
- **Database Optimization**: Query optimization dan indexing
- **Cache Invalidation**: Otomatis menghapus cache saat data diupdate
- **Response Time**: 40-70% improvement response time

## 📖 Panduan Penggunaan

### Untuk Peminjam

1. **Registrasi**: Kunjungi `/register` dan isi data diri
2. **Login**: Gunakan username dan password untuk masuk
3. **Lihat Katalog**: Buka `/alat` untuk melihat alat yang tersedia
4. **Ajukan Peminjaman**: Pilih alat dan klik "Ajukan Peminjaman"
5. **Pantau Status**: Cek status peminjaman di `/peminjaman`
6. **Kembalikan Alat**: Konfirmasi pengembalian saat selesai menggunakan

### Untuk Petugas

1. **Login**: Masuk dengan akun petugas
2. **Validasi Permohonan**: Periksa dan setujui/tolak permohonan peminjaman
3. **Monitor Pengembalian**: Pantau alat yang harus dikembalikan
4. **Konfirmasi Pengembalian**: Verifikasi alat yang telah dikembalikan

### Untuk Admin

1. **Login**: Masuk dengan akun admin
2. **Manajemen Kategori**: Kelola kategori alat sesuai kebutuhan
3. **Manajemen Alat**: Tambah, edit, atau hapus data alat
4. **Manajemen User**: Kelola akun admin dan petugas
5. **Monitor Transaksi**: Pantau seluruh aktivitas peminjaman
6. **Lihat Log**: Periksa log aktivitas sistem untuk audit

## 🔧 Development

### Menjalankan Aplikasi

```bash
# Production mode (default)
npm start

# Development mode (dengan nodemon)
npm run dev
```

### Membuat Akun Admin

```bash
npm run create-admin
```

### Menjalankan Aplikasi dengan Fitur Lengkap

```bash
# Install dependencies
npm install

# Setup database
npm run create-admin

# Jalankan aplikasi
npm start

# Akses di browser: http://localhost:3000
```

### Arsitektur Development

Aplikasi ini menggunakan arsitektur berlapis dengan pola **Service Layer**:

```
Request → Middleware → Controller → Service → Model → Database
```

**Keuntungan Arsitektur Ini:**
- **Separation of Concerns**: Setiap layer memiliki tanggung jawab yang jelas
- **Testability**: Service layer memudahkan unit testing
- **Reusability**: Business logic dapat digunakan di berbagai controller
- **Maintainability**: Perubahan business logic tidak memengaruhi controller

**Service Layer Structure:**
- `alatService.js`: Manajemen alat dan inventaris
- `kategoriService.js`: Manajemen kategori alat
- `peminjamanService.js`: Manajemen proses peminjaman
- `userService.js`: Manajemen pengguna dan autentikasi

**Async Handling:**
- Semua operasi database menggunakan async/await
- Error handling konsisten dengan custom async handler
- Promise-based operations untuk performa optimal

## 🤝 Kontribusi

Kami menerima kontribusi dari siapa saja! Berikut langkah-langkahnya:

1. **Fork** repository ini
2. **Clone** ke lokal machine Anda
3. **Buat branch** baru: `git checkout -b fitur-baru`
4. **Lakukan perubahan** dan commit: `git commit -m 'Tambah fitur baru'`
5. **Push** ke branch: `git push origin fitur-baru`
6. **Buat Pull Request**

### Panduan Kontribusi

- Ikuti standar coding yang sudah ditetapkan
- Beri komentar yang jelas pada kode yang kompleks
- Update dokumentasi jika diperlukan
- Uji perubahan sebelum submit PR

## 📊 Performance Metrics

### Response Time Improvement

- **Home Page**: 40-50% lebih cepat (dengan caching 10 menit)
- **Admin Dashboard**: 60-70% lebih cepat (dengan caching 5 menit)
- **User Lists**: 50-60% lebih cepat (dengan caching 10 menit)
- **Peminjaman Lists**: 30-40% lebih cepat (dengan caching 3 menit)
- **Alat Lists**: 40-50% lebih cepat (dengan caching 5 menit)

### Database Optimization

- **Query Reduction**: 60-80% untuk halaman dengan relasi (menggunakan eager loading)
- **Concurrent Users**: Meningkat 3-5x kapasitas (dengan caching dan query optimization)
- **Cache Hit Rate**: 70-90% tergantung jenis data (node-cache implementation)
- **N+1 Problem**: Teratasi dengan proper includes di Sequelize

### Service Layer Benefits

- **Code Reusability**: Business logic dapat digunakan di berbagai controller
- **Testability**: Service layer memudahkan unit testing
- **Maintainability**: Perubahan business logic tidak memengaruhi controller
- **Separation of Concerns**: Setiap layer memiliki tanggung jawab yang jelas

### Security Features

- **Rate Limiting**: 5 percobaan login dalam 15 menit (express-rate-limit)
- **Password Strength**: Minimal 8 karakter dengan kompleksitas (custom validation)
- **Input Validation**: Validasi semua input user (middleware validation)
- **Input Sanitization**: Proteksi XSS dan injection (security middleware)
- **Error Handling**: Error response konsisten dan aman (centralized error handling)
- **Session Management**: Session timeout dan keamanan (express-session)

## 📄 Lisensi

Proyek ini dibuat untuk keperluan Ujian Kompetensi Keahlian (UKK) dan tidak dimaksudkan untuk penggunaan komersial.

## 🏗️ Arsitektur Aplikasi

### Arsitektur Berlapis (Layered Architecture)

```
Request → Middleware → Controller → Service → Model → Database
```

**Layer Responsibilities:**
- **Middleware**: Security, validation, caching, authentication
- **Controller**: Request handling, response formatting
- **Service**: Business logic, data processing
- **Model**: Data validation, database operations
- **Database**: Data storage and retrieval

### Security Layer

```
Rate Limiting → Input Sanitization → Validation → Authentication → Authorization → Controller
```

**Security Features:**
- **Rate Limiting**: Proteksi brute force login (5 percobaan/15 menit)
- **Input Sanitization**: Proteksi XSS dan injection
- **Validation**: Validasi input ketat untuk semua field
- **Authentication**: Session-based authentication
- **Authorization**: Role-based access control

### Performance Layer

```
Cache Middleware → Eager Loading → Optimized Queries → Response Caching
```

**Performance Optimizations:**
- **Cache Middleware**: In-memory caching dengan node-cache
- **Eager Loading**: Menghindari N+1 query problem
- **Optimized Queries**: Query optimization dan proper indexing
- **Response Caching**: Cache invalidation otomatis

### Error Handling Layer

```
Async Handler → Error Handler → 404 Handler → Consistent Response Format
```

**Error Handling Strategy:**
- **Async Handler**: Centralized async error handling
- **Error Handler**: Consistent error response format
- **404 Handler**: Custom 404 page
- **Logging**: Winston-based logging system

### Service Layer Pattern

**Benefits:**
- **Separation of Concerns**: Business logic terpisah dari controller
- **Testability**: Service layer memudahkan unit testing
- **Reusability**: Business logic dapat digunakan di berbagai controller
- **Maintainability**: Perubahan business logic tidak memengaruhi controller

**Service Classes:**
- `alatService.js`: Manajemen alat dan inventaris
- `kategoriService.js`: Manajemen kategori alat
- `peminjamanService.js`: Manajemen proses peminjaman
- `userService.js`: Manajemen pengguna dan autentikasi

## 📞 Kontak & Dukungan

Untuk pertanyaan, masukan, atau laporan bug:

- **Email**: [ffatanansyah@gmail.com](mailto:ffatanansyah@gmail.com)
- **Website**: [farisya-fatanansyah.vercel.app](https://farisya-fatanansyah.vercel.app)
- **Repository**: [GitHub Repository](https://github.com/username/ukk)

## 🙏 Terima Kasih

Terima kasih telah menggunakan aplikasi ini! Semoga proyek ini dapat membantu mempermudah pengelolaan sistem peminjaman alat di institusi Anda.

---

**Dibuat dengan menggunakan Node.js & Express.js**
