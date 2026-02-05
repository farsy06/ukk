const { DataTypes, Op } = require("sequelize");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sequelize } = require("../config/database");

/**
 * User Model
 * Represents users in the system with different roles and authentication
 */
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    nama: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Nama tidak boleh kosong",
        },
        len: {
          args: [2, 100],
          msg: "Nama harus antara 2-100 karakter",
        },
        is: {
          args: /^[a-zA-Z\s]+$/,
          msg: "Nama hanya boleh mengandung huruf dan spasi",
        },
      },
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        args: true,
        msg: "Username sudah digunakan",
      },
      validate: {
        notEmpty: {
          msg: "Username tidak boleh kosong",
        },
        len: {
          args: [3, 50],
          msg: "Username harus antara 3-50 karakter",
        },
        isAlphanumeric: {
          msg: "Username hanya boleh mengandung huruf dan angka",
        },
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        args: true,
        msg: "Email sudah digunakan",
      },
      validate: {
        notEmpty: {
          msg: "Email tidak boleh kosong",
        },
        isEmail: {
          msg: "Format email tidak valid",
        },
        len: {
          args: [5, 100],
          msg: "Email harus antara 5-100 karakter",
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Password tidak boleh kosong",
        },
        len: {
          args: [8, 255],
          msg: "Password minimal 8 karakter",
        },
      },
    },
    role: {
      type: DataTypes.ENUM("admin", "petugas", "peminjam"),
      allowNull: false,
      defaultValue: "peminjam",
      validate: {
        isIn: {
          args: [["admin", "petugas", "peminjam"]],
          msg: "Role tidak valid",
        },
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    remember_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    remember_expires: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: "users",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["username"],
      },
      {
        unique: true,
        fields: ["email"],
      },
      {
        fields: ["role"],
      },
      {
        fields: ["is_active"],
      },
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
    validate: {
      passwordStrength() {
        if (this.password) {
          const minLength = 8;
          const hasUpperCase = /[A-Z]/.test(this.password);
          const hasLowerCase = /[a-z]/.test(this.password);
          const hasNumbers = /\d/.test(this.password);
          const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(this.password);

          if (this.password.length < minLength) {
            throw new Error("Password minimal 8 karakter");
          }
          if (!hasUpperCase) {
            throw new Error("Password harus mengandung huruf besar (A-Z)");
          }
          if (!hasLowerCase) {
            throw new Error("Password harus mengandung huruf kecil (a-z)");
          }
          if (!hasNumbers) {
            throw new Error("Password harus mengandung angka (0-9)");
          }
          if (!hasSpecialChar) {
            throw new Error(
              "Password harus mengandung karakter spesial (!@#$%^&*)",
            );
          }
        }
      },
    },
  },
);

// Instance methods
User.prototype.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Generate remember me token (returns plain token, stores hashed version)
User.prototype.generateRememberToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  // Hash the token before storing (defense in depth)
  const hashedToken = bcrypt.hashSync(token, 12);
  const expires = new Date();
  expires.setDate(expires.getDate() + 30); // 30 days

  this.remember_token = hashedToken;
  this.remember_expires = expires;
  return token; // Return the plain token for the cookie
};

// Validate remember me token using bcrypt comparison
User.prototype.validateRememberToken = function (token) {
  if (!this.remember_token || !this.remember_expires) {
    return false;
  }
  if (new Date() > this.remember_expires) {
    return false;
  }
  // Use constant-time comparison via bcrypt
  return bcrypt.compareSync(token, this.remember_token);
};

// Clear remember me token
User.prototype.clearRememberToken = function () {
  this.remember_token = null;
  this.remember_expires = null;
};

// Class methods
User.findByUsername = function (username) {
  return this.findOne({
    where: { username },
    attributes: { exclude: ["password", "remember_token", "remember_expires"] },
  });
};

User.findByEmail = function (email) {
  return this.findOne({
    where: { email },
    attributes: { exclude: ["password", "remember_token", "remember_expires"] },
  });
};

User.getActiveUsers = function () {
  return this.findAll({
    where: { is_active: true },
    attributes: { exclude: ["password", "remember_token", "remember_expires"] },
  });
};

User.getUsersByRole = function (role) {
  return this.findAll({
    where: { role, is_active: true },
    attributes: { exclude: ["password", "remember_token", "remember_expires"] },
  });
};

// Updated: Finds user by token by fetching candidates with non-expired tokens
// and validating each with bcrypt (since we can't query by hashed token)
User.findByRememberToken = async function (token) {
  // Find all users with non-expired remember tokens
  const candidates = await this.findAll({
    where: {
      remember_expires: {
        [Op.gt]: new Date(),
      },
    },
    attributes: { exclude: ["password", "remember_token", "remember_expires"] },
  });

  // Validate each candidate's token using bcrypt
  for (const user of candidates) {
    // Need to fetch the full user with hashed token to validate
    const fullUser = await this.findByPk(user.id);
    if (fullUser && fullUser.validateRememberToken(token)) {
      return fullUser;
    }
  }

  return null;
};

module.exports = User;
