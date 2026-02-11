const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../../public/uploads/alat");

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureUploadDir();
      cb(null, uploadDir);
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

const fileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }
  return cb(new Error("Hanya file gambar yang diperbolehkan"));
};

const uploadAlatImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
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

      if (req.accepts("html")) {
        if (typeof req.flash === "function") {
          req.flash("error", message);
        }
        return res.redirect(req.get("Referrer") || "/admin/alat");
      }

      return res.status(400).json({
        error: "UPLOAD_ERROR",
        message,
      });
    });
  },
};
