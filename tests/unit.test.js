const { ROLES } = require("../src/utils/constants");
const bcrypt = require("bcrypt");

describe("Unit Tests", () => {
  describe("Constants", () => {
    test("ROLES should have correct values", () => {
      expect(ROLES.ADMIN).toBe("admin");
      expect(ROLES.PETUGAS).toBe("petugas");
      expect(ROLES.PEMINJAM).toBe("peminjam");
    });
  });

  describe("Password Hashing", () => {
    test("bcrypt should hash password correctly", async () => {
      const password = "TestPassword123!";
      const hashedPassword = await bcrypt.hash(password, 10);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    test("bcrypt should compare password correctly", async () => {
      const password = "TestPassword123!";
      const hashedPassword = await bcrypt.hash(password, 10);

      const isMatch = await bcrypt.compare(password, hashedPassword);
      expect(isMatch).toBe(true);

      const isWrongMatch = await bcrypt.compare(
        "wrongpassword",
        hashedPassword,
      );
      expect(isWrongMatch).toBe(false);
    });
  });

  describe("Helper Functions", () => {
    test("should validate email format", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test("test@example.com")).toBe(true);
      expect(emailRegex.test("invalid-email")).toBe(false);
      expect(emailRegex.test("test@")).toBe(false);
      expect(emailRegex.test("@example.com")).toBe(false);
    });

    test("should validate password length", () => {
      const appConfig = require("../src/config/appConfig");
      expect(appConfig.password.minLength).toBe(8);
    });
  });

  describe("Database Models", () => {
    test("should define User model structure", () => {
      const User = require("../src/models/User");

      expect(User).toBeDefined();
      expect(typeof User).toBe("function");
    });

    test("should define Alat model structure", () => {
      const Alat = require("../src/models/Alat");

      expect(Alat).toBeDefined();
      expect(typeof Alat).toBe("function");
    });

    test("should define Kategori model structure", () => {
      const Kategori = require("../src/models/Kategori");

      expect(Kategori).toBeDefined();
      expect(typeof Kategori).toBe("function");
    });

    test("should define Peminjaman model structure", () => {
      const Peminjaman = require("../src/models/Peminjaman");

      expect(Peminjaman).toBeDefined();
      expect(typeof Peminjaman).toBe("function");
    });

    test("should define LogAktivitas model structure", () => {
      const LogAktivitas = require("../src/models/LogAktivitas");

      expect(LogAktivitas).toBeDefined();
      expect(typeof LogAktivitas).toBe("function");
    });
  });

  describe("Middleware Functions", () => {
    test("should define auth middleware functions", () => {
      const auth = require("../src/middleware/auth");

      expect(auth).toBeDefined();
      expect(typeof auth.isAuthenticated).toBe("function");
      expect(typeof auth.checkRole).toBe("function");
      expect(typeof auth.isAdmin).toBe("function");
      expect(typeof auth.isPetugas).toBe("function");
      expect(typeof auth.isPeminjam).toBe("function");
    });

    test("should define caching middleware functions", () => {
      const caching = require("../src/middleware/caching");

      expect(caching).toBeDefined();
      expect(typeof caching.cacheHelper).toBe("object");
      expect(typeof caching.cacheHelper.get).toBe("function");
      expect(typeof caching.cacheHelper.set).toBe("function");
      expect(typeof caching.cacheHelper.del).toBe("function");
    });

    test("should define security middleware functions", () => {
      const security = require("../src/middleware/security");

      expect(security).toBeDefined();
      expect(typeof security.generalLimiter).toBe("function");
      expect(typeof security.sanitizeInput).toBe("function");
      expect(typeof security.securityHeaders).toBe("function");
    });

    test("should define validation middleware functions", () => {
      const validation = require("../src/middleware/validation");

      expect(validation).toBeDefined();
      expect(typeof validation.validateRequired).toBe("function");
      expect(typeof validation.validateAlatStatus).toBe("function");
      expect(typeof validation.validatePeminjamanStatus).toBe("function");
    });
  });

  describe("Controller Functions", () => {
    test("should define home controller functions", () => {
      const homeController = require("../src/controllers/homeController");

      expect(homeController).toBeDefined();
      expect(typeof homeController.index).toBe("function");
    });

    test("should define user controller functions", () => {
      const userController = require("../src/controllers/userController");

      expect(userController).toBeDefined();
      expect(typeof userController.register).toBe("function");
      expect(typeof userController.login).toBe("function");
      expect(typeof userController.logout).toBe("function");
    });

    test("should define alat controller functions", () => {
      const alatController = require("../src/controllers/alatController");

      expect(alatController).toBeDefined();
      expect(typeof alatController.index).toBe("function");
      expect(typeof alatController.create).toBe("function");
      expect(typeof alatController.create).toBe("function");
      expect(typeof alatController.showEdit).toBe("function");
      expect(typeof alatController.update).toBe("function");
      expect(typeof alatController.destroy).toBe("function");
    });

    test("should define kategori controller functions", () => {
      const kategoriController = require("../src/controllers/kategoriController");

      expect(kategoriController).toBeDefined();
      expect(typeof kategoriController.index).toBe("function");
      expect(typeof kategoriController.create).toBe("function");
      expect(typeof kategoriController.create).toBe("function");
      expect(typeof kategoriController.showEdit).toBe("function");
      expect(typeof kategoriController.update).toBe("function");
      expect(typeof kategoriController.destroy).toBe("function");
    });

    test("should define peminjaman controller functions", () => {
      const peminjamanController = require("../src/controllers/transaksiController");

      expect(peminjamanController).toBeDefined();
      expect(typeof peminjamanController.userIndex).toBe("function");
      expect(typeof peminjamanController.create).toBe("function");
      expect(typeof peminjamanController.create).toBe("function");
      expect(typeof peminjamanController.approve).toBe("function");
      expect(typeof peminjamanController.reject).toBe("function");
      expect(typeof peminjamanController.returnItem).toBe("function");
    });

    test("should define admin controller functions", () => {
      const adminController = require("../src/controllers/adminController");

      expect(adminController).toBeDefined();
      expect(typeof adminController.dashboard).toBe("function");
      expect(typeof adminController.userIndex).toBe("function");
      expect(typeof adminController.showCreateUser).toBe("function");
      expect(typeof adminController.createUser).toBe("function");
      expect(typeof adminController.destroyUser).toBe("function");
      expect(typeof adminController.logIndex).toBe("function");
    });
  });

  describe("Route Definitions", () => {
    test("should define web routes", () => {
      const webRoutes = require("../src/routes/web");

      expect(webRoutes).toBeDefined();
    });
  });

  describe("Configuration", () => {
    test("should define app configuration", () => {
      const appConfig = require("../src/config/appConfig");

      expect(appConfig).toBeDefined();
      expect(typeof appConfig.app.port).toBe("number");
      expect(typeof appConfig.app.environment).toBe("string");
      expect(typeof appConfig.app.baseUrl).toBe("string");
    });

    test("should define database configuration", () => {
      const dbConfig = require("../src/config/database");

      expect(dbConfig).toBeDefined();
      expect(typeof dbConfig.sequelize).toBe("object");
      expect(typeof dbConfig.testConnection).toBe("function");
    });

    test("should define logging configuration", () => {
      const logger = require("../src/config/logging");

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
    });
  });
});
