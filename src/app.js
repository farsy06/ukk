const express = require("express");
const session = require("express-session");
const path = require("path");
const flash = require("connect-flash");
const { sequelize, initializeDatabase } = require("./config/database");
const logger = require("./config/logging");
const { appConfig } = require("./utils/helpers");

// Import middleware security
const {
  generalLimiter,
  sanitizeInput,
  securityHeaders,
  csrfToken,
} = require("./middleware/security");

// Import error handler
const { errorHandler, notFoundHandler } = require("./middleware/asyncHandler");

// Import routes
const webRoutes = require("./routes/web");

// Import models dan associations
const { defineAssociations } = require("./models/associations");
const User = require("./models/User"); // Import User model at the top

const app = express();
const PORT = appConfig.app.port;

// Environment validation
const requiredEnvVars = ["DB_HOST", "DB_NAME", "DB_USER", "SESSION_SECRET"];
// Note: DB_PASS can be empty for MySQL root user without password
const missingEnvVars = requiredEnvVars.filter((env) => !process.env[env]);

if (missingEnvVars.length > 0) {
  logger.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
  process.exit(1);
}

// Sync database dan start server
async function startServer() {
  try {
    logger.info("Starting application...");

    // Initialize database
    await initializeDatabase();

    // Sync database
    await sequelize.sync({ alter: true });
    logger.info("Database synced");

    // Define model associations after database sync
    defineAssociations();
    logger.info("Model associations defined");

    // Konfigurasi view engine
    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "views"));
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
            if (cb) {
              return cb(viewErr);
            }
            return next(viewErr);
          }

          const resolvedAllowHtml =
            typeof opts.allowHtml !== "undefined"
              ? opts.allowHtml
              : typeof res.locals.allowHtml !== "undefined"
                ? res.locals.allowHtml
                : true;

          const layoutData = {
            ...res.locals,
            ...opts,
            body: html,
            allowHtml: resolvedAllowHtml,
          };

          return rawRender("layout", layoutData, (layoutErr, finalHtml) => {
            if (layoutErr) {
              if (cb) {
                return cb(layoutErr);
              }
              return next(layoutErr);
            }
            if (cb) {
              return cb(null, finalHtml);
            }
            return res.send(finalHtml);
          });
        });
      };
      next();
    });

    // Security middleware (harus dijalankan pertama)
    app.use(generalLimiter);
    app.use(securityHeaders);

    // Middleware
    app.use(express.static(path.join(__dirname, "../public")));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Session configuration
    const sessionConfig = {
      ...appConfig.session,
      cookie: {
        ...(appConfig.session && appConfig.session.cookie),
        httpOnly: true,
        secure: appConfig.app.environment === "production",
      },
    };
    app.use(session(sessionConfig));

    // Enforce HTTPS in production to avoid clear-text cookie transmission
    if (appConfig.app.environment === "production") {
      app.use((req, res, next) => {
        if (req.secure) {
          return next();
        }
        if (req.headers["x-forwarded-proto"] === "https") {
          return next();
        }
        return res.redirect(
          301,
          `https://${req.headers.host}${req.originalUrl}`,
        );
      });
    }

    // Flash messages (after session)
    app.use(flash());

    // Global variables untuk flash messages
    app.use((req, res, next) => {
      res.locals.success = req.flash("success");
      res.locals.error = req.flash("error");
      res.locals.overdueFinePerDay = appConfig.fines.overduePerDay;
      res.locals.overdueFinePerDayFormatted = new Intl.NumberFormat(
        "id-ID",
      ).format(appConfig.fines.overduePerDay);
      next();
    });

    // CSRF Protection
    const enableCsrf = appConfig.security.csrf !== false;
    app.use((req, res, next) => {
      if (!enableCsrf) {
        return next();
      }
      return csrfToken(req, res, next);
    });

    // Input sanitization (after body parsing & CSRF)
    app.use(sanitizeInput);

    // Set user from session for all routes (if logged in)
    app.use(async (req, res, next) => {
      try {
        if (req.session.userId) {
          const user = await User.findByPk(req.session.userId);
          if (user) {
            req.user = user;
            res.locals.user = user;
          } else {
            // User not found, destroy session
            req.session.destroy();
          }
        }
        next();
      } catch (error) {
        logger.error("Error setting user from session:", error);
        next();
      }
    });

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: appConfig.app.environment,
        version: process.env.npm_package_version || "1.0.0",
      });
    });

    // API health check
    app.get("/api/health", (req, res) => {
      res.status(200).json({
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    });

    // Routes
    app.use("/", webRoutes);

    // Error handling
    app.use(errorHandler);

    // 404 handler
    app.use(notFoundHandler);

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on ${appConfig.app.baseUrl}`);
      logger.info(`Environment: ${appConfig.app.environment}`);
      logger.info(`Process ID: ${process.pid}`);
    });

    // Graceful shutdown handling
    const shutdown = (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close((err) => {
        if (err) {
          logger.error("Error during server shutdown:", err);
          process.exit(1);
        }

        logger.info("HTTP server closed");

        // Close database connection
        sequelize
          .close()
          .then(() => {
            logger.info("Database connection closed");
            logger.info("Application shutdown complete");
            process.exit(0);
          })
          .catch((err) => {
            logger.error("Error closing database connection:", err);
            process.exit(1);
          });
      });
    };

    // Handle shutdown signals
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception:", err);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
