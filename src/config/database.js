const { Sequelize } = require("sequelize");
const logger = require("./logging");
const mysql = require("mysql2/promise");

const resolveDbPassword = () => {
  if (typeof process.env.DB_PASS !== "undefined") {
    return process.env.DB_PASS;
  }

  if (typeof process.env.DB_PASSWORD !== "undefined") {
    return process.env.DB_PASSWORD;
  }

  return "";
};

// Function to create database if it doesn't exist
async function createDatabaseIfNotExists() {
  const dbName = process.env.DB_NAME || "ukk";
  const dbUser = process.env.DB_USER || "root";
  const dbPassword = resolveDbPassword();
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = process.env.DB_PORT || 3306;

  try {
    // Connect without specifying database name
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
    });

    // Check if database exists
    const [rows] = await connection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName],
    );

    if (rows.length === 0) {
      logger.info(
        `Database ${dbName} tidak ditemukan, sedang membuat database...`,
      );
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      logger.info(`Database ${dbName} berhasil dibuat!`);
    } else {
      logger.info(`Database ${dbName} sudah ada`);
    }

    await connection.end();
  } catch (error) {
    logger.error("Gagal membuat database:", error);
    throw error;
  }
}

// Initialize Sequelize immediately to ensure it's available when models are imported
const dbName = process.env.DB_NAME || "ukk";
const dbUser = process.env.DB_USER || "root";
const dbPassword = resolveDbPassword();
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = process.env.DB_PORT || 3306;

let sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  dialect: "mysql",
  port: dbPort,
  logging: false, // Set true jika ingin melihat query SQL
});

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
  if (!reinitializeModels) {
    return sequelize;
  }

  try {
    await sequelize.close();
  } catch (_err) {
    logger.warn("Gagal menutup koneksi database:", _err.message);
  }

  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    dialect: "mysql",
    port: dbPort,
    logging: false, // Set true jika ingin melihat query SQL
  });

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
  const autoCreateDatabase =
    typeof options.autoCreateDatabase === "boolean"
      ? options.autoCreateDatabase
      : process.env.NODE_ENV !== "production";

  if (autoCreateDatabase) {
    await createDatabaseIfNotExists();
  }

  if (options.reinitializeModels) {
    await initializeSequelize({ reinitializeModels: true });
  }
  await testConnection();
}

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase,
  createDatabaseIfNotExists,
  initializeSequelize,
};
