const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const LogAktivitas = sequelize.define(
  "LogAktivitas",
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
    aktivitas: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    waktu: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "log_aktivitas",
    timestamps: false,
  },
);

module.exports = LogAktivitas;
