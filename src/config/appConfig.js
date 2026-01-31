/**
 * Application Configuration
 * Centralized configuration for application settings
 */

const appConfig = {
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  },

  // Application settings
  app: {
    name: "ToolShare Pro",
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || "development",
    baseUrl: process.env.BASE_URL || "http://localhost:3000",
  },

  // Password settings
  password: {
    minLength: 8,
    maxLength: 64,
    requireSpecialChar: true,
    requireNumber: true,
    requireUppercase: true,
  },

  // Pagination settings
  pagination: {
    defaultLimit: 10,
    maxLimit: 50,
  },
};

module.exports = appConfig;
