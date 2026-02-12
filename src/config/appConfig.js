/**
 * Application Configuration
 * Centralized configuration for application settings
 */

const appConfig = {
  // Cookie security override for local/dev HTTP
  allowInsecureCookies:
    process.env.ALLOW_INSECURE_COOKIES === "true" ||
    process.env.NODE_ENV !== "production",
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
      secure:
        process.env.ALLOW_INSECURE_COOKIES === "true"
          ? false
          : process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: "strict",
    },
  },

  // Application settings
  app: {
    name: "eSarpra",
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

  // Fine settings
  fines: {
    overduePerDay: (() => {
      const parsed = parseInt(process.env.OVERDUE_FINE_PER_DAY, 10);
      if (Number.isInteger(parsed) && parsed >= 0) {
        return parsed;
      }
      return 5000;
    })(),
  },

  // Security settings
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: "Too many requests from this IP, please try again later.",
    },
    csrf: true,
    rememberMe: {
      enabled: true,
      cookie: {
        httpOnly: true,
        secure:
          process.env.ALLOW_INSECURE_COOKIES === "true"
            ? false
            : process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    },
  },
};

module.exports = appConfig;
