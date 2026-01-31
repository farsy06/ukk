const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Peminjaman = sequelize.define(
  "Peminjaman",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    alat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "alat",
        key: "id",
      },
    },
    tanggal_pinjam: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    tanggal_kembali: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "disetujui",
        "dipinjam",
        "dikembalikan",
        "ditolak",
      ),
      defaultValue: "pending",
    },
    tanggal_pengembalian: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: "peminjaman",
    timestamps: false,
  },
);

module.exports = Peminjaman;
