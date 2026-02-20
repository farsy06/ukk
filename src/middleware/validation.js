const logger = require("../config/logging");
const { ValidationError } = require("../utils/helpers");
const appConfig = require("../config/appConfig");
const { ROLES } = require("../utils/constants");
const validator = require("validator");

const isMissingValue = (value) =>
  value === undefined || value === null || value === "";

const parseDateValue = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const createEnumValidator = ({
  field,
  values,
  messagePrefix,
  logLabel,
  normalizeValue = (value) => value,
}) => {
  return () => {
    return (req, res, next) => {
      const rawValue = req.body[field];
      if (isMissingValue(rawValue)) return next();

      const value = normalizeValue(rawValue);
      if (!values.includes(value)) {
        logger.warn(`Validation failed: invalid ${logLabel} ${value}`);
        throw new ValidationError(
          `${messagePrefix}. Pilih salah satu: ${values.join(", ")}`,
          field,
        );
      }

      return next();
    };
  };
};

/**
 * Validation middleware untuk field yang wajib diisi
 * @param {Array} fields - Array field yang wajib diisi
 * @returns {Function} - Express middleware function
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = fields.filter((field) => {
      const value = req.body[field];
      return isMissingValue(value);
    });

    if (missing.length > 0) {
      logger.warn(
        `Validation failed: missing required fields - ${missing.join(", ")}`,
      );
      throw new ValidationError(`Field ${missing.join(", ")} harus diisi`);
    }
    next();
  };
};

/**
 * Validation middleware untuk email format
 * @param {string} field - Field name
 * @returns {Function} - Express middleware function
 */
const validateEmail = (field = "email") => {
  return (req, res, next) => {
    const email = req.body[field];
    if (!email) return next();

    const trimmedEmail =
      typeof email === "string" ? email.trim() : String(email);
    const isValidEmail = validator.isEmail(trimmedEmail, {
      allow_display_name: false,
      require_display_name: false,
      allow_utf8_local_part: true,
    });

    if (!isValidEmail) {
      logger.warn(`Validation failed: invalid email format for field ${field}`);
      throw new ValidationError(
        `Format email tidak valid untuk field ${field}`,
        field,
      );
    }
    next();
  };
};

/**
 * Validation middleware untuk password strength
 * @param {string} field - Field name
 * @returns {Function} - Express middleware function
 */
