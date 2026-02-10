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
  validateJumlahPeminjaman,
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

router.post("/logout", asyncHandler(userController.logout));

// Rute peminjam (harus login dan role peminjam)
const peminjamRouter = express.Router();
peminjamRouter.use(isAuthenticated, requirePeminjam);

peminjamRouter.get(
  "/dasbor",
  asyncHandler((req, res) => {
    res.redirect("/alat"); // Redirect ke daftar alat
  }),
);

peminjamRouter.get(
  "/alat",
  standardCache.alat,
  asyncHandler(alatController.index),
);

peminjamRouter.get(
  "/peminjaman",
  standardCache.peminjaman,
  asyncHandler(peminjamanController.userIndex),
);

peminjamRouter.get(
  "/peminjaman/ajukan/:id",
  asyncHandler(peminjamanController.showCreate),
);
peminjamRouter.post(
  "/peminjaman/ajukan",
  validateRequired(["alat_id", "tanggal_pinjam", "tanggal_kembali", "jumlah"]),
  validateTanggalPeminjaman(),
  validateJumlahPeminjaman(),
  invalidateCache(["peminjaman", "alat", "home"]),
  asyncHandler(peminjamanController.create),
);

peminjamRouter.post(
  "/peminjaman/batal/:id",
  invalidateCache(["peminjaman", "alat", "home"]),
  asyncHandler(peminjamanController.cancel),
);

router.use("/", peminjamRouter);

// Rute petugas (harus login dan role petugas)
const petugasRouter = express.Router();
petugasRouter.use(isAuthenticated, requirePetugas);

petugasRouter.get("/petugas", asyncHandler(peminjamanController.petugasIndex));

petugasRouter.post(
  "/petugas/setujui/:id",
  invalidateCache(["peminjaman", "alat", "home"]), // Invalidasi cache peminjaman, alat dan home
  asyncHandler(peminjamanController.approve),
);
petugasRouter.post(
  "/petugas/tolak/:id",
  invalidateCache(["peminjaman", "home"]), // Invalidasi cache peminjaman dan home
  asyncHandler(peminjamanController.reject),
);
petugasRouter.post(
  "/petugas/kembali/:id",
  invalidateCache(["peminjaman", "alat", "home"]), // Invalidasi cache peminjaman, alat dan home
  asyncHandler(peminjamanController.returnItem),
);

router.use("/", petugasRouter);

// Rute admin (harus login dan role admin)
const adminRouter = express.Router();
adminRouter.use(isAuthenticated, requireAdmin);

adminRouter.get(
  "/",
  standardCache.peminjaman,
  asyncHandler(adminController.dashboard),
);

// Kelola kategori
adminRouter.get(
  "/kategori",
  standardCache.kategori,
  asyncHandler(kategoriController.index),
);
adminRouter.get(
  "/kategori/tambah",
  asyncHandler(kategoriController.showCreate),
);
adminRouter.post(
  "/kategori/tambah",
  validateKategori,
  invalidateCache(["kategori", "home"]), // Invalidasi cache kategori dan home
  asyncHandler(kategoriController.create),
);
adminRouter.get(
  "/kategori/edit/:id",
  asyncHandler(kategoriController.showEdit),
);
adminRouter.post(
  "/kategori/edit/:id",
  validateKategori,
  invalidateCache(["kategori", "home"]), // Invalidasi cache kategori dan home
  asyncHandler(kategoriController.update),
);
adminRouter.post(
  "/kategori/hapus/:id",
  invalidateCache(["kategori", "home"]), // Invalidasi cache kategori dan home
  asyncHandler(kategoriController.destroy),
);

// Kelola alat
adminRouter.get(
  "/alat",
  paginate(10, 100),
  standardCache.alat,
  asyncHandler(alatController.adminIndex),
);
adminRouter.get("/alat/tambah", asyncHandler(alatController.showCreate));
adminRouter.post(
  "/alat/tambah",
  validateAlatCreate,
  invalidateCache(["alat", "kategori", "home"]), // Invalidasi cache alat, kategori dan home
  asyncHandler(alatController.create),
);
adminRouter.get("/alat/edit/:id", asyncHandler(alatController.showEdit));
adminRouter.post(
  "/alat/edit/:id",
  validateAlatUpdate,
  invalidateCache(["alat", "kategori", "home"]), // Invalidasi cache alat, kategori dan home
  asyncHandler(alatController.update),
);
adminRouter.post(
  "/alat/hapus/:id",
  invalidateCache(["alat", "kategori", "home"]), // Invalidasi cache alat, kategori dan home
  asyncHandler(alatController.destroy),
);

// Kelola peminjaman
adminRouter.get(
  "/peminjaman",
  paginate(10, 100),
  standardCache.peminjaman,
  asyncHandler(peminjamanController.adminIndex),
);

// Kelola user
adminRouter.get(
  "/user",
  paginate(10, 100),
  asyncHandler(adminController.userIndex),
);
adminRouter.get("/user/tambah", asyncHandler(adminController.showCreateUser));
adminRouter.post(
  "/user/tambah",
  validateUserCreation,
  invalidateCache(["user"]), // Invalidasi cache user
  asyncHandler(adminController.createUser),
);
adminRouter.post(
  "/user/hapus/:id",
  invalidateCache(["user"]), // Invalidasi cache user
  asyncHandler(adminController.destroyUser),
);

// Catatan aktivitas
adminRouter.get(
  "/catatan",
  standardCache.log,
  asyncHandler(adminController.logIndex),
);

router.use("/admin", adminRouter);

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
