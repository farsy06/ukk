const express = require("express");
const router = express.Router();

// Import controllers
const userController = require("../controllers/userController");
const homeController = require("../controllers/homeController");
const kategoriController = require("../controllers/kategoriController");
const alatController = require("../controllers/alatController");
const peminjamanController = require("../controllers/transaksiController");
const adminController = require("../controllers/adminController");

// Import middleware
const {
  isAuthenticated,
  requireAdmin,
  requirePetugas,
  requirePeminjam,
} = require("../middleware/auth");

// Import security middleware
const { loginLimiter } = require("../middleware/security");

// Import validation middleware
const {
  validateRequired,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRole,
  validateAlatStatus,
  validateAlatKondisi,
  validateTanggalPeminjaman,
} = require("../middleware/validation");

// Import async handler
const { asyncHandler } = require("../middleware/asyncHandler");

// Import caching middleware
const { cacheMiddleware, invalidateCache } = require("../middleware/caching");

// Rute public (tidak perlu login)
router.get(
  "/",
  cacheMiddleware("home", 600), // Cache 10 menit
  asyncHandler(homeController.index),
); // Halaman home public
router.get(
  "/home",
  cacheMiddleware("home", 600), // Cache 10 menit
  asyncHandler(homeController.index),
); // Route alternatif

router.get("/login", asyncHandler(userController.showLogin));
router.post("/login", loginLimiter, asyncHandler(userController.login));

router.get("/register", asyncHandler(userController.showRegister));
router.post(
  "/register",
  validateRequired([
    "nama",
    "username",
    "email",
    "password",
    "confirmPassword",
  ]),
  validateEmail("email"),
  validatePassword("password"),
  validatePasswordMatch("password", "confirmPassword"),
  asyncHandler(userController.register),
);

router.get("/logout", asyncHandler(userController.logout));

// Rute peminjam (harus login dan role peminjam)
router.get(
  "/dasbor",
  isAuthenticated,
  requirePeminjam,
  asyncHandler((req, res) => {
    res.redirect("/alat"); // Redirect ke daftar alat
  }),
);

router.get(
  "/alat",
  isAuthenticated,
  requirePeminjam,
  cacheMiddleware("alat_user", 300), // Cache 5 menit
  asyncHandler(alatController.index),
);

router.get(
  "/peminjaman",
  isAuthenticated,
  requirePeminjam,
  cacheMiddleware("peminjaman_user", 180), // Cache 3 menit
  asyncHandler(peminjamanController.userIndex),
);

router.get(
  "/peminjaman/ajukan/:id",
  isAuthenticated,
  requirePeminjam,
  asyncHandler(peminjamanController.showCreate),
);
router.post(
  "/peminjaman/ajukan",
  isAuthenticated,
  requirePeminjam,
  validateRequired(["alat_id", "tanggal_pinjam", "tanggal_kembali"]),
  validateTanggalPeminjaman(),
  asyncHandler(peminjamanController.create),
);

// Rute petugas (harus login dan role petugas)
router.get(
  "/petugas",
  isAuthenticated,
  requirePetugas,
  cacheMiddleware("petugas_dashboard", 120), // Cache 2 menit
  asyncHandler(peminjamanController.petugasIndex),
);

router.get(
  "/petugas/setujui/:id",
  isAuthenticated,
  requirePetugas,
  invalidateCache(["peminjaman", "alat"]), // Invalidasi cache peminjaman dan alat
  asyncHandler(peminjamanController.approve),
);
router.get(
  "/petugas/tolak/:id",
  isAuthenticated,
  requirePetugas,
  invalidateCache(["peminjaman"]), // Invalidasi cache peminjaman
  asyncHandler(peminjamanController.reject),
);
router.get(
  "/petugas/kembali/:id",
  isAuthenticated,
  requirePetugas,
  invalidateCache(["peminjaman", "alat"]), // Invalidasi cache peminjaman dan alat
  asyncHandler(peminjamanController.returnItem),
);

// Rute admin (harus login dan role admin)
router.get(
  "/admin",
  isAuthenticated,
  requireAdmin,
  cacheMiddleware("admin_dashboard", 300), // Cache 5 menit
  asyncHandler(adminController.dashboard),
);