const validatePassword = (field = "password") => {
  return (req, res, next) => {
    const password = req.body[field];
    if (!password) return next();

    const minLength = appConfig.password.minLength;
    const hasUpperCase = appConfig.password.requireUppercase
      ? /[A-Z]/.test(password)
      : true;
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = appConfig.password.requireNumber
      ? /\d/.test(password)
      : true;
    const hasSpecialChar = appConfig.password.requireSpecialChar
      ? /[!@#$%^&*(),.?":{}|<>]/.test(password)
      : true;

    const errors = [];
    if (password.length < minLength) {
      errors.push(`Password minimal ${minLength} karakter`);
    }
    if (password.length > appConfig.password.maxLength) {
      errors.push(`Password maksimal ${appConfig.password.maxLength} karakter`);
    }
    if (!hasUpperCase) {
      errors.push("Password harus mengandung huruf kapital");
    }
    if (!hasLowerCase) {
      errors.push("Password harus mengandung huruf kecil");
    }
    if (!hasNumbers) {
      errors.push("Password harus mengandung angka");
    }
    if (!hasSpecialChar) {
      errors.push("Password harus mengandung karakter spesial");
    }

    if (errors.length > 0) {
      logger.warn(
        `Validation failed: password not strong enough for field ${field}`,
      );
      throw new ValidationError(
        `Password tidak memenuhi syarat: ${errors.join(", ")}`,
        field,
      );
    }
    next();
  };
};

/**
 * Validation middleware untuk password confirmation
 * @param {string} passwordField - Field name for password
 * @param {string} confirmPasswordField - Field name for confirm password
 * @returns {Function} - Express middleware function
 */
const validatePasswordMatch = (
  passwordField = "password",
  confirmPasswordField = "confirmPassword",
) => {
  return (req, res, next) => {
    const password = req.body[passwordField];
    const confirmPassword = req.body[confirmPasswordField];

    if (!password || !confirmPassword) return next();

    if (password !== confirmPassword) {
      logger.warn(`Validation failed: password confirmation mismatch`);
      throw new ValidationError(
        "Password dan konfirmasi password tidak sesuai",
        confirmPasswordField,
      );
    }
    next();
  };
};

/**
 * Validation middleware untuk role user
 * @param {Array} validRoles - Array role yang valid
 * @returns {Function} - Express middleware function
 */
const validateRole = (
  validRoles = [ROLES.ADMIN, ROLES.PETUGAS, ROLES.PEMINJAM],
) => {
  return (req, res, next) => {
    const role = req.body.role;
    if (isMissingValue(role)) return next();

    if (!validRoles.includes(role)) {
      logger.warn(`Validation failed: invalid role ${role}`);
      throw new ValidationError(
        `Role tidak valid. Pilih salah satu: ${validRoles.join(", ")}`,
        "role",
      );
    }
    next();
  };
};

/**
 * Validation middleware untuk status alat
 * @returns {Function} - Express middleware function
 */
const validateAlatStatus = createEnumValidator({
  field: "status",
  values: ["tersedia", "dipinjam", "maintenance"],
  messagePrefix: "Status alat tidak valid",
  logLabel: "alat status",
});

/**
 * Validation middleware untuk kondisi alat
 * @returns {Function} - Express middleware function
 */
const validateAlatKondisi = createEnumValidator({
  field: "kondisi",
  values: ["baik", "rusak_ringan", "rusak_berat"],
  messagePrefix: "Kondisi alat tidak valid",
  logLabel: "alat kondisi",
});

/**
 * Validation middleware untuk status peminjaman
 * @returns {Function} - Express middleware function
 */
const validatePeminjamanStatus = createEnumValidator({
  field: "status",
  values: ["pending", "disetujui", "dipinjam", "dikembalikan", "ditolak"],
  messagePrefix: "Status peminjaman tidak valid",
  logLabel: "peminjaman status",
});

/**
 * Validation middleware untuk tanggal peminjaman
 * @returns {Function} - Express middleware function
 */
const validateTanggalPeminjaman = () => {
  return (req, res, next) => {
    const tanggalPinjam = req.body.tanggal_pinjam;
    const tanggalKembali = req.body.tanggal_kembali;

    if (isMissingValue(tanggalPinjam) || isMissingValue(tanggalKembali)) {
      return next();
    }

    const pinjam = parseDateValue(tanggalPinjam);
    const kembali = parseDateValue(tanggalKembali);

    if (!pinjam || !kembali) {
      logger.warn(`Validation failed: invalid date format`);
      throw new ValidationError("Format tanggal tidak valid", "tanggal_pinjam");
    }

    if (pinjam > kembali) {
      logger.warn(
        `Validation failed: tanggal kembali harus setelah tanggal pinjam`,
      );
      throw new ValidationError(
        "Tanggal kembali harus sama dengan atau setelah tanggal pinjam",
        "tanggal_kembali",
      );
    }

    // Cek apakah tanggal pinjam minimal hari ini
    const today = startOfDay(new Date());
    const pinjamDate = startOfDay(pinjam);

    if (pinjamDate < today) {
      logger.warn(
        `Validation failed: tanggal pinjam tidak boleh sebelum hari ini`,
      );
      throw new ValidationError(
        "Tanggal pinjam tidak boleh sebelum hari ini",
        "tanggal_pinjam",
      );
    }

    next();
  };
};

/**
 * Validation middleware untuk jumlah peminjaman
 * @returns {Function} - Express middleware function
 */
const validateJumlahPeminjaman = () => {
  return (req, res, next) => {
    const jumlah = req.body.jumlah;
    if (isMissingValue(jumlah)) return next();

    const parsed = Number.parseInt(jumlah, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      logger.warn(`Validation failed: invalid jumlah peminjaman`);
      throw new ValidationError("Jumlah peminjaman harus minimal 1", "jumlah");
    }

    next();
  };
};

module.exports = {
  validateRequired,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRole,
  validateAlatStatus,
  validateAlatKondisi,
  validatePeminjamanStatus,
  validateTanggalPeminjaman,
  validateJumlahPeminjaman,
};
