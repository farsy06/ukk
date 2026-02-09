const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Kategori Model
 * Represents categories for equipment classification
 */
const Kategori = sequelize.define(
  "Kategori",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    nama_kategori: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        args: true,
        msg: "Nama kategori sudah digunakan",
      },
      validate: {
        notEmpty: {
          msg: "Nama kategori tidak boleh kosong",
        },
        len: {
          args: [2, 100],
          msg: "Nama kategori harus antara 2-100 karakter",
        },
        is: {
          args: /^[a-zA-Z\s]+$/,
          msg: "Nama kategori hanya boleh mengandung huruf dan spasi",
        },
      },
    },
    deskripsi: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: "Deskripsi maksimal 500 karakter",
        },
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "kategori",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["nama_kategori"],
      },
      {
        fields: ["is_active"],
      },
      // Compound index for queries filtering by is_active and ordering by nama_kategori
      {
        fields: ["is_active", "nama_kategori"],
        name: "idx_active_nama_kategori",
      },
    ],
  },
);

// Instance methods
Kategori.prototype.toJSON = function () {
  const values = { ...this.get() };
  // Add computed properties
  // Priority: 1) literal SQL attribute, 2) loaded association, 3) default 0
  const literalCount = this.get("alat_count");
  if (literalCount !== null && literalCount !== undefined) {
    values.alat_count = parseInt(literalCount, 10);
  } else if (this.alat && Array.isArray(this.alat)) {
    values.alat_count = this.alat.length;
  } else {
    values.alat_count = 0;
  }
  return values;
};

// Class methods
Kategori.getActiveKategori = function () {
  return this.findAll({
    where: { is_active: true },
    include: [
      {
        model: require("./Alat"),
        as: "alat",
        required: false,
      },
    ],
    order: [["nama_kategori", "ASC"]],
  });
};

Kategori.getKategoriWithAlat = function () {
  return this.findAll({
    where: { is_active: true },
    include: [
      {
        model: require("./Alat"),
        as: "alat",
        required: false,
      },
    ],
    order: [["nama_kategori", "ASC"]],
  });
};

Kategori.searchKategori = function (searchTerm) {
  return this.findAll({
    where: {
      is_active: true,
      nama_kategori: {
        [sequelize.Op.iLike]: `%${searchTerm}%`,
      },
    },
    include: [
      {
        model: require("./Alat"),
        as: "alat",
        required: false,
      },
    ],
  });
};

Kategori.getKategoriStats = function () {
  const Alat = require("./Alat");
  return this.findAll({
    where: { is_active: true },
    include: [
      {
        model: Alat,
        as: "alat",
        required: false,
      },
    ],
    order: [["nama_kategori", "ASC"]],
  });
};

module.exports = Kategori;
