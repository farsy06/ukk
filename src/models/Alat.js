const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Alat = sequelize.define(
  "Alat",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nama_alat: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kategori_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "kategori",
        key: "id",
      },
    },
    kondisi: {
      type: DataTypes.ENUM("baik", "rusak_ringan", "rusak_berat"),
      defaultValue: "baik",
    },
    status: {
      type: DataTypes.ENUM("tersedia", "dipinjam", "maintenance"),
      defaultValue: "tersedia",
    },
    stok: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "alat",
    timestamps: false,
  },
);

module.exports = Alat;
