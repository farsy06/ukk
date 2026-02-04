// Load only test environment variables
require("dotenv").config({
  path: "./.env.test.local",
  override: true, // Override any existing environment variables
});

const request = require("supertest");
const testConfig = require("./testConfig");
const { sequelize, initializeDatabase } = require("../src/config/database");
const logger = require("../src/config/logging");

// Create a test app instance
const createTestApp = () => {
  const express = require("express");
  const session = require("express-session");
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

  const app = express();

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

  return app;
};

describe("Basic App Tests", () => {
  let app;

  beforeAll(async () => {
    // Skip database synchronization for basic app tests
    // This avoids synchronization issues
    logger.info("Skipping database synchronization for basic app tests");

    // Initialize database
    await initializeDatabase();

    // Define model associations before creating the app
    // This ensures models are properly associated for the tests
    const { defineAssociations } = require("../src/models/associations");
    try {
      defineAssociations();
      logger.info("Model associations defined successfully");
    } catch (error) {
      logger.error("Failed to define model associations:", error);
    }

    app = createTestApp();
  });

  afterAll(async () => {
    // Close database connection if needed
    try {
      await sequelize.close();
    } catch (error) {
      logger.error("Error closing database connection:", error);
    }
  });

  test("GET /login should return 200 status", async () => {
    const response = await request(app).get("/login");
    expect(response.status).toBe(200);
  });

  test("GET /register should return 200 status", async () => {
    const response = await request(app).get("/register");
    expect(response.status).toBe(200);
  });

  test("GET /login should handle POST request", async () => {
    const response = await request(app).post("/login").send({
      username: "testuser",
      password: "TestPassword123!",
    });
    expect(response.status).toBe(302); // Redirect after failed login
  });

  test("GET /register should handle POST request", async () => {
    const response = await request(app).post("/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(response.status).toBe(302); // Redirect after failed registration
  });
});
