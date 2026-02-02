const userService = require("../services/userService");
const logger = require("../config/logging");

/**
 * Display admin dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered admin dashboard view
 */
const dashboard = async (req, res) => {
  try {
    logger.info(`Admin dashboard accessed by user: ${req.user.id}`);

    const stats = await userService.getDashboardStats();

    res.render("admin/dashboard", {
      title: "Dashboard Admin",
      user: req.user,
      stats,
    });
  } catch (error) {
    logger.error("Error in admin dashboard:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Display list of users for admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered user management view
 */
const userIndex = async (req, res) => {
  try {
    logger.info(`User list accessed by admin: ${req.user.id}`);

    const users = await userService.getAllUsers();

    res.render("admin/user/index", {
      title: "Kelola User",
      users,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in admin user index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Display form to add new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered user creation form
 */
const showCreateUser = (req, res) => {
  try {
    logger.info(`Create user form accessed by admin: ${req.user.id}`);
    res.render("admin/user/create", {
      title: "Tambah User",
      error: null,
    });
  } catch (error) {
    logger.error("Error displaying create user form:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Process creation of new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect or rendered view with errors
 */
const createUser = async (req, res) => {
  try {
    const { nama, username, email, password, role } = req.body;
    logger.info(`Admin ${req.user.id} attempting to create user: ${username}`);

    const newUser = await userService.create(
      { nama, username, email, password, role },
      req.user,
    );

    logger.info(
      `Admin ${req.user.id} successfully created user: ${newUser.id}`,
    );
    req.flash("success", "User berhasil ditambahkan");

    res.redirect("/admin/user");
  } catch (error) {
    logger.error("Error in create user:", error);
    res.status(400).render("admin/user/create", {
      title: "Tambah User",
      error: error.message,
    });
  }
};

/**
 * Delete user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Redirect or error response
 */
const destroyUser = async (req, res) => {
  try {
    const userId = req.params.id;
    logger.info(`Admin ${req.user.id} attempting to delete user: ${userId}`);

    await userService.delete(userId, req.user);

    logger.info(`Admin ${req.user.id} successfully deleted user: ${userId}`);
    req.flash("success", "User berhasil dihapus");

    res.redirect("/admin/user");
  } catch (error) {
    logger.error("Error in delete user:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

/**
 * Display activity logs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Rendered log view
 */
const logIndex = async (req, res) => {
  try {
    logger.info(`Admin ${req.user.id} accessing activity logs`);

    const logs = await userService.getActivityLogs();

    res.render("admin/log/index", {
      title: "Log Aktivitas",
      logs,
      user: req.user,
    });
  } catch (error) {
    logger.error("Error in log index:", error);
    res.status(500).send("Terjadi kesalahan");
  }
};

module.exports = {
  dashboard,
  userIndex,
  showCreateUser,
  createUser,
  destroyUser,
  logIndex,
};
