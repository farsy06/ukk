const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Peminjaman Model
 * Represents equipment borrowing transactions
 */
const Peminjaman = sequelize.define(
  "Peminjaman",
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
    alat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "alat",
        key: "id",
      },
      validate: {
        isInt: {
          msg: "Alat ID harus berupa angka",
        },
        min: {
          args: [1],
          msg: "Alat ID harus lebih besar dari 0",
        },
      },
    },
    tanggal_pinjam: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: {
          msg: "Tanggal pinjam harus berupa tanggal yang valid",
        },
        isAfter: {
          args: [new Date().toISOString().split("T")[0]],
          msg: "Tanggal pinjam tidak boleh di masa lalu",
        },
      },
    },
    tanggal_kembali: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: {
          msg: "Tanggal kembali harus berupa tanggal yang valid",
        },
        isAfter: {
          args: [new Date().toISOString().split("T")[0]],
          msg: "Tanggal kembali tidak boleh di masa lalu",
        },
      },
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "disetujui",
        "dipinjam",
        "dikembalikan",
        "ditolak",
        "dibatalkan",
      ),
      allowNull: false,
      defaultValue: "pending",
      validate: {
        isIn: {
          args: [
            [
              "pending",
              "disetujui",
              "dipinjam",
              "dikembalikan",
              "ditolak",
              "dibatalkan",
            ],
          ],
          msg: "Status peminjaman tidak valid",
        },
      },
    },
    tanggal_pengembalian: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: {
          msg: "Tanggal pengembalian harus berupa tanggal yang valid",
        },
      },
    },
    catatan: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: "Catatan maksimal 500 karakter",
        },
      },
    },
    denda: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      validate: {
        isDecimal: {
          msg: "Denda harus berupa angka desimal",
        },
        min: {
          args: [0],
          msg: "Denda tidak boleh negatif",
        },
      },
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
    tableName: "peminjaman",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["alat_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["tanggal_pinjam"],
      },
      {
        fields: ["tanggal_kembali"],
      },
      {
        fields: ["tanggal_pengembalian"],
      },
      {
        fields: ["status", "tanggal_kembali"],
      },
    ],
    validate: {
      tanggalLogic() {
        if (this.tanggal_pinjam && this.tanggal_kembali) {
          const pinjam = new Date(this.tanggal_pinjam);
          const kembali = new Date(this.tanggal_kembali);

          if (pinjam >= kembali) {
            throw new Error(
              "Tanggal kembali harus lebih besar dari tanggal pinjam",
            );
          }

          // Maksimal peminjaman 30 hari
          const diffTime = kembali.getTime() - pinjam.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 30) {
            throw new Error("Maksimal peminjaman adalah 30 hari");
          }
        }
      },
      statusLogic() {
        if (this.status === "dikembalikan" && !this.tanggal_pengembalian) {
          throw new Error(
            "Peminjaman yang sudah dikembalikan harus memiliki tanggal pengembalian",
          );
        }

        if (this.tanggal_pengembalian && this.status !== "dikembalikan") {
          throw new Error(
            "Tanggal pengembalian hanya boleh diisi jika status dikembalikan",
          );
        }
      },
    },
  },
);

// Instance methods
Peminjaman.prototype.isOverdue = function () {
  if (this.status === "dikembalikan") return false;

  const today = new Date();
  const kembali = new Date(this.tanggal_kembali);
  return today > kembali;
};

Peminjaman.prototype.getDaysOverdue = function () {
  if (!this.isOverdue()) return 0;

  const today = new Date();
  const kembali = new Date(this.tanggal_kembali);
  const diffTime = today.getTime() - kembali.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Peminjaman.prototype.calculateFine = function () {
  const daysOverdue = this.getDaysOverdue();
  // Denda Rp 5000 per hari keterlambatan
  return daysOverdue * 5000;
};

Peminjaman.prototype.toJSON = function () {
  const values = { ...this.get() };
  // Add computed properties
  values.is_overdue = this.isOverdue();
  values.days_overdue = this.getDaysOverdue();
  values.fine_amount = this.calculateFine();
  return values;
};

// Class methods
Peminjaman.getActivePeminjaman = function () {
  return this.findAll({
    where: {
      status: {
        [sequelize.Op.in]: ["pending", "disetujui", "dipinjam"],
      },
    },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
      {
        model: require("./Alat"),
        as: "alat",
        include: [
          {
            model: require("./Kategori"),
            as: "kategori",
          },
        ],
      },
    ],
    order: [["tanggal_pinjam", "DESC"]],
  });
};

Peminjaman.getOverduePeminjaman = function () {
  return this.findAll({
    where: {
      status: {
        [sequelize.Op.in]: ["dipinjam"],
      },
      tanggal_kembali: {
        [sequelize.Op.lt]: new Date().toISOString().split("T")[0],
      },
    },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
      {
        model: require("./Alat"),
        as: "alat",
        include: [
          {
            model: require("./Kategori"),
            as: "kategori",
          },
        ],
      },
    ],
    order: [["tanggal_kembali", "ASC"]],
  });
};

Peminjaman.getByUser = function (userId) {
  return this.findAll({
    where: { user_id: userId },
    include: [
      {
        model: require("./Alat"),
        as: "alat",
        include: [
          {
            model: require("./Kategori"),
            as: "kategori",
          },
        ],
      },
    ],
    order: [["tanggal_pinjam", "DESC"]],
  });
};

Peminjaman.getByAlat = function (alatId) {
  return this.findAll({
    where: { alat_id: alatId },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
    ],
    order: [["tanggal_pinjam", "DESC"]],
  });
};

Peminjaman.getByStatus = function (status) {
  return this.findAll({
    where: { status },
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
      {
        model: require("./Alat"),
        as: "alat",
        include: [
          {
            model: require("./Kategori"),
            as: "kategori",
          },
        ],
      },
    ],
    order: [["tanggal_pinjam", "DESC"]],
  });
};

Peminjaman.getHistory = function (limit = 100) {
  return this.findAll({
    include: [
      {
        model: require("./User"),
        as: "user",
        attributes: ["id", "nama", "username", "email", "role"],
      },
      {
        model: require("./Alat"),
        as: "alat",
        include: [
          {
            model: require("./Kategori"),
            as: "kategori",
          },
        ],
      },
    ],
    order: [["tanggal_pinjam", "DESC"]],
    limit,
  });
};

module.exports = Peminjaman;
