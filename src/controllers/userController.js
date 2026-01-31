const User = require("../models/User");
const logger = require("../config/logging");
const {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROLES,
} = require("../utils/constants");

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
  const { nama, username, email, password, confirmPassword } = req.body;
  logger.info(`Registration attempt for username: ${username}`);

  // Validate password strength
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password minimal ${minLength} karakter`);
  }

  if (!hasUpperCase) {
    errors.push("Password harus mengandung huruf besar (A-Z)");
  }

  if (!hasLowerCase) {
    errors.push("Password harus mengandung huruf kecil (a-z)");
  }

  if (!hasNumbers) {
    errors.push("Password harus mengandung angka (0-9)");
  }

  if (!hasSpecialChar) {
    errors.push("Password harus mengandung karakter spesial (!@#$%^&*)");
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    errors.push("Password dan konfirmasi password tidak sesuai");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Format email tidak valid");
  }

  if (errors.length > 0) {
    logger.warn(`Registration failed: validation errors for user ${username}`);
    req.flash("error", errors);
    req.flash("data", { nama, username, email }); // Preserve form data
    return res.redirect("/register");
  }

  try {
    // Check if username already exists
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      logger.warn(`Registration failed: username ${username} already exists`);
      req.flash("error", ERROR_MESSAGES.VALIDATION.USERNAME_TAKEN);
      req.flash("data", { nama, username, email }); // Preserve form data
      return res.redirect("/register");
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      logger.warn(`Registration failed: email ${email} already exists`);
      req.flash("error", ERROR_MESSAGES.VALIDATION.EMAIL_TAKEN);
      req.flash("data", { nama, username, email }); // Preserve form data
      return res.redirect("/register");
    }

    // Create new user
    const newUser = await User.create({
      nama,
      username,
      email,
      password,
      role: ROLES.PEMINJAM, // Default role for registration
    });

    logger.info(`User registered successfully: ${newUser.id}`);
    req.flash("success", SUCCESS_MESSAGES.REGISTRATION);

    // Invalidate cache
    cacheHelper.del("alat_user_index");

    res.redirect("/login");
  } catch (error) {
    logger.error("Registration failed:", error);
    req.flash("error", "Terjadi kesalahan saat pendaftaran");
    req.flash("data", { nama, username, email }); // Preserve form data
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
  });
};

/**
 * Process user login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect or rendered view with errors
 */
const login = async (req, res) => {
  const { username, password } = req.body;
  logger.info(`Login attempt for username: ${username}`);

  // Find user by username
  const user = await User.findOne({ where: { username } });
  if (!user) {
    logger.warn(`Login failed: user ${username} not found`);
    req.flash("error", ERROR_MESSAGES.AUTHENTICATION.INVALID_CREDENTIALS);
    return res.redirect("/login");
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    logger.warn(`Login failed: invalid password for user ${username}`);
    req.flash("error", ERROR_MESSAGES.AUTHENTICATION.INVALID_CREDENTIALS);
    return res.redirect("/login");
  }

  // Save session
  req.session.userId = user.id;
  req.session.userRole = user.role;
  logger.info(`User logged in successfully: ${user.id} (${user.role})`);

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
const logout = (req, res) => {
  const userId = req.user ? req.user.id : "anonymous";
  logger.info(`User logged out: ${userId}`);

  // Set flash message before destroying session
  req.flash("success", SUCCESS_MESSAGES.LOGOUT);

  req.session.destroy((err) => {
    if (err) {
      logger.error("Session destruction error:", err);
      // Handle the error gracefully without throwing
      return res.redirect("/login");
    }

    // Invalidate cache
    cacheHelper.del("alat_user_index");

    res.redirect("/login");
  });
};

module.exports = {
  showRegister,
  register,
  showLogin,
  login,
  logout,
};
