const { sequelize } = require("../src/config/database");
const User = require("../src/models/User");
const { Op } = require("sequelize");
const readline = require("readline");
const prompt = require("prompt-sync")({ sigint: true });

/* =======================
  READLINE SETUP
======================= */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));

const askPassword = (question) =>
  new Promise((resolve) => {
    const password = prompt(question, { echo: "*" });
    resolve(password.trim());
  });

/* =======================
  VALIDATION HELPERS
======================= */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidUsername = (username) => /^[a-zA-Z0-9_-]{3,20}$/.test(username);

const isValidPassword = (password) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  /[!@#$%^&*(),.?":{}|<>]/.test(password);

/* =======================
  MAIN FUNCTION
======================= */
async function createAdminAccount() {
  try {
    console.log("\n=== CREATE ADMIN ACCOUNT ===\n");

    await sequelize.authenticate();
    console.log("Database connected\n");

    /* ===== INPUT ===== */
    const nama = await ask("Nama Lengkap: ");
    if (!nama) throw new Error("Nama tidak boleh kosong");

    const username = await ask("Username: ");
    if (!isValidUsername(username))
      throw new Error(
        "Username tidak valid (3–20 karakter, alfanumerik, _ atau -)",
      );

    const email = await ask("Email: ");
    if (!isValidEmail(email)) throw new Error("Email tidak valid");

    const password = await askPassword(
      "Password (min 8 karakter, huruf besar, huruf kecil, angka, spesial): ",
    );
    if (!isValidPassword(password))
      throw new Error(
        "Password minimal 8 karakter dan harus mengandung huruf besar, huruf kecil, angka, dan karakter spesial",
      );

    const confirmPassword = await askPassword("Konfirmasi Password: ");
    if (password !== confirmPassword) throw new Error("Password tidak cocok");

    /* ===== CHECK EXISTING ADMIN ===== */
    const existingAdmin = await User.findOne({ where: { role: "admin" } });
    if (existingAdmin) {
      console.log("\nAdmin sudah ada:");
      console.log(`- Username: ${existingAdmin.username}`);
      console.log(`- Email   : ${existingAdmin.email}`);

      const cont = await ask("\nBuat admin baru? (y/n): ");
      if (cont.toLowerCase() !== "y") return;
    }

    /* ===== CHECK DUPLICATE USER ===== */
    const duplicate = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
      },
    });

    if (duplicate) {
      throw new Error(
        duplicate.username === username
          ? `Username "${username}" sudah digunakan`
          : `Email "${email}" sudah digunakan`,
      );
    }

    /* ===== RECAP ===== */
    console.log("\n=== RECAP ===");
    console.log(`Nama     : ${nama}`);
    console.log(`Username : ${username}`);
    console.log(`Email    : ${email}`);
    console.log(`Role     : admin`);
    console.log("=============");

    const confirm = await ask("Lanjutkan pembuatan akun? (y/n): ");
    if (confirm.toLowerCase() !== "y") return;

    /* ===== CREATE USER ===== */
    const admin = await User.create({
      nama,
      username,
      email,
      password: password,
      role: "admin",
      is_active: true,
    });

    console.log("\nAdmin berhasil dibuat!");
    console.log("========================");
    console.log(`ID        : ${admin.id}`);
    console.log(`Nama      : ${admin.nama}`);
    console.log(`Username  : ${admin.username}`);
    console.log(`Email     : ${admin.email}`);
    console.log(`Role      : ${admin.role}`);
    console.log(`CreatedAt : ${admin.created_at}`);
    console.log("========================\n");

    console.log("Silakan login menggunakan akun admin tersebut.");
  } catch (err) {
    if (err && err.name === "SequelizeValidationError" && err.errors) {
      const messages = err.errors
        .map((e) => {
          const field = e.path || e.param || "field";
          const msg = e.message || "invalid";
          return `${field}: ${msg}`;
        })
        .filter(Boolean);
      console.error(
        "\nGagal:",
        messages.length ? messages.join("; ") : err.message,
      );
    } else if (
      err &&
      err.name === "SequelizeUniqueConstraintError" &&
      err.errors
    ) {
      const messages = err.errors
        .map((e) => {
          const field = e.path || e.param || "field";
          const msg = e.message || "duplicate";
          return `${field}: ${msg}`;
        })
        .filter(Boolean);
      console.error(
        "\nGagal:",
        messages.length ? messages.join("; ") : err.message,
      );
    } else {
      console.error("\nGagal:", err.message);
    }
  } finally {
    rl.close();
    await sequelize.close();
  }
}

/* =======================
  RUN SCRIPT
======================= */
createAdminAccount();
