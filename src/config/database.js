const { Sequelize } = require("sequelize");
const logger = require("./logging");
const path = require("path");

// Load appropriate .env file based on NODE_ENV
const env = process.env.NODE_ENV || "development";

// For test environment, load .env.test.local
if (env === "test") {
  const envPath = path.resolve(__dirname, `../../.env.test.local`);
  try {
    require("dotenv").config({
      path: envPath,
      override: true,
    });
    logger.info(`Variabel lingkungan dimuat dari ${envPath}`);
  } catch (_err /* eslint-disable-line no-unused-vars */) {
    logger.warn(
      `Gagal memuat ${envPath}, kembali menggunakan variabel lingkungan default`,
    );
  }
} else {
  // For all other environments, load only .env file
  try {
    require("dotenv").config({
      path: path.resolve(__dirname, "../../.env"),
      override: true,
    });
    logger.info(`Variabel lingkungan dimuat dari .env file`);
  } catch (_err /* eslint-disable-line no-unused-vars */) {
    logger.warn("Gagal memuat file .env");
  }
}

// Konfigurasi database
const sequelize = new Sequelize(
  process.env.DB_NAME || "",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    port: process.env.DB_PORT || 3306,
    logging: false, // Set true jika ingin melihat query SQL
  },
);

// Test koneksi database
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info("Koneksi database berhasil!");
  } catch (error) {
    logger.error("Gagal terkoneksi ke database:", error);
  }
}

module.exports = {
  sequelize,
  testConnection,
};
