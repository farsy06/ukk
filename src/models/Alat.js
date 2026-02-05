const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Alat Model
 * Represents equipment/tools available for borrowing
 */
const Alat = sequelize.define(
  "Alat",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    nama_alat: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nama alat tidak boleh kosong",
        },
        len: {
          args: [2, 100],
          msg: "Nama alat harus antara 2-100 karakter",
        },
      },
    },
    kategori_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "kategori",
        key: "id",
      },
      validate: {
        isInt: {
          msg: "Kategori ID harus berupa angka",
        },
        min: {
          args: [1],
          msg: "Kategori ID harus lebih besar dari 0",
        },
      },
    },
    kondisi: {
      type: DataTypes.ENUM("baik", "rusak_ringan", "rusak_berat"),
      allowNull: false,
      defaultValue: "baik",
      validate: {
        isIn: {
          args: [["baik", "rusak_ringan", "rusak_berat"]],
          msg: "Kondisi tidak valid",
        },
      },
    },
    status: {
      type: DataTypes.ENUM("tersedia", "dipinjam", "maintenance"),
      allowNull: false,
      defaultValue: "tersedia",
      validate: {
        isIn: {
          args: [["tersedia", "dipinjam", "maintenance"]],
          msg: "Status tidak valid",
        },
      },
    },
    stok: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isInt: {
          msg: "Stok harus berupa angka",
        },
        min: {
          args: [0],
          msg: "Stok tidak boleh kurang dari 0",
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
    foto: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: {
          msg: "Format foto tidak valid",
        },
        len: {
          args: [0, 255],
          msg: "URL foto maksimal 255 karakter",
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
    tableName: "alat",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ["kategori_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["kondisi"],
      },
      {
        fields: ["stok"],
      },
      {
        fields: ["nama_alat"],
      },
      // Compound index for queries filtering by kategori and status
      {
        fields: ["kategori_id", "status"],
        name: "idx_kategori_status",
      },
    ],
    validate: {
      stokStatusConsistency() {
        if (this.stok === 0 && this.status === "tersedia") {
          throw new Error("Alat dengan stok 0 tidak dapat berstatus tersedia");
        }
      },
      kondisiStatusLogic() {
        if (this.kondisi === "rusak_berat" && this.status === "tersedia") {
          throw new Error("Alat rusak berat tidak dapat berstatus tersedia");
        }
      },
    },
  },
);

// Instance methods
Alat.prototype.isAvailable = function () {
  return this.status === "tersedia" && this.stok > 0;
};

Alat.prototype.canBeBorrowed = function () {
  return (
    this.status === "tersedia" &&
    this.stok > 0 &&
    this.kondisi !== "rusak_berat"
  );
};

Alat.prototype.toJSON = function () {
  const values = { ...this.get() };
  // Add computed properties
  values.is_available = this.isAvailable();
  values.can_be_borrowed = this.canBeBorrowed();
  return values;
};

// Class methods
Alat.getAvailableAlat = function () {
  return this.findAll({
    where: {
      status: "tersedia",
      stok: {
        [sequelize.Op.gt]: 0,
      },
      kondisi: {
        [sequelize.Op.ne]: "rusak_berat",
      },
    },
    include: [
      {
        model: require("./Kategori"),
        as: "kategori",
      },
    ],
  });
};

Alat.getByKategori = function (kategoriId) {
  return this.findAll({
    where: { kategori_id: kategoriId },
    include: [
      {
        model: require("./Kategori"),
        as: "kategori",
      },
    ],
    order: [["nama_alat", "ASC"]],
  });
};

Alat.getByStatus = function (status) {
  return this.findAll({
    where: { status },
    include: [
      {
        model: require("./Kategori"),
        as: "kategori",
      },
    ],
  });
};

Alat.getDamagedAlat = function () {
  return this.findAll({
    where: {
      kondisi: {
        [sequelize.Op.in]: ["rusak_ringan", "rusak_berat"],
      },
    },
    include: [
      {
        model: require("./Kategori"),
        as: "kategori",
      },
    ],
  });
};

Alat.searchAlat = function (searchTerm) {
  return this.findAll({
    where: {
      [sequelize.Op.or]: [
        {
          nama_alat: {
            [sequelize.Op.iLike]: `%${searchTerm}%`,
          },
        },
        {
          deskripsi: {
            [sequelize.Op.iLike]: `%${searchTerm}%`,
          },
        },
      ],
    },
    include: [
      {
        model: require("./Kategori"),
        as: "kategori",
      },
    ],
  });
};

module.exports = Alat;
