const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * LogAktivitas Model
 * Represents user activity logs for audit trail
 */
const LogAktivitas = sequelize.define(
  "LogAktivitas",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      validate: {
        isInt: {
          msg: "User ID harus berupa angka",
        },
        min: {
          args: [1],
          msg: "User ID harus lebih besar dari 0",
        },
      },
    },
    aktivitas: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Aktivitas tidak boleh kosong",
        },
        len: {
          args: [1, 1000],
          msg: "Aktivitas harus antara 1-1000 karakter",
        },
      },
    },
    waktu: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: {
          msg: "Waktu harus berupa tanggal yang valid",
        },
      },
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        len: {
          args: [0, 45],
          msg: "IP address maksimal 45 karakter",
        },
      },
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 1000],
          msg: "User agent maksimal 1000 karakter",
        },
      },
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: {
          args: [0, 255],
          msg: "Session ID maksimal 255 karakter",
        },
      },
    },
  },
  {
    tableName: "log_aktivitas",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["waktu"],
      },
      {
        fields: ["waktu", "user_id"],
      },
      {
        fields: ["ip_address"],
      },
    ],
  },
);

// Instance methods
LogAktivitas.prototype.toJSON = function () {
  const values = { ...this.get() };
  // Add computed properties
  values.waktu_formatted = this.waktu
    ? new Date(this.waktu).toLocaleString("id-ID")
    : null;
  return values;
};

// Class methods
LogAktivitas.getUserActivity = function (userId, limit = 50) {
  return this.findAll({
    where: { user_id: userId },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
    ],
    order: [["waktu", "DESC"]],
    limit,
  });
};

LogAktivitas.getActivityByDate = function (startDate, endDate, limit = 100) {
  return this.findAll({
    where: {
      waktu: {
        [sequelize.Op.between]: [startDate, endDate],
      },
    },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
    ],
    order: [["waktu", "DESC"]],
    limit,
  });
};

LogAktivitas.getActivityByUserAndDate = function (userId, startDate, endDate) {
  return this.findAll({
    where: {
      user_id: userId,
      waktu: {
        [sequelize.Op.between]: [startDate, endDate],
      },
    },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
    ],
    order: [["waktu", "DESC"]],
  });
};

LogAktivitas.getActivityByIP = function (ipAddress, limit = 50) {
  return this.findAll({
    where: { ip_address: ipAddress },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
    ],
    order: [["waktu", "DESC"]],
    limit,
  });
};

LogAktivitas.getActivitySummary = function (startDate, endDate) {
  return this.findAll({
    attributes: [
      "user_id",
      [sequelize.fn("COUNT", "*"), "total_aktivitas"],
      [sequelize.fn("MIN", sequelize.col("waktu")), "waktu_pertama"],
      [sequelize.fn("MAX", sequelize.col("waktu")), "waktu_terakhir"],
    ],
    where: {
      waktu: {
        [sequelize.Op.between]: [startDate, endDate],
      },
    },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
    ],
    group: ["user_id"],
    order: [[sequelize.literal("total_aktivitas"), "DESC"]],
  });
};

LogAktivitas.getActivityByKeyword = function (keyword, limit = 100) {
  return this.findAll({
    where: {
      aktivitas: {
        [sequelize.Op.iLike]: `%${keyword}%`,
      },
    },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
    ],
    order: [["waktu", "DESC"]],
    limit,
  });
};

LogAktivitas.getRecentActivity = function (limit = 100) {
  return this.findAll({
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
    ],
    order: [["waktu", "DESC"]],
    limit,
  });
};

module.exports = LogAktivitas;
