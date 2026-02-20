/**
 * Model Associations Configuration
 * Defines all relationships between database models
 *
 * This file should be called after all models are defined to ensure
 * proper association setup and relationship management.
 */

const logger = require("../config/logging");

// Import all models
const User = require("./User");
const Kategori = require("./Kategori");
const Alat = require("./Alat");
const Peminjaman = require("./Peminjaman");
const LogAktivitas = require("./LogAktivitas");

/**
 * Define all model associations
 * @throws {Error} If association setup fails
 */
function defineAssociations() {
  try {
    logger.debug("Starting model associations setup");

    // Validate that all models are properly loaded
    const models = { User, Kategori, Alat, Peminjaman, LogAktivitas };
    Object.entries(models).forEach(([modelName, model]) => {
      if (!model || typeof model !== "function") {
        throw new Error(`Model ${modelName} is not properly defined`);
      }
    });

    // User associations
    logger.debug("Setting up User associations");
    User.hasMany(Peminjaman, {
      foreignKey: "user_id",
      as: "peminjaman",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    User.hasMany(LogAktivitas, {
      foreignKey: "user_id",
      as: "logAktivitas",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Kategori associations
    logger.debug("Setting up Kategori associations");
    Kategori.hasMany(Alat, {
      foreignKey: "kategori_id",
      as: "alat",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Alat associations
    logger.debug("Setting up Alat associations");
    Alat.belongsTo(Kategori, {
      foreignKey: "kategori_id",
      as: "kategori",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Alat.hasMany(Peminjaman, {
      foreignKey: "alat_id",
      as: "peminjaman",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Peminjaman associations
    logger.debug("Setting up Peminjaman associations");
    Peminjaman.belongsTo(User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Peminjaman.belongsTo(Alat, {
      foreignKey: "alat_id",
      as: "alat",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // LogAktivitas associations
    logger.debug("Setting up LogAktivitas associations");
    LogAktivitas.belongsTo(User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    logger.debug("All model associations have been defined successfully");
  } catch (error) {
    logger.error("Failed to define model associations:", error);
    throw error;
  }
}

/**
 * Get association information for debugging
 * @returns {Object} Association details
 */
function getAssociationInfo() {
  const associations = {
    User: {
      hasMany: ["Peminjaman", "LogAktivitas"],
      belongsTo: [],
    },
    Kategori: {
      hasMany: ["Alat"],
      belongsTo: [],
    },
    Alat: {
      hasMany: ["Peminjaman"],
      belongsTo: ["Kategori"],
    },
    Peminjaman: {
      hasMany: [],
      belongsTo: ["User", "Alat"],
    },
    LogAktivitas: {
      hasMany: [],
      belongsTo: ["User"],
    },
  };

  logger.debug("Association information retrieved", associations);
  return associations;
}

/**
 * Validate associations are properly set up
 * @returns {boolean} True if all associations are valid
 */
function validateAssociations() {
  try {
    const models = { User, Kategori, Alat, Peminjaman, LogAktivitas };
    const validationResults = {};

    Object.entries(models).forEach(([modelName, model]) => {
      if (!model || typeof model !== "function") {
        validationResults[modelName] = "Model not properly defined";
        return;
      }

      const associations = model.associations || {};
      validationResults[modelName] = {
        hasAssociations: Object.keys(associations).length > 0,
        associationCount: Object.keys(associations).length,
        associations: Object.keys(associations),
      };
    });

    const allValid = Object.values(validationResults).every(
      (result) =>
        result !== "Model not properly defined" && result.hasAssociations,
    );

    logger.debug("Association validation completed", {
      allValid,
      results: validationResults,
    });

    return allValid;
  } catch (error) {
    logger.error("Association validation failed:", error);
    return false;
  }
}

// Export functions for potential use in other files
module.exports = {
  defineAssociations,
  getAssociationInfo,
  validateAssociations,
};
