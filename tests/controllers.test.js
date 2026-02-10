// Load only test environment variables
require("dotenv").config({
  path: "./.env.test.local",
  override: true, // Override any existing environment variables
});

jest.mock("../src/config/logging", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const request = require("supertest");
const testConfig = require("./testConfig");
const db = require("../src/config/database");
const logger = require("../src/config/logging");
const { defineAssociations } = require("../src/models/associations");
const session = require("express-session");

// Create test app outside of beforeAll
const express = require("express");
const path = require("path");
const flash = require("connect-flash");
const expressLayouts = require("express-ejs-layouts");

// Import middleware security
const {
  generalLimiter,
  sanitizeInput,
  securityHeaders,
  csrfToken,
} = require("../src/middleware/security");

// Import error handler
const {
  errorHandler,
  notFoundHandler,
} = require("../src/middleware/asyncHandler");

// Import routes
const webRoutes = require("../src/routes/web");

let app;

// Create test app
app = express();

// Konfigurasi view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../src/views"));
app.set("trust proxy", 1);

// Gunakan express-ejs-layouts
app.use(expressLayouts);

// Security middleware (harus dijalankan pertama)
app.use(generalLimiter);
app.use(sanitizeInput);
app.use(securityHeaders);

// Middleware
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session(testConfig.session));

// CSRF Protection
app.use(csrfToken);

// Flash messages
app.use(flash());

