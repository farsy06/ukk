/**
 * Application Configuration
 * Centralized configuration for application settings
 */

const appConfig = {
  // Session configuration
  session: {
    secret:
      process.env.SESSION_SECRET ||
      (() => {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "SESSION_SECRET environment variable is required in production",
          );
        }
        return "dev-secret-key-change-in-production";
      })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: "strict",
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
    bcryptRounds: 12,
  },

  // Pagination settings
  pagination: {
    defaultLimit: 10,
    maxLimit: 50,
  },

  // Security settings
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: "Too many requests from this IP, please try again later.",
    },
    csrf: true,
  },
};

module.exports = appConfig;
