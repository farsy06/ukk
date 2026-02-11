const userService = require("../services/userService");
const User = require("../models/User");
const logger = require("../config/logging");
const { ROLES } = require("../utils/constants");
const appConfig = require("../config/appConfig");

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
    error: res.locals.error,
    success: res.locals.success,
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
    req.flash("success", "Registrasi berhasil, silakan login");

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
      req.flash("error", messages);
      req.flash("data", formData);
    } else if (error.name === "SequelizeUniqueConstraintError") {
      // Handle unique constraint violations
      const fields = error.fields || [];
      if (fields.includes("username")) {
        req.flash("error", "Username sudah digunakan");
      } else if (fields.includes("email")) {
        req.flash("error", "Email sudah digunakan");
      } else {
        req.flash("error", "Data sudah ada");
      }
      req.flash("data", formData);
    } else {
      // Generic error
      req.flash("error", "Terjadi kesalahan saat pendaftaran");
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
    error: res.locals.error,
    success: res.locals.success,
    message: req.query.message,
  });
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

  // Find user by username
  const user = await User.findOne({ where: { username } });
  if (!user) {
    logger.warn(`Login failed: user ${username} not found`);
    req.flash("error", "Username atau password salah");
    return res.redirect("/login");
  }

  if (!user.is_active) {
    logger.warn(`Login blocked: inactive user ${username}`);
    req.flash("error", "Akun tidak aktif");
    return res.redirect("/login");
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    logger.warn(`Login failed: invalid password for user ${username}`);
    req.flash("error", "Username atau password salah");
    return res.redirect("/login");
  }

  // Save session
  req.session.userId = user.id;
  req.session.userRole = user.role;
  logger.info(`User logged in successfully: ${user.id} (${user.role})`);

  // Update last login time
  user.last_login = new Date();

  // Handle remember me functionality
  if (rememberMe) {
    const token = user.generateRememberToken();
    res.cookie("remember_token", token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: appConfig.security.rememberMe.cookie.secure,
      sameSite: "strict",
    });
    logger.info(`Remember token generated for user ${user.id}`);
  }

  await user.save();

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
      await User.update(
        { remember_token: null, remember_expires: null },
        { where: { id: req.user.id } },
      );
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
      return res.redirect(
        `/login?message=${encodeURIComponent(logoutMessage)}`,
      );
    }

    // Invalidate cache
    cacheHelper.del("alat_user_index");

    res.redirect(`/login?message=${encodeURIComponent(logoutMessage)}`);
  });
};

module.exports = {
  showRegister,
  register,
  showLogin,
  login,
  logout,
};
