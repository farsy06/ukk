const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { sendWebOrJson } = require("./responseHelpers");

const alatUploadDir = path.join(__dirname, "../../public/uploads/alat");
const paymentProofUploadDir = path.join(
  __dirname,
  "../../public/uploads/pembayaran",
);

const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const alatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureUploadDir(alatUploadDir);
      cb(null, alatUploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
      ? ext
      : ".jpg";
    const uniqueName = `alat-${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${safeExt}`;
    cb(null, uniqueName);
  },
});

const imageFileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }
  return cb(new Error("Hanya file gambar yang diperbolehkan"));
};

const uploadAlatImage = multer({
  storage: alatStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

const paymentProofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureUploadDir(paymentProofUploadDir);
      cb(null, paymentProofUploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
    const safeExt = allowedExt.includes(ext) ? ext : ".jpg";
    const uniqueName = `payment-${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${safeExt}`;
    cb(null, uniqueName);
  },
});

const paymentProofFilter = (_req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (file.mimetype && allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error("Bukti pembayaran harus berupa JPG, PNG, WEBP, atau PDF"),
  );
};

const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  fileFilter: paymentProofFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

module.exports = {
  uploadAlatImage,
  uploadAlatImageSingle: (req, res, next) => {
    uploadAlatImage.single("foto")(req, res, (err) => {
      if (!err) return next();

      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Ukuran foto maksimal 2MB"
          : err.message || "Upload foto gagal";

      return sendWebOrJson({
        req,
        res,
        status: 400,
        web: {
          mode: "redirect",
          type: "error",
          message,
          fallback: "/admin/alat",
        },
        api: {
          error: "UPLOAD_ERROR",
          message,
        },
      });
    });
  },
  uploadPaymentProofSingle: (req, res, next) => {
    uploadPaymentProof.single("bukti_pembayaran")(req, res, (err) => {
      if (!err) return next();

      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Ukuran bukti pembayaran maksimal 3MB"
          : err.message || "Upload bukti pembayaran gagal";

      return sendWebOrJson({
        req,
        res,
        status: 400,
        web: {
          mode: "redirect",
          type: "error",
          message,
          fallback: "/peminjaman",
        },
        api: {
          error: "UPLOAD_ERROR",
          message,
        },
      });
    });
  },
};
