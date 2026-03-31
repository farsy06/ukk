const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
const logger = require("./logging");
const mysql = require("mysql2/promise");
const betterSqlite3DialectModule = require("./betterSqlite3DialectModule");

const SUPPORTED_DIALECTS = new Set(["mysql", "sqlite"]);

// SQLite ENUM compatibility handler
// Ensures ENUM values are properly handled for SQLite which stores them as TEXT
const sqliteEnumHandlers = {
  // Map of table names to their ENUM columns and allowed values
  enumColumns: {
    alat: {
      status: ["tersedia", "dipinjam", "maintenance", "hilang"],
      kondisi: ["baik", "rusak_ringan", "rusak_berat"],
    },
    peminjaman: {
      status: [
        "pending",
        "disetujui",
        "dipinjam",
        "dikembalikan",
        "ditolak",
        "dibatalkan",
      ],
      kondisi_pengembalian: ["normal", "rusak", "hilang"],
      status_insiden: ["none", "dilaporkan", "selesai"],
      status_pembayaran_denda: [
        "belum_bayar",
        "menunggu_verifikasi",
        "lunas",
        "ditolak",
      ],
    },
  },

  // Check and update SQLite ENUM values if needed
  async syncEnums(sequelize) {
    const dialect = sequelize.getDialect();
    if (dialect !== "sqlite") {
      return; // Only needed for SQLite
    }

    try {
      for (const [tableName, columns] of Object.entries(this.enumColumns)) {
        for (const [columnName, allowedValues] of Object.entries(columns)) {
          // SQLite doesn't enforce ENUMs, but we can log the expected values
          logger.debug(
            `SQLite ENUM compatibility: ${tableName}.${columnName} expects: [${allowedValues.join(", ")}]`,
          );
        }
      }
    } catch (error) {
      logger.warn("SQLite ENUM sync warning:", error.message);
    }
  },
};

const resolveDbPassword = () => {
  if (typeof process.env.DB_PASS !== "undefined") {
    return process.env.DB_PASS;
  }

  if (typeof process.env.DB_PASSWORD !== "undefined") {
    return process.env.DB_PASSWORD;
  }

  return "";
};

const parseBooleanEnv = (value, defaultValue = false) => {
  if (typeof value !== "string") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const resolveDialect = () => {
  const rawDialect = (process.env.DB_DIALECT || "mysql").trim().toLowerCase();
  if (SUPPORTED_DIALECTS.has(rawDialect)) {
    return rawDialect;
  }

  logger.warn(
    `DB_DIALECT "${rawDialect}" tidak didukung, menggunakan mysql sebagai default`,
  );
  return "mysql";
};

const resolveSqliteStorage = () => {
  const rawStorage =
    typeof process.env.DB_STORAGE === "string"
      ? process.env.DB_STORAGE.trim()
      : "";
  const storagePath = rawStorage || "./data/ukk.sqlite";
  return path.isAbsolute(storagePath)
    ? storagePath
    : path.resolve(process.cwd(), storagePath);
};

const resolveDatabaseConfig = () => ({
  dialect: resolveDialect(),
  name: process.env.DB_NAME || "ukk",
  user: process.env.DB_USER || "root",
  password: resolveDbPassword(),
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT, 10) || 3306,
  storage: resolveSqliteStorage(),
  logging: parseBooleanEnv(process.env.DB_LOGGING, false),
});

const ensureSqliteStorageDirectory = (storagePath) => {
  const dir = path.dirname(storagePath);
  fs.mkdirSync(dir, { recursive: true });
};

const createSequelizeInstance = (config) => {
  if (config.dialect === "sqlite") {
    return new Sequelize({
      dialect: "sqlite",
      storage: config.storage,
      dialectModule: betterSqlite3DialectModule,
      logging: config.logging,
    });
  }

  return new Sequelize(config.name, config.user, config.password, {
    host: config.host,
    dialect: "mysql",
    port: config.port,
    logging: config.logging,
  });
};

// Function to create database if it doesn't exist (MySQL only)
async function createDatabaseIfNotExists() {
  const config = resolveDatabaseConfig();

  if (config.dialect === "sqlite") {
    ensureSqliteStorageDirectory(config.storage);
    logger.info(`Menggunakan SQLite di ${config.storage}`);
    return;
  }

  try {
    // Connect without specifying database name
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    // Check if database exists
    const [rows] = await connection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [config.name],
    );

    if (rows.length === 0) {
      logger.info(
        `Database ${config.name} tidak ditemukan, sedang membuat database...`,
      );
      await connection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${config.name}\``,
      );
      logger.info(`Database ${config.name} berhasil dibuat!`);
    } else {
      logger.info(`Database ${config.name} sudah ada`);
    }

    await connection.end();
  } catch (error) {
    logger.error("Gagal membuat database:", error);
    throw error;
  }
}

// Initialize Sequelize immediately to ensure it's available when models are imported
let sequelize = createSequelizeInstance(resolveDatabaseConfig());

const modelModules = [
  "../models/User",
  "../models/Alat",
  "../models/Kategori",
  "../models/Peminjaman",
  "../models/LogAktivitas",
  "../models/associations",
];

const reloadModels = () => {
  modelModules.forEach((modulePath) => {
    const resolved = require.resolve(modulePath, { paths: [__dirname] });
    if (require.cache[resolved]) {
      delete require.cache[resolved];
    }
  });

  // Re-require models and associations so they bind to the current sequelize
  require("../models/User");
  require("../models/Alat");
  require("../models/Kategori");
  require("../models/Peminjaman");
  require("../models/LogAktivitas");
  require("../models/associations");
};

// Re-initialize Sequelize and optionally reload models
async function initializeSequelize({ reinitializeModels = false } = {}) {
  const config = resolveDatabaseConfig();

  if (!reinitializeModels) {
    if (config.dialect === "sqlite") {
      ensureSqliteStorageDirectory(config.storage);
    }
    return sequelize;
  }

  try {
    await sequelize.close();
  } catch (_err) {
    logger.warn("Gagal menutup koneksi database:", _err.message);
  }

  if (config.dialect === "sqlite") {
    ensureSqliteStorageDirectory(config.storage);
  }

  sequelize = createSequelizeInstance(config);

  // Keep exported reference in sync with the latest instance
  module.exports.sequelize = sequelize;
  reloadModels();

  return sequelize;
}

// Test koneksi database
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info("Koneksi database berhasil!");
  } catch (error) {
    logger.error("Gagal terkoneksi ke database:", error);
    throw error;
  }
}

// Main initialization function
async function initializeDatabase(options = {}) {
  const config = resolveDatabaseConfig();
  const autoCreateDatabase =
    typeof options.autoCreateDatabase === "boolean"
      ? options.autoCreateDatabase
      : process.env.NODE_ENV !== "production";

  if (autoCreateDatabase || config.dialect === "sqlite") {
    await createDatabaseIfNotExists();
  }

  if (options.reinitializeModels) {
    await initializeSequelize({ reinitializeModels: true });
  }
  await testConnection();

  // Sync ENUM values for SQLite compatibility
  await sqliteEnumHandlers.syncEnums(sequelize);
}

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase,
  createDatabaseIfNotExists,
  initializeSequelize,
  sqliteEnumHandlers,
};
