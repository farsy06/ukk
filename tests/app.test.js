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

jest.mock("../src/models/User", () => ({
  findOne: jest.fn(),
}));

jest.mock("../src/services/userService", () => ({
  create: jest.fn(),
}));

const request = require("supertest");
const testConfig = require("./testConfig");
const db = require("../src/config/database");
const logger = require("../src/config/logging");
const User = require("../src/models/User");
const userService = require("../src/services/userService");
const appConfig = require("../src/config/appConfig");

// Create a test app instance
const createTestApp = () => {
  const express = require("express");
  const session = require("express-session");
  const path = require("path");
  const flash = require("connect-flash");

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
  app.set("trust proxy", 1);

  // Custom layout renderer (replacement for express-ejs-layouts)
  app.use((req, res, next) => {
    const rawRender = res.render.bind(res);
    res.render = (view, options, callback) => {
      let opts = options || {};
      let cb = callback;

      if (typeof options === "function") {
        cb = options;
        opts = {};
      }

      if (view === "layout" || opts.layout === false) {
        return rawRender(view, opts, cb);
      }

      return rawRender(view, opts, (viewErr, html) => {
        if (viewErr) {
          if (cb) return cb(viewErr);
          return next(viewErr);
        }

        const layoutData = {
          ...res.locals,
          ...opts,
          body: html,
          allowHtml: true,
        };

        return rawRender("layout", layoutData, (layoutErr, finalHtml) => {
          if (layoutErr) {
            if (cb) return cb(layoutErr);
            return next(layoutErr);
          }

          if (cb) return cb(null, finalHtml);
          return res.send(finalHtml);
        });
      });
    };
    next();
  });

  // Security middleware (harus dijalankan pertama)
  app.use(generalLimiter);
  app.use(sanitizeInput);
  app.use(securityHeaders);

  // Middleware
  app.use(express.static(path.join(__dirname, "../public")));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Session configuration
  const sessionConfig = {
    ...testConfig.session,
    cookie: {
      ...(testConfig.session.cookie || {}),
      secure: true,
    },
  };
  app.use(session(sessionConfig));

  // CSRF Protection
  app.use(csrfToken);

  // Flash messages
  app.use(flash());

  // Global variables untuk flash messages
  app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.overdueFinePerDay = appConfig.fines.overduePerDay;
    res.locals.overdueFinePerDayFormatted = new Intl.NumberFormat("id-ID").format(
      appConfig.fines.overduePerDay,
    );
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
    await db.initializeDatabase();

    // Define model associations before creating the app
    // This ensures models are properly associated for the tests
    const { defineAssociations } = require("../src/models/associations");
    try {
      defineAssociations();
      logger.info("Model associations defined successfully");
    } catch (error) {
      logger.error("Failed to define model associations:", error);
    }

    // Ensure tables exist for basic route tests
    try {
      await db.sequelize.sync();
    } catch (error) {
      logger.error("Failed to sync database in basic app tests:", error);
    }

    app = createTestApp();
  });

  // Teardown handled by Jest global teardown to avoid closing shared resources mid-run

  test("GET /login should return 200 status", async () => {
    const response = await request(app).get("/login");
    expect(response.status).toBe(200);
  });

  test("GET /register should return 200 status", async () => {
    const response = await request(app).get("/register");
    expect(response.status).toBe(200);
  });

  test("GET /login should handle POST request", async () => {
    User.findOne.mockResolvedValue(null);
    const agent = request.agent(app);
    await agent.get("/login").set("X-Forwarded-Proto", "https");
    const response = await agent
      .post("/login")
      .set("X-Forwarded-Proto", "https")
      .send({
        username: "testuser",
        password: "TestPassword123!",
      });
    expect(response.status).toBe(302); // Redirect after failed login
  });

  test("GET /register should handle POST request", async () => {
    userService.create.mockRejectedValue(new Error("Registration failed"));
    const agent = request.agent(app);
    await agent.get("/register").set("X-Forwarded-Proto", "https");
    const response = await agent
      .post("/register")
      .set("X-Forwarded-Proto", "https")
      .send({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
    expect(response.status).toBe(302); // Redirect after failed registration
  });
});
