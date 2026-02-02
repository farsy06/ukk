/**
 * Models Index
 * Centralized export of all database models and association setup
 */

// Import all models
const User = require("./User");
const Kategori = require("./Kategori");
const Alat = require("./Alat");
const Peminjaman = require("./Peminjaman");
const LogAktivitas = require("./LogAktivitas");

// Import association setup
const { defineAssociations, validateAssociations } = require("./associations");

/**
 * Initialize all models and their associations
 * @returns {Object} All models with associations set up
 */
function initializeModels() {
  try {
    // Define all associations
    defineAssociations();

    // Validate associations
    const associationsValid = validateAssociations();
    if (!associationsValid) {
      throw new Error("Model associations validation failed");
    }

    // Sync models with database (optional, can be done manually)
    // sequelize.sync({ alter: true });

    return {
      User,
      Kategori,
      Alat,
      Peminjaman,
      LogAktivitas,
    };
  } catch (error) {
    console.error("Failed to initialize models:", error);
    throw error;
  }
}

/**
 * Get model information for debugging
 * @returns {Object} Model details and associations
 */
function getModelInfo() {
  const models = {
    User: {
      tableName: "users",
      fields: Object.keys(User.rawAttributes),
      associations: Object.keys(User.associations || {}),
    },
    Kategori: {
      tableName: "kategori",
      fields: Object.keys(Kategori.rawAttributes),
      associations: Object.keys(Kategori.associations || {}),
    },
    Alat: {
      tableName: "alat",
      fields: Object.keys(Alat.rawAttributes),
      associations: Object.keys(Alat.associations || {}),
    },
    Peminjaman: {
      tableName: "peminjaman",
      fields: Object.keys(Peminjaman.rawAttributes),
      associations: Object.keys(Peminjaman.associations || {}),
    },
    LogAktivitas: {
      tableName: "log_aktivitas",
      fields: Object.keys(LogAktivitas.rawAttributes),
      associations: Object.keys(LogAktivitas.associations || {}),
    },
  };

  return models;
}

/**
 * Validate all models are properly defined
 * @returns {boolean} True if all models are valid
 */
function validateModels() {
  const models = [User, Kategori, Alat, Peminjaman, LogAktivitas];
  const modelNames = ["User", "Kategori", "Alat", "Peminjaman", "LogAktivitas"];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const modelName = modelNames[i];

    if (!model || typeof model !== "function") {
      console.error(`Model ${modelName} is not properly defined`);
      return false;
    }

    if (!model.rawAttributes || Object.keys(model.rawAttributes).length === 0) {
      console.error(`Model ${modelName} has no attributes defined`);
      return false;
    }
  }

  return true;
}

// Export models and utility functions
module.exports = {
  User,
  Kategori,
  Alat,
  Peminjaman,
  LogAktivitas,
  initializeModels,
  getModelInfo,
  validateModels,
  defineAssociations,
  validateAssociations,
};
