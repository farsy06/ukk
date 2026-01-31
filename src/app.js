const express = require("express");
const session = require("express-session");
const path = require("path");
const flash = require("connect-flash");
const expressLayouts = require("express-ejs-layouts");
const { sequelize, testConnection } = require("./config/database");
const logger = require("./config/logging");
const { appConfig } = require("./utils/helpers");

// Import middleware security
const {
  generalLimiter,
  sanitizeInput,
  securityHeaders,
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

// Test koneksi database
testConnection().catch((error) => {
  logger.error("Database connection test failed:", error);
  process.exit(1);
});

// Konfigurasi view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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
app.use(session(appConfig.session));

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

// Sync database dan start server
sequelize
  .sync({ alter: true })
  .then(() => {
    logger.info("Database synced");

    // Define model associations after database sync
    try {
      defineAssociations();
    } catch (error) {
      logger.error("Failed to define model associations:", error);
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.info(`Server running on ${appConfig.app.baseUrl}`);
      logger.info(`Environment: ${appConfig.app.environment}`);
    });
  })
  .catch((error) => {
    logger.error("Error syncing database:", error);
    process.exit(1);
  });
