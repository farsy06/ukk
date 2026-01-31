// Load only test environment variables
require("dotenv").config({
  path: "./.env.test.local",
  override: true, // Override any existing environment variables
});

const request = require("supertest");
const testConfig = require("./testConfig");
const { sequelize } = require("../src/config/database");
const logger = require("../src/config/logging");
const { defineAssociations } = require("../src/models/associations");
const User = require("../src/models/User");
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
    // Create test database
    await sequelize.sync({ force: true });

    // Define model associations
    try {
      defineAssociations();
    } catch (error) {
      logger.error("Failed to define model associations in test setup:", error);
      throw error;
    }

    // Create test users
    await User.create({
      username: "admintest",
      email: "admin@test.com",
      password: "testpassword",
      role: "admin",
      nama: "Admin Test",
    });

    await User.create({
      username: "petugastest",
      email: "petugas@test.com",
      password: "testpassword",
      role: "petugas",
      nama: "Petugas Test",
    });

    await User.create({
      username: "peminjamtest",
      email: "peminjam@test.com",
      password: "testpassword",
      role: "peminjam",
      nama: "Peminjam Test",
    });
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  // Helper function to login and get session
  const loginAndGetSession = async (username, password) => {
    const loginResponse = await request(app)
      .post("/login")
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
        "testpassword",
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
        "testpassword",
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
        "testpassword",
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
        "testpassword",
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
        "testpassword",
      );

      const response = await request(app)
        .get("/admin/user")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });

    test("GET /admin/catak should return 200 status with valid admin session", async () => {
      // Login first and get session
      const sessionCookie = await loginAndGetSession(
        "admintest",
        "testpassword",
      );

      const response = await request(app)
        .get("/admin/catak")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
    });
  });

  describe("Petugas Controller", () => {
    test("GET /petugas should return 200 status with valid petugas session", async () => {
      // Login first and get session
      const sessionCookie = await loginAndGetSession(
        "petugastest",
        "testpassword",
      );

      const response = await request(app)
        .get("/petugas")
        .set("Cookie", sessionCookie);
      expect(response.status).toBe(200);
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