// Kelola kategori
router.get(
  "/admin/kategori",
  isAuthenticated,
  requireAdmin,
  cacheMiddleware("kategori", 600), // Cache 10 menit
  asyncHandler(kategoriController.index),
);
router.get(
  "/admin/kategori/tambah",
  isAuthenticated,
  requireAdmin,
  asyncHandler(kategoriController.showCreate),
);
router.post(
  "/admin/kategori/tambah",
  isAuthenticated,
  requireAdmin,
  validateRequired(["nama_kategori"]),
  invalidateCache(["kategori"]), // Invalidasi cache kategori
  asyncHandler(kategoriController.create),
);
router.get(
  "/admin/kategori/edit/:id",
  isAuthenticated,
  requireAdmin,
  asyncHandler(kategoriController.showEdit),
);
router.post(
  "/admin/kategori/edit/:id",
  isAuthenticated,
  requireAdmin,
  validateRequired(["nama_kategori"]),
  invalidateCache(["kategori"]), // Invalidasi cache kategori
  asyncHandler(kategoriController.update),
);
router.get(
  "/admin/kategori/hapus/:id",
  isAuthenticated,
  requireAdmin,
  invalidateCache(["kategori"]), // Invalidasi cache kategori
  asyncHandler(kategoriController.destroy),
);

// Kelola alat
router.get(
  "/admin/alat",
  isAuthenticated,
  requireAdmin,
  cacheMiddleware("alat_admin", 300), // Cache 5 menit
  asyncHandler(alatController.adminIndex),
);
router.get(
  "/admin/alat/tambah",
  isAuthenticated,
  requireAdmin,
  asyncHandler(alatController.showCreate),
);
router.post(
  "/admin/alat/tambah",
  isAuthenticated,
  requireAdmin,
  validateRequired(["nama_alat", "kategori_id", "kondisi"]),
  validateAlatKondisi(),
  invalidateCache(["alat", "kategori"]), // Invalidasi cache alat dan kategori
  asyncHandler(alatController.create),
);
router.get(
  "/admin/alat/edit/:id",
  isAuthenticated,
  requireAdmin,
  asyncHandler(alatController.showEdit),
);
router.post(
  "/admin/alat/edit/:id",
  isAuthenticated,
  requireAdmin,
  validateRequired(["nama_alat", "kategori_id", "kondisi", "status"]),
  validateAlatStatus(),
  validateAlatKondisi(),
  invalidateCache(["alat", "kategori"]), // Invalidasi cache alat dan kategori
  asyncHandler(alatController.update),
);
router.get(
  "/admin/alat/hapus/:id",
  isAuthenticated,
  requireAdmin,
  invalidateCache(["alat", "kategori"]), // Invalidasi cache alat dan kategori
  asyncHandler(alatController.destroy),
);

// Kelola peminjaman
router.get(
  "/admin/peminjaman",
  isAuthenticated,
  requireAdmin,
  cacheMiddleware("peminjaman_admin", 180), // Cache 3 menit
  asyncHandler(peminjamanController.adminIndex),
);

// Kelola user
router.get(
  "/admin/user",
  isAuthenticated,
  requireAdmin,
  cacheMiddleware("user", 600), // Cache 10 menit
  asyncHandler(adminController.userIndex),
);
router.get(
  "/admin/user/tambah",
  isAuthenticated,
  requireAdmin,
  asyncHandler(adminController.showCreateUser),
);
router.post(
  "/admin/user/tambah",
  isAuthenticated,
  requireAdmin,
  validateRequired([
    "nama",
    "username",
    "email",
    "password",
    "confirmPassword",
    "role",
  ]),
  validateEmail("email"),
  validatePassword("password"),
  validatePasswordMatch("password", "confirmPassword"),
  validateRole(["petugas", "peminjam"]),
  invalidateCache(["user"]), // Invalidasi cache user
  asyncHandler(adminController.createUser),
);
router.get(
  "/admin/user/hapus/:id",
  isAuthenticated,
  requireAdmin,
  invalidateCache(["user"]), // Invalidasi cache user
  asyncHandler(adminController.destroyUser),
);

// Catatan aktivitas
router.get(
  "/admin/catak",
  isAuthenticated,
  requireAdmin,
  cacheMiddleware("log", 300), // Cache 5 menit
  asyncHandler(adminController.logIndex),
);

module.exports = router;
