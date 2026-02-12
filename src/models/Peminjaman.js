const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const appConfig = require("../config/appConfig");

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
    jumlah: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isInt: {
          msg: "Jumlah harus berupa angka",
        },
        min: {
          args: [1],
          msg: "Jumlah minimal 1",
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
        notPast(value) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dateValue = new Date(value);
          dateValue.setHours(0, 0, 0, 0);
          if (dateValue < today) {
            throw new Error("Tanggal pinjam tidak boleh di masa lalu");
          }
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
        notPast(value) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dateValue = new Date(value);
          dateValue.setHours(0, 0, 0, 0);
          if (dateValue < today) {
            throw new Error("Tanggal kembali tidak boleh di masa lalu");
          }
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
    denda_terlambat: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      validate: {
        isDecimal: {
          msg: "Denda keterlambatan harus berupa angka desimal",
        },
        min: {
          args: [0],
          msg: "Denda keterlambatan tidak boleh negatif",
        },
      },
    },
    denda_insiden: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      validate: {
        isDecimal: {
          msg: "Denda insiden harus berupa angka desimal",
        },
        min: {
          args: [0],
          msg: "Denda insiden tidak boleh negatif",
        },
      },
    },
    kondisi_pengembalian: {
      type: DataTypes.ENUM("normal", "rusak", "hilang"),
      allowNull: false,
      defaultValue: "normal",
      validate: {
        isIn: {
          args: [["normal", "rusak", "hilang"]],
          msg: "Kondisi pengembalian tidak valid",
        },
      },
    },
    status_insiden: {
      type: DataTypes.ENUM("none", "dilaporkan", "selesai"),
      allowNull: false,
      defaultValue: "none",
      validate: {
        isIn: {
          args: [["none", "dilaporkan", "selesai"]],
          msg: "Status insiden tidak valid",
        },
      },
    },
    catatan_insiden: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 1000],
          msg: "Catatan insiden maksimal 1000 karakter",
        },
      },
    },
    status_pembayaran_denda: {
      type: DataTypes.ENUM(
        "belum_bayar",
        "menunggu_verifikasi",
        "lunas",
        "ditolak",
      ),
      allowNull: false,
      defaultValue: "belum_bayar",
      validate: {
        isIn: {
          args: [["belum_bayar", "menunggu_verifikasi", "lunas", "ditolak"]],
          msg: "Status pembayaran denda tidak valid",
        },
      },
    },
    bukti_pembayaran: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: {
          args: [0, 255],
          msg: "Path bukti pembayaran maksimal 255 karakter",
        },
      },
    },
    tanggal_pembayaran_denda: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: "Tanggal pembayaran denda harus berupa tanggal valid",
        },
      },
    },
    catatan_verifikasi_denda: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 1000],
          msg: "Catatan verifikasi denda maksimal 1000 karakter",
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
      {
        fields: ["status_pembayaran_denda"],
      },
      // Compound indexes for better query performance
      {
        fields: ["user_id", "created_at"],
        name: "idx_user_created",
      },
      {
        fields: ["status", "created_at"],
        name: "idx_status_created",
      },
    ],
    validate: {
      tanggalLogic() {
        if (this.tanggal_pinjam && this.tanggal_kembali) {
          const pinjam = new Date(this.tanggal_pinjam);
          const kembali = new Date(this.tanggal_kembali);

          if (pinjam > kembali) {
            throw new Error(
              "Tanggal kembali harus sama dengan atau lebih besar dari tanggal pinjam",
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
  today.setHours(0, 0, 0, 0);
  const kembali = new Date(this.tanggal_kembali);
  kembali.setHours(0, 0, 0, 0);
  return today > kembali;
};

Peminjaman.prototype.getDaysOverdue = function () {
  if (!this.isOverdue()) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const kembali = new Date(this.tanggal_kembali);
  kembali.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - kembali.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Peminjaman.prototype.calculateOverdueFine = function () {
  if (this.status === "dikembalikan") {
    const storedFine = Number(this.denda_terlambat || 0);
    return Number.isFinite(storedFine) && storedFine > 0 ? storedFine : 0;
  }
  const daysOverdue = this.getDaysOverdue();
  return daysOverdue * appConfig.fines.overduePerDay;
};

Peminjaman.prototype.calculateIncidentFine = function () {
  const incidentFine = Number(this.denda_insiden || 0);
  if (!Number.isFinite(incidentFine) || incidentFine < 0) {
    return 0;
  }
  return incidentFine;
};

Peminjaman.prototype.calculateFine = function () {
  return this.calculateOverdueFine() + this.calculateIncidentFine();
};

Peminjaman.prototype.toJSON = function () {
  const values = { ...this.get() };
  // Add computed properties
  values.is_overdue = this.isOverdue();
  values.days_overdue = this.getDaysOverdue();
  values.overdue_fine_amount = this.calculateOverdueFine();
  values.incident_fine_amount = this.calculateIncidentFine();
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
