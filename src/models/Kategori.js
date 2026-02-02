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
    ],
  },
);

// Instance methods
Kategori.prototype.toJSON = function () {
  const values = { ...this.get() };
  // Add computed properties
  values.alat_count = this.alat ? this.alat.length : 0;
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
        where: { is_active: true },
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
        where: { is_active: true },
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
        where: { is_active: true },
        required: false,
      },
    ],
  });
};

Kategori.getKategoriStats = function () {
  return this.findAll({
    attributes: [
      "id",
      "nama_kategori",
      "deskripsi",
      "is_active",
      [
        sequelize.literal(
          "(SELECT COUNT(*) FROM alat WHERE alat.kategori_id = kategori.id AND alat.is_active = true)",
        ),
        "alat_count",
      ],
    ],
    where: { is_active: true },
    order: [["nama_kategori", "ASC"]],
  });
};

module.exports = Kategori;
