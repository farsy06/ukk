/**
 * Application Configuration
 * Centralized configuration for application settings
 */

const environment = process.env.NODE_ENV || "development";

function parseBooleanEnv(value, defaultValue = false) {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function parseIntegerEnv(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : defaultValue;
}

function parseCsvEnv(value, defaultValue = []) {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const values = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return values.length > 0 ? values : defaultValue;
}

const appUrl =
  process.env.APP_URL || process.env.BASE_URL || "http://localhost:3000";

const defaultResetAllowedHosts = (() => {
  try {
    return [new URL(appUrl).host.toLowerCase()];
  } catch {
    return [];
  }
})();

const rawSyncMode = (process.env.DB_SYNC_MODE || "").trim().toLowerCase();
const defaultSyncMode =
  environment === "development"
    ? "alter"
    : environment === "test"
      ? "safe"
      : "none";
const syncMode = ["none", "safe", "alter"].includes(rawSyncMode)
  ? rawSyncMode
  : defaultSyncMode;
const relaxedLocalDev = parseBooleanEnv(
  process.env.SECURITY_RELAX_LOCAL_DEV,
  environment === "development",
);
const csrfEnabled = parseBooleanEnv(
  process.env.SECURITY_CSRF,
  environment === "production",
);
const rateLimitEnabled = parseBooleanEnv(
  process.env.SECURITY_RATE_LIMIT,
  environment === "production",
);
const hstsEnabled = parseBooleanEnv(
  process.env.SECURITY_HSTS,
  environment === "production",
);

const appConfig = {
  // Cookie security override for local/dev HTTP
  allowInsecureCookies:
    parseBooleanEnv(process.env.ALLOW_INSECURE_COOKIES, false) ||
    environment !== "production",
  // Session configuration
  session: {
    secret:
      process.env.SESSION_SECRET ||
      (() => {
        if (environment === "production") {
          throw new Error(
            "SESSION_SECRET environment variable is required in production",
          );
        }
        return "dev-secret-key-change-in-production";
      })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: parseBooleanEnv(process.env.ALLOW_INSECURE_COOKIES, false)
        ? false
        : environment === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: "strict",
    },
  },

  // Application settings
  app: {
    name: "eSarpra",
    port: parseIntegerEnv(process.env.PORT, 3000),
    environment,
    url: appUrl,
    // Backward compatibility for existing code paths that still read baseUrl.
    baseUrl: appUrl,
  },

  // Database settings
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseIntegerEnv(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || "ukk",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || process.env.DB_PASSWORD || "",
    autoCreateOnStartup: parseBooleanEnv(
      process.env.DB_AUTO_CREATE,
      environment !== "production",
    ),
  },

  // Startup behavior
  startup: {
    dbSyncMode: syncMode, // none | safe | alter
    warmupMail: parseBooleanEnv(process.env.MAIL_WARMUP_ON_STARTUP, true),
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
      const parsed = parseIntegerEnv(process.env.OVERDUE_FINE_PER_DAY, 5000);
      if (Number.isInteger(parsed) && parsed >= 0) {
        return parsed;
      }
      return 5000;
    })(),
  },

  // Security settings
  security: {
    relaxedLocalDev,
    rateLimit: {
      enabled: rateLimitEnabled,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: "Too many requests from this IP, please try again later.",
    },
    csrf: csrfEnabled,
    hsts: hstsEnabled,
    rememberMe: {
      enabled: true,
      cookie: {
        httpOnly: true,
        secure: parseBooleanEnv(process.env.ALLOW_INSECURE_COOKIES, false)
          ? false
          : environment === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    },
  },

  // Mail settings
  mail: {
    resetAllowedHosts: parseCsvEnv(
      process.env.MAIL_RESET_ALLOWED_HOSTS,
      defaultResetAllowedHosts,
    ),
  },
};

module.exports = appConfig;