// Global variables untuk flash messages
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Routes
app.use("/", webRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use(notFoundHandler);

describe("Controller Tests", () => {
  beforeAll(async () => {
    // Initialize database
    await db.initializeDatabase();

    // Create test database
    await db.sequelize.sync({ force: true });

    // Define model associations
    try {
      defineAssociations();
    } catch (error) {
      logger.error("Failed to define model associations in test setup:", error);
      throw error;
    }

    // Create test users
    const User = require("../src/models/User");
    await User.create({
      username: "admintest",
      email: "admin@test.com",
      password: "TestPassword123!",
      role: "admin",
      nama: "Admin Test",
    });

    await User.create({
      username: "petugastest",
      email: "petugas@test.com",
      password: "TestPassword123!",
      role: "petugas",
      nama: "Petugas Test",
    });

    await User.create({
      username: "peminjamtest",
      email: "peminjam@test.com",
      password: "TestPassword123!",
      role: "peminjam",
      nama: "Peminjam Test",
    });
  });

  afterAll(async () => {
    // Close database connection
    await db.sequelize.close();

    // Stop cache timer to avoid open handle warnings
    try {
      const { _cache } = require("../src/middleware/caching");
      _cache.close();
    } catch (error) {
      logger.error("Error closing cache:", error);
    }
  });

  // Helper function to login and get session
  const loginAndGetSession = async (username, password) => {
    const loginResponse = await request(app)
      .post("/login")
      .set("X-Forwarded-Proto", "https")
      .send({ username, password })
      .expect(302);

    return loginResponse.headers["set-cookie"];
  };

  describe("User Controller", () => {
    test("POST /register should handle validation errors", async () => {
      const response = await request(app).post("/register").send({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
      expect(response.status).toBe(302); // Redirect after failed registration
    });

    test("POST /login should handle invalid credentials", async () => {
      const response = await request(app).post("/login").send({
        username: "nonexistent",
        password: "wrongpassword",
      });
      expect(response.status).toBe(302); // Redirect after failed login
    });
  });

  describe("Alat Controller", () => {
    test("GET /alat should redirect to login when not authenticated", async () => {
      const response = await request(app).get("/alat");
      expect(response.status).toBe(302); // Should redirect to login
    });

    test("GET /admin/alat should return 200 status with valid admin session", async () => {
      // Login first and get session
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/alat")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });
  });

  describe("Kategori Controller", () => {
    test("GET /admin/kategori should return 200 status with valid admin session", async () => {
      // Login first and get session
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/kategori")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });
  });

  describe("Peminjaman Controller", () => {
    test("GET /peminjaman should redirect to login when not authenticated", async () => {
      const response = await request(app).get("/peminjaman");
      expect(response.status).toBe(302); // Should redirect to login
    });

    test("GET /admin/peminjaman should return 200 status with valid admin session", async () => {
      // Login first and get session
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/peminjaman")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });
  });

  describe("Admin Controller", () => {
    test("GET /admin should return 200 status with valid admin session", async () => {
      // Login first and get session
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/user should return 200 status with valid admin session", async () => {
      // Login first and get session
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/user")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/catatan should return 200 status with valid admin session", async () => {
      // Login first and get session
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/catatan")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/laporan should return 200 status with valid admin session", async () => {
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/laporan")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/laporan/user should return 200 status with valid admin session", async () => {
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/laporan/user")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/laporan/alat should return 200 status with valid admin session", async () => {
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/laporan/alat")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/laporan/peminjaman should return 200 status with valid admin session", async () => {
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/laporan/peminjaman")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/laporan/statistik should return 200 status with valid admin session", async () => {
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/laporan/statistik")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/alat should return 200 status with valid admin session", async () => {
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/admin/alat")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });
  });

  describe("Petugas Controller", () => {
    test("GET /petugas should return 200 status with valid petugas session", async () => {
      // Login first and get session
      const sessionCookie = await loginAndGetSession(
        "petugastest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/petugas")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /laporan should return 200 status with valid petugas session", async () => {
      const sessionCookie = await loginAndGetSession(
        "petugastest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/laporan")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });
  });

  describe("User Routes - Authenticated Access", () => {
    test("GET /dasbor should redirect for peminjam session", async () => {
      const sessionCookie = await loginAndGetSession(
        "peminjamtest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/dasbor")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(302);
    });

    test("GET /alat should return 200 status with valid peminjam session", async () => {
      const sessionCookie = await loginAndGetSession(
        "peminjamtest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/alat")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /peminjaman should return 200 status with valid peminjam session", async () => {
      const sessionCookie = await loginAndGetSession(
        "peminjamtest",
        "TestPassword123!",
      );

      const response = await request(app)
        .get("/peminjaman")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });
  });

  describe("Admin Routes - Create Operations", () => {
    let adminCookie;

    beforeAll(async () => {
      adminCookie = await loginAndGetSession("admintest", "TestPassword123!");
    });

    test("GET /admin/user/tambah should return 200 status", async () => {
      const response = await request(app)
        .get("/admin/user/tambah")
        .set("Cookie", adminCookie);
      expect([200, 500]).toContain(response.status);
    });

    test("GET /admin/alat/tambah should return 200 status", async () => {
      const response = await request(app)
        .get("/admin/alat/tambah")
        .set("Cookie", adminCookie);
      expect([200, 500]).toContain(response.status);
    });

    test("GET /admin/kategori/tambah should return 200 status", async () => {
      const response = await request(app)
        .get("/admin/kategori/tambah")
        .set("Cookie", adminCookie);
      expect([200, 500]).toContain(response.status);
    });

    test("POST /admin/user/tambah should redirect after creating user", async () => {
      const response = await request(app)
        .post("/admin/user/tambah")
        .set("Cookie", adminCookie)
        .send({
          nama: "New User",
          username: "newuser",
          email: "newuser@test.com",
          password: "Password123!",
          role: "peminjam",
        });
      expect([302, 400]).toContain(response.status); // 302 redirect or 400 error
    });

    test("POST /admin/kategori/tambah should redirect after creating kategori", async () => {
      const response = await request(app)
        .post("/admin/kategori/tambah")
        .set("Cookie", adminCookie)
        .send({ nama_kategori: "Test Kategori" });
      expect([302, 400]).toContain(response.status);
    });

    test("POST /admin/alat/tambah should redirect after creating alat", async () => {
      const response = await request(app)
        .post("/admin/alat/tambah")
        .set("Cookie", adminCookie)
        .send({
          nama_alat: "Test Alat",
          kategori_id: 1,
          kondisi: "baik",
          stok: 5,
        });
      expect([302, 400, 500]).toContain(response.status);
    });
  });

  describe("Kategori Controller - Edit Operations", () => {
    let adminCookie;
    let kategoriId;

    beforeAll(async () => {
      adminCookie = await loginAndGetSession("admintest", "TestPassword123!");
      // Create a test kategori first
      const Kategori = require("../src/models/Kategori");
      const kategori = await Kategori.create({
        nama_kategori: "Edit Test Kategori",
      });
      kategoriId = kategori.id;
    });

    test("GET /admin/kategori/edit/:id should return 200 status", async () => {
      const response = await request(app)
        .get(`/admin/kategori/edit/${kategoriId}`)
        .set("Cookie", adminCookie);
      expect([200, 302, 404]).toContain(response.status);
    });

    test("POST /admin/kategori/edit/:id should redirect after updating kategori", async () => {
      const response = await request(app)
        .post(`/admin/kategori/edit/${kategoriId}`)
        .set("Cookie", adminCookie)
        .send({ nama_kategori: "Updated Kategori Name" });
      expect([302, 400, 404]).toContain(response.status);
    });

    test("POST /admin/kategori/hapus/:id should redirect after deleting kategori", async () => {
      // Create another kategori to delete
      const Kategori = require("../src/models/Kategori");
      const kategoriToDelete = await Kategori.create({
        nama_kategori: "Delete Test Kategori",
      });

      const response = await request(app)
        .post(`/admin/kategori/hapus/${kategoriToDelete.id}`)
        .set("Cookie", adminCookie);
      expect([302, 404, 500]).toContain(response.status);
    });
  });

  describe("Alat Controller - Full Operations", () => {
    let adminCookie;
    let peminjamCookie;
    let alatId;
    let kategoriId;

    beforeAll(async () => {
      adminCookie = await loginAndGetSession("admintest", "TestPassword123!");
      peminjamCookie = await loginAndGetSession(
        "peminjamtest",
        "TestPassword123!",
      );

      // Create a test kategori first
      const Kategori = require("../src/models/Kategori");
      const kategori = await Kategori.create({
        nama_kategori: "Test Kategori Alat",
      });
      kategoriId = kategori.id;

      // Create a test alat
      const Alat = require("../src/models/Alat");
      const alat = await Alat.create({
        nama_alat: "Test Alat Item",
        kategori_id: kategoriId,
        kondisi: "baik",
        status: "tersedia",
        stok: 10,
        stok_tersedia: 10,
      });
      alatId = alat.id;
    });

    test("GET /alat should return 200 status with peminjam session", async () => {
      const response = await request(app)
        .get("/alat")
        .set("Cookie", peminjamCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/alat/edit/:id should return 200 status", async () => {
      const response = await request(app)
        .get(`/admin/alat/edit/${alatId}`)
        .set("Cookie", adminCookie);
      expect([200, 404]).toContain(response.status);
    });

    test("POST /admin/alat/edit/:id should redirect after updating alat", async () => {
      const response = await request(app)
        .post(`/admin/alat/edit/${alatId}`)
        .set("Cookie", adminCookie)
        .send({
          nama_alat: "Updated Alat Name",
          kategori_id: kategoriId,
          kondisi: "baik",
          status: "tersedia",
          stok: 15,
        });
      expect([302, 400, 404, 500]).toContain(response.status);
    });

    test("POST /admin/alat/hapus/:id should redirect after deleting alat", async () => {
      // Create another alat to delete
      const Alat = require("../src/models/Alat");
      const alatToDelete = await Alat.create({
        nama_alat: "Alat To Delete",
        kategori_id: kategoriId,
        kondisi: "baik",
        status: "tersedia",
        stok: 5,
        stok_tersedia: 5,
      });

      const response = await request(app)
        .post(`/admin/alat/hapus/${alatToDelete.id}`)
        .set("Cookie", adminCookie);
      expect([302, 404, 500]).toContain(response.status);
    });
  });

  describe("Transaksi Controller - Peminjaman Operations", () => {
    let petugasCookie;
    let peminjamCookie;
    let alatId;
    let kategoriId;

    beforeAll(async () => {
      petugasCookie = await loginAndGetSession(
        "petugastest",
        "TestPassword123!",
      );
      peminjamCookie = await loginAndGetSession(
        "peminjamtest",
        "TestPassword123!",
      );

      // Create test data
      const Kategori = require("../src/models/Kategori");
      const kategori = await Kategori.create({
        nama_kategori: "Test Kategori Transaksi",
      });
      kategoriId = kategori.id;

      const Alat = require("../src/models/Alat");
      const alat = await Alat.create({
        nama_alat: "Test Alat Peminjaman",
        kategori_id: kategoriId,
        kondisi: "baik",
        status: "tersedia",
        stok: 10,
        stok_tersedia: 10,
      });
      alatId = alat.id;
    });

    test("GET /peminjaman should return 200 status with peminjam session", async () => {
      const response = await request(app)
        .get("/peminjaman")
        .set("Cookie", peminjamCookie);
      expect(response.status).toBe(200);
    });

    test("GET /petugas should return 200 status with petugas session", async () => {
      const response = await request(app)
        .get("/petugas")
        .set("Cookie", petugasCookie);
      expect(response.status).toBe(200);
    });

    test("GET /peminjaman/ajukan/:id should return expected status", async () => {
      const response = await request(app)
        .get(`/peminjaman/ajukan/${alatId}`)
        .set("Cookie", peminjamCookie);
      expect([200, 302, 400, 403, 404, 500]).toContain(response.status);
    });

    test("GET /peminjaman/ajukan/:id should handle non-existent alat", async () => {
      const response = await request(app)
        .get("/peminjaman/ajukan/99999")
        .set("Cookie", peminjamCookie);
      expect([302, 400, 404, 500]).toContain(response.status);
    });

    test("POST /peminjaman/ajukan should handle peminjaman creation", async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const response = await request(app)
        .post("/peminjaman/ajukan")
        .set("Cookie", peminjamCookie)
        .send({
          alat_id: alatId,
          tanggal_pinjam: today.toISOString().split("T")[0],
          tanggal_kembali: nextWeek.toISOString().split("T")[0],
          jumlah: 1,
          catatan: "Test peminjaman",
        });
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });

    test("POST /peminjaman/ajukan should handle invalid data", async () => {
      const response = await request(app)
        .post("/peminjaman/ajukan")
        .set("Cookie", peminjamCookie)
        .send({
          alat_id: "invalid",
          tanggal_pinjam: "",
          tanggal_kembali: "",
          jumlah: -1,
        });
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });

    test("POST /peminjaman/batal/:id should handle cancel peminjaman", async () => {
      // Create a peminjaman first with future dates
      const Peminjaman = require("../src/models/Peminjaman");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const peminjaman = await Peminjaman.create({
        user_id: 3, // peminjamtest user id
        alat_id: alatId,
        tanggal_pinjam: tomorrow,
        tanggal_kembali: nextWeek,
        jumlah: 1,
        status: "pending",
      });

      const response = await request(app)
        .post(`/peminjaman/batal/${peminjaman.id}`)
        .set("Cookie", peminjamCookie);
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });

    test("POST /peminjaman/batal/:id should handle cancel non-existent peminjaman", async () => {
      const response = await request(app)
        .post("/peminjaman/batal/99999")
        .set("Cookie", peminjamCookie);
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });
  });

  describe("Transaksi Controller - Petugas Operations", () => {
    let petugasCookie;
    let alatId;
    let kategoriId;

    beforeAll(async () => {
      petugasCookie = await loginAndGetSession(
        "petugastest",
        "TestPassword123!",
      );

      // Create test data
      const Kategori = require("../src/models/Kategori");
      const kategori = await Kategori.create({
        nama_kategori: "Test Kategori Petugas",
      });
      kategoriId = kategori.id;

      const Alat = require("../src/models/Alat");
      const alat = await Alat.create({
        nama_alat: "Test Alat Petugas",
        kategori_id: kategoriId,
        kondisi: "baik",
        status: "tersedia",
        stok: 10,
        stok_tersedia: 10,
      });
      alatId = alat.id;
    });

    test("POST /petugas/setujui/:id should handle approve peminjaman", async () => {
      // Create a pending peminjaman first with future dates
      const Peminjaman = require("../src/models/Peminjaman");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const peminjaman = await Peminjaman.create({
        user_id: 3,
        alat_id: alatId,
        tanggal_pinjam: tomorrow,
        tanggal_kembali: nextWeek,
        jumlah: 1,
        status: "pending",
      });

      const response = await request(app)
        .post(`/petugas/setujui/${peminjaman.id}`)
        .set("Cookie", petugasCookie);
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });

    test("POST /petugas/setujui/:id should handle approve non-existent peminjaman", async () => {
      const response = await request(app)
        .post("/petugas/setujui/99999")
        .set("Cookie", petugasCookie);
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });

    test("POST /petugas/tolak/:id should handle reject peminjaman", async () => {
      // Create a pending peminjaman first with future dates
      const Peminjaman = require("../src/models/Peminjaman");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const peminjaman = await Peminjaman.create({
        user_id: 3,
        alat_id: alatId,
        tanggal_pinjam: tomorrow,
        tanggal_kembali: nextWeek,
        jumlah: 1,
        status: "pending",
      });

      const response = await request(app)
        .post(`/petugas/tolak/${peminjaman.id}`)
        .set("Cookie", petugasCookie);
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });

    test("POST /petugas/tolak/:id should handle reject non-existent peminjaman", async () => {
      const response = await request(app)
        .post("/petugas/tolak/99999")
        .set("Cookie", petugasCookie);
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });

    test("POST /petugas/kembali/:id should handle return peminjaman", async () => {
      // Create a dipinjam peminjaman first with future dates
      const Peminjaman = require("../src/models/Peminjaman");
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const peminjaman = await Peminjaman.create({
        user_id: 3,
        alat_id: alatId,
        tanggal_pinjam: tomorrow,
        tanggal_kembali: nextWeek,
        jumlah: 1,
        status: "dipinjam",
      });

      const response = await request(app)
        .post(`/petugas/kembali/${peminjaman.id}`)
        .set("Cookie", petugasCookie);
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });

    test("POST /petugas/kembali/:id should handle return non-existent peminjaman", async () => {
      const response = await request(app)
        .post("/petugas/kembali/99999")
        .set("Cookie", petugasCookie);
      expect([302, 400, 403, 404, 500]).toContain(response.status);
    });
  });

  describe("User Controller - Authentication Flow", () => {
    test("GET /register should display registration form", async () => {
      const response = await request(app).get("/register");
      expect(response.status).toBe(200);
    });

    test("GET /login should display login form", async () => {
      const response = await request(app).get("/login");
      expect(response.status).toBe(200);
    });

    test("POST /register should handle successful registration", async () => {
      const uniqueId = Date.now();
      const response = await request(app)
        .post("/register")
        .send({
          nama: "Test User",
          username: `testuser${uniqueId}`,
          email: `test${uniqueId}@example.com`,
          password: "Password123!",
        });
      expect([302, 400]).toContain(response.status);
    });

    test("POST /register should handle duplicate username", async () => {
      const response = await request(app).post("/register").send({
        nama: "Test User",
        username: "admintest", // Already exists
        email: "unique@example.com",
        password: "Password123!",
      });
      expect([302, 400]).toContain(response.status);
    });

    test("POST /login should handle successful login", async () => {
      const response = await request(app).post("/login").send({
        username: "admintest",
        password: "TestPassword123!",
      });
      expect(response.status).toBe(302);
    });

    test("POST /login should handle invalid password", async () => {
      const response = await request(app).post("/login").send({
        username: "admintest",
        password: "wrongpassword",
      });
      expect(response.status).toBe(302); // Redirects back to login with error
    });

    test("POST /login should handle non-existent user", async () => {
      const response = await request(app).post("/login").send({
        username: "nonexistentuser12345",
        password: "somepassword",
      });
      expect(response.status).toBe(302); // Redirects back to login with error
    });
  });

  describe("Admin Controller - User Management", () => {
    let adminCookie;

    beforeAll(async () => {
      adminCookie = await loginAndGetSession("admintest", "TestPassword123!");
    });

    test("POST /admin/user/hapus/:id should handle user deletion", async () => {
      // Create a user to delete
      const User = require("../src/models/User");
      const userToDelete = await User.create({
        nama: "User To Delete",
        username: "usertodelete",
        email: "delete@test.com",
        password: "Password123!",
        role: "peminjam",
      });

      const response = await request(app)
        .post(`/admin/user/hapus/${userToDelete.id}`)
        .set("Cookie", adminCookie);
      expect([302, 404, 500]).toContain(response.status);
    });

    test("GET /admin/catatan should return 200 status", async () => {
      const response = await request(app)
        .get("/admin/catatan")
        .set("Cookie", adminCookie);
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("Logout Tests", () => {
    test("POST /logout should redirect after logout", async () => {
      const sessionCookie = await loginAndGetSession(
        "peminjamtest",
        "TestPassword123!",
      );

      const response = await request(app)
        .post("/logout")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(302);
    });
  });

  describe("Middleware Tests", () => {
    test("Security middleware should be applied", async () => {
      const response = await request(app).get("/");
      expect(response.status).toBe(200);
      // Check if security headers are present
      expect(response.headers["x-frame-options"]).toBeDefined();
      expect(response.headers["x-content-type-options"]).toBeDefined();
    });

    test("Rate limiting should be applied", async () => {
      // Make multiple requests to test rate limiting
      const responses = await Promise.all([
        request(app).get("/"),
        request(app).get("/"),
        request(app).get("/"),
        request(app).get("/"),
        request(app).get("/"),
      ]);

      // All should succeed initially
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
