// Load only test environment variables
require("dotenv").config({
  path: "./.env.test.local",
  override: true, // Override any existing environment variables
});
process.env.NODE_ENV = "test";

const appConfig = require("../src/config/appConfig");
const constants = require("../src/utils/constants");

// Test configuration
const testConfig = {
  ...appConfig,
  constants,
  app: {
    ...appConfig.app,
    port: 3001,
    environment: "test",
    baseUrl: "http://localhost:3001",
  },
  session: {
    ...appConfig.session,
    secret: "test-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      ...appConfig.session.cookie,
      secure: true,
    },
  },
  database: {
    ...appConfig.database,
    database: "ukk_test",
    logging: false,
  },
};

module.exports = testConfig;
