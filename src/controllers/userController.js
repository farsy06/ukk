const userService = require("../services/userService");
const logger = require("../config/logging");
const { ROLES } = require("../utils/constants");
const appConfig = require("../config/appConfig");
const { pushFlash } = require("../utils/flash");
const mailService = require("../services/mailService");

// Import cache helper
const { cacheHelper } = require("../middleware/caching");

/**
 * Display registration form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered registration view
 */
const showRegister = (req, res) => {
  logger.info("Displaying registration form");

  res.render("auth/register", {
    title: "Daftar Akun",
    data: req.flash("data")[0] || {}, // Get preserved form data
  });
};

/**
 * Process user registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect or rendered view with errors
 */
const register = async (req, res) => {
  const { nama, username, email, password } = req.body;
  logger.info(`Registration attempt for username: ${username}`);

  try {
    // Create new user - validation handled by middleware
    const newUser = await userService.create(
      {
        nama,
        username,
        email,
        password,
        role: ROLES.PEMINJAM, // Default role for registration
      },
      { id: 0, role: "SYSTEM" }, // System user for registration
    );

    logger.info(`User registered successfully: ${newUser.id}`);
    pushFlash(req, "success", "Registrasi berhasil, silakan login");

    // Invalidate cache
    cacheHelper.del("alat_user_index");

    res.redirect("/login");
  } catch (error) {
    logger.error("Registration failed:", error);

    // Preserve form data for re-population (except password fields)
    const formData = { nama, username, email };

    if (error.name === "SequelizeValidationError") {
      // Handle Sequelize validation errors
      const messages = error.errors.map((e) => e.message);
      pushFlash(req, "error", messages);
      req.flash("data", formData);
    } else if (error.name === "SequelizeUniqueConstraintError") {
      // Handle unique constraint violations
      const fields = error.fields || [];
      if (fields.includes("username")) {
        pushFlash(req, "error", "Username sudah digunakan");
      } else if (fields.includes("email")) {
        pushFlash(req, "error", "Email sudah digunakan");
      } else {
        pushFlash(req, "error", "Data sudah ada");
      }
      req.flash("data", formData);
    } else {
      // Generic error
      pushFlash(req, "error", "Terjadi kesalahan saat pendaftaran");
      req.flash("data", formData);
    }

    res.redirect("/register");
  }
};

/**
 * Display login form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered login view
 */
const showLogin = (req, res) => {
  logger.info("Displaying login form");

  res.render("auth/login", {
    title: "Login",
  });
};

/**
 * Display forgot password form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered forgot password view
 */
const showForgotPassword = (req, res) => {
  logger.info("Displaying forgot password form");

  res.render("auth/forgot-password", {
    title: "Lupa Password",
    data: req.flash("data")[0] || {},
  });
};

/**
 * Process forgot password request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect to forgot password page
 */
const requestPasswordReset = async (req, res) => {
  const identifier = String(req.body.identifier || "").trim();

  if (!identifier) {
    pushFlash(req, "error", "Username atau email harus diisi");
    req.flash("data", { identifier });
    return res.redirect("/forgot-password");
  }

  try {
    const result = await userService.requestPasswordReset(identifier);
    if (result && result.resetUrl && result.email) {
      try {
        await mailService.sendPasswordResetEmail({
          to: result.email,
          resetUrl: result.resetUrl,
          expiresMinutes: 30,
        });
      } catch (mailError) {
        logger.error("Failed to send password reset email:", mailError);
      }
    }

    pushFlash(
      req,
      "success",
      "Jika akun ditemukan, tautan reset password telah dibuat.",
    );

    // Expose reset URL only in development to support local testing without email service.
    if (process.env.NODE_ENV !== "production" && result?.resetUrl) {
      pushFlash(req, "info", `Tautan reset (dev): ${result.resetUrl}`);
    }

    return res.redirect("/forgot-password");
  } catch (error) {
    logger.error("Forgot password request failed:", error);
    pushFlash(req, "error", "Terjadi kesalahan saat memproses permintaan");
    req.flash("data", { identifier });
    return res.redirect("/forgot-password");
  }
};

/**
 * Display reset password form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered reset password view
 */
