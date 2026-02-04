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
  validateTanggalPeminjaman,
  validateRequired,
} = require("../middleware/validation");

// Import async handler
const { asyncHandler } = require("../middleware/asyncHandler");

// Import caching middleware
const { invalidateCache } = require("../middleware/caching");

// Import route helper middleware
const {
  validateUserRegistration,
  validateUserCreation,
  validateKategori,
  validateAlatCreate,
  validateAlatUpdate,
  standardCache,
  paginate,
} = require("../middleware/routeHelpers");

// Rute public (tidak perlu login)
router.get("/", standardCache.home, asyncHandler(homeController.index)); // Halaman home public
router.get("/home", standardCache.home, asyncHandler(homeController.index)); // Route alternatif

router.get("/login", asyncHandler(userController.showLogin));
router.post("/login", loginLimiter, asyncHandler(userController.login));

router.get("/register", asyncHandler(userController.showRegister));
router.post(
  "/register",
  validateUserRegistration,
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
  standardCache.alat,
  asyncHandler(alatController.index),
);

router.get(
  "/peminjaman",
  isAuthenticated,
  requirePeminjam,
  standardCache.peminjaman,
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
  standardCache.peminjaman,
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
  standardCache.peminjaman,
  asyncHandler(adminController.dashboard),
);

// Kelola kategori
router.get(
  "/admin/kategori",
  isAuthenticated,
  requireAdmin,
  standardCache.kategori,
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
  validateKategori,
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
  validateKategori,
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
  paginate(10, 100),
  standardCache.alat,
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
  validateAlatCreate,
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
  validateAlatUpdate,
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
  paginate(10, 100),
  standardCache.peminjaman,
  asyncHandler(peminjamanController.adminIndex),
);

// Kelola user
router.get(
  "/admin/user",
  isAuthenticated,
  requireAdmin,
  paginate(10, 100),
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
  validateUserCreation,
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
  "/admin/catatan",
  isAuthenticated,
  requireAdmin,
  standardCache.log,
  asyncHandler(adminController.logIndex),
);

// Laporan sistem (petugas dan admin)
const reportRoutes = [
  { path: "", handler: "index" },
  { path: "/user", handler: "generateUserReport" },
  { path: "/alat", handler: "generateInventoryReport" },
  { path: "/peminjaman", handler: "generatePeminjamanReport" },
  { path: "/aktivitas", handler: "generateActivityReport" },
  { path: "/statistik", handler: "generateStatistics" },
];

const registerReportRoutes = ({ basePath, auth, indexHandler }) => {
  reportRoutes.forEach(({ path, handler }) => {
    const resolvedHandler =
      handler === "index" ? indexHandler : adminController[handler];
    router.get(
      `${basePath}${path}`,
      isAuthenticated,
      auth,
      standardCache.log,
      asyncHandler(resolvedHandler),
    );
  });
};

registerReportRoutes({
  basePath: "/laporan",
  auth: requirePetugas,
  indexHandler: adminController.petugasReportIndex,
});

registerReportRoutes({
  basePath: "/admin/laporan",
  auth: requireAdmin,
  indexHandler: adminController.reportIndex,
});

module.exports = router;
