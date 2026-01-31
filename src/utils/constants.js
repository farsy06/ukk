/**
 * Application Constants
 * Konstanta-konstanta yang digunakan di seluruh aplikasi
 */

// Database Status Constants
const STATUS_ALAT = {
  TERSEDIA: "tersedia",
  DIPINJAM: "dipinjam",
  MAINTENANCE: "maintenance",
};

const STATUS_PEMINJAMAN = {
  PENDING: "pending",
  DISETUJUI: "disetujui",
  DIPINJAM: "dipinjam",
  DIKEMBALIKAN: "dikembalikan",
  DITOLAK: "ditolak",
};

const KONDISI_ALAT = {
  BAIK: "baik",
  RUSAK_RINGAN: "rusak_ringan",
  RUSAK_BERAT: "rusak_berat",
};

// User Roles
const ROLES = {
  ADMIN: "admin",
  PETUGAS: "petugas",
  PEMINJAM: "peminjam",
};

// Cache Keys
const CACHE_KEYS = {
  HOME_ALAT: "home_alat_terbaru",
  ALAT_USER: "alat_user_index",
  ALAT_ADMIN: "alat_admin_index",
  KATEGORI: "kategori_index",
  ADMIN_USER: "admin_user_index",
  ADMIN_DASHBOARD: "admin_dashboard_stats",
  ADMIN_LOG: "admin_log_index",
  PEMINJAMAN_USER: "peminjaman_user",
  PEMINJAMAN_ADMIN: "peminjaman_admin",
  PETUGAS_DASHBOARD: "petugas_dashboard",
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  HOME: 600, // 10 menit
  ALAT: 300, // 5 menit
  KATEGORI: 600, // 10 menit
  USER: 600, // 10 menit
  DASHBOARD: 300, // 5 menit
  LOG: 300, // 5 menit
  PEMINJAMAN: 180, // 3 menit
  PETUGAS: 120, // 2 menit
};

// Validation Constants
const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  DATE_FORMAT: "YYYY-MM-DD",
  MAX_ALAT_PER_PINJAM: 5,
};

// Error Messages
const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED: "Semua field harus diisi",
    PASSWORD_MISMATCH: "Password dan konfirmasi password tidak sesuai",
    USERNAME_TAKEN: "Username sudah digunakan",
    EMAIL_TAKEN: "Email sudah digunakan",
    INVALID_EMAIL: "Format email tidak valid",
    WEAK_PASSWORD:
      "Password harus mengandung huruf besar, huruf kecil, angka, dan karakter spesial",
    INVALID_ROLE: "Role tidak valid",
    INVALID_ALAT_STATUS: "Status alat tidak valid",
    INVALID_ALAT_KONDISI: "Kondisi alat tidak valid",
    INVALID_PEMINJAMAN_STATUS: "Status peminjaman tidak valid",
    INVALID_DATE: "Format tanggal tidak valid",
    INVALID_DATE_RANGE: "Tanggal kembali harus setelah tanggal pinjam",
  },
  AUTHENTICATION: {
    INVALID_CREDENTIALS: "Username atau password salah",
    NOT_AUTHENTICATED: "User belum terautentikasi",
    SESSION_EXPIRED: "Sesi telah berakhir, silakan login kembali",
  },
  AUTHORIZATION: {
    ACCESS_DENIED: "Akses ditolak! Role tidak memiliki izin",
    CANNOT_DELETE_ADMIN: "Tidak dapat menghapus admin lain",
  },
  DATABASE: {
    OPERATION_ERROR: "Terjadi kesalahan pada database",
    RECORD_NOT_FOUND: "Data tidak ditemukan",
  },
  BUSINESS: {
    ALAT_NOT_AVAILABLE: "Alat tidak tersedia untuk dipinjam",
    ALAT_ALREADY_BOOKED: "Alat sudah dipinjam pada tanggal tersebut",
    INVALID_DATE_RANGE: "Tanggal pinjam tidak boleh sebelum hari ini",
  },
};

// Success Messages
const SUCCESS_MESSAGES = {
  REGISTRATION: "Registrasi berhasil! Silakan login.",
  LOGIN: "Login berhasil!",
  LOGOUT: "Logout berhasil!",
  USER_CREATED: "User berhasil ditambahkan!",
  USER_DELETED: "User berhasil dihapus!",
  ALAT_CREATED: "Alat berhasil ditambahkan!",
  ALAT_UPDATED: "Alat berhasil diperbarui!",
  ALAT_DELETED: "Alat berhasil dihapus!",
  KATEGORI_CREATED: "Kategori berhasil ditambahkan!",
  KATEGORI_UPDATED: "Kategori berhasil diperbarui!",
  KATEGORI_DELETED: "Kategori berhasil dihapus!",
  PEMINJAMAN_CREATED: "Peminjaman berhasil diajukan!",
  PEMINJAMAN_APPROVED: "Peminjaman berhasil disetujui!",
  PEMINJAMAN_REJECTED: "Peminjaman berhasil ditolak!",
  PEMINJAMAN_RETURNED: "Pengembalian alat berhasil dikonfirmasi!",
};

// App Configuration
const APP_CONFIG = {
  NAME: "Sistem Peminjaman Alat Laboratorium",
  VERSION: "1.0.0",
  AUTHOR: "Farisya Fatanansyah",
  DESCRIPTION:
    "Aplikasi web untuk mengelola sistem peminjaman alat laboratorium",
};

module.exports = {
  STATUS_ALAT,
  STATUS_PEMINJAMAN,
  KONDISI_ALAT,
  ROLES,
  CACHE_KEYS,
  CACHE_TTL,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  APP_CONFIG,
};