const showResetPassword = async (req, res) => {
  const token = req.params.token;
  const user = await userService.findByResetPasswordToken(token);

  if (!user) {
    pushFlash(
      req,
      "error",
      "Token reset password tidak valid atau kedaluwarsa",
    );
    return res.redirect("/forgot-password");
  }

  return res.render("auth/reset-password", {
    title: "Reset Password",
    token,
  });
};

/**
 * Process reset password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect to login page on success
 */
const resetPassword = async (req, res) => {
  const token = req.params.token;
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!password || !confirmPassword) {
    pushFlash(req, "error", "Password dan konfirmasi password harus diisi");
    return res.redirect(`/reset-password/${token}`);
  }

  if (password !== confirmPassword) {
    pushFlash(req, "error", "Password dan konfirmasi password tidak sesuai");
    return res.redirect(`/reset-password/${token}`);
  }

  try {
    const success = await userService.resetPasswordByToken(token, password);

    if (!success) {
      pushFlash(
        req,
        "error",
        "Token reset password tidak valid atau sudah kedaluwarsa",
      );
      return res.redirect("/forgot-password");
    }

    pushFlash(req, "success", "Password berhasil direset. Silakan login.");
    return res.redirect("/login");
  } catch (error) {
    logger.error("Reset password failed:", error);
    pushFlash(req, "error", error.message || "Gagal mereset password");
    return res.redirect(`/reset-password/${token}`);
  }
};

/**
 * Process user login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect or rendered view with errors
 */
const login = async (req, res) => {
  const { username, password, rememberMe } = req.body;
  logger.info(`Login attempt for username: ${username}`);

  let user;
  try {
    user = await userService.authenticate(username, password);
  } catch (error) {
    if (error.code === "ACCOUNT_INACTIVE") {
      logger.warn(`Login blocked: inactive user ${username}`);
      pushFlash(req, "error", "Akun tidak aktif");
      return res.redirect("/login");
    }

    if (error.code === "INVALID_CREDENTIALS") {
      logger.warn(`Login failed: invalid credentials for user ${username}`);
      pushFlash(req, "error", "Username atau password salah");
      return res.redirect("/login");
    }

    logger.error("Login failed:", error);
    pushFlash(req, "error", "Terjadi kesalahan saat login");
    return res.redirect("/login");
  }

  // Save session
  req.session.userId = user.id;
  req.session.userRole = user.role;
  logger.info(`User logged in successfully: ${user.id} (${user.role})`);

  // Persist login metadata and optionally issue remember-me token
  const rememberToken = await userService.recordLogin(
    user,
    Boolean(rememberMe),
  );
  if (rememberMe) {
    res.cookie("remember_token", rememberToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: appConfig.security.rememberMe.cookie.secure,
      sameSite: "strict",
    });
    logger.info(`Remember token generated for user ${user.id}`);
  }

  // Redirect based on role
  if (user.role === ROLES.ADMIN) {
    res.redirect("/admin");
  } else if (user.role === ROLES.PETUGAS) {
    res.redirect("/petugas");
  } else {
    res.redirect("/dasbor");
  }
};

/**
 * Process user logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect to login page
 */
const logout = async (req, res) => {
  const userId = req.user ? req.user.id : "anonymous";
  logger.info(`User logged out: ${userId}`);

  // Clear remember token if exists
  if (req.user) {
    try {
      await userService.clearRememberToken(req.user.id);
      logger.info(`Remember token cleared for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to clear remember token for user ${userId}:`, error);
    }
  }

  // Clear remember token cookie
  res.clearCookie("remember_token", {
    httpOnly: true,
    secure: appConfig.security.rememberMe.cookie.secure,
    sameSite: "strict",
  });

  const logoutMessage = "Berhasil logout";

  req.session.destroy((err) => {
    if (err) {
      logger.error("Session destruction error:", err);
      // Handle the error gracefully without throwing
      pushFlash(req, "info", logoutMessage);
      return res.redirect("/login");
    }

    // Invalidate cache
    cacheHelper.del("alat_user_index");

    pushFlash(req, "info", logoutMessage);
    res.redirect("/login");
  });
};

module.exports = {
  showRegister,
  register,
  showLogin,
  showForgotPassword,
  requestPasswordReset,
  showResetPassword,
  resetPassword,
  login,
  logout,
};
