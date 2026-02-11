const express = require("express");
const request = require("supertest");
const session = require("express-session");

jest.mock("../../src/config/logging", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mockUserModel = {
  findByRememberToken: jest.fn(),
  findByPk: jest.fn(),
};

jest.mock("../../src/models/User", () => mockUserModel);

const buildApp = () => {
  const app = express();
  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    }),
  );

  // Inject simple test hooks for session and remember token
  app.use((req, _res, next) => {
    if (req.headers["x-user-id"]) {
      req.session.userId = Number(req.headers["x-user-id"]);
    }
    req.cookies = req.cookies || {};
    if (req.headers["x-remember-token"]) {
      req.cookies.remember_token = req.headers["x-remember-token"];
    }
    next();
  });

  const { isAuthenticated } = require("../../src/middleware/auth");
  app.get("/protected", isAuthenticated, (req, res) => {
    res.status(200).json({ ok: true, userId: req.user && req.user.id });
  });

  return app;
};

describe("Auth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("allows access with valid remember token", async () => {
    const app = buildApp();
    const user = {
      id: 10,
      role: "admin",
      generateRememberToken: jest.fn(() => "new-token"),
      save: jest.fn(),
    };
    mockUserModel.findByRememberToken.mockResolvedValue(user);

    const response = await request(app)
      .get("/protected")
      .set("x-remember-token", "old-token");

    expect(response.status).toBe(200);
    expect(mockUserModel.findByRememberToken).toHaveBeenCalledWith("old-token");
  });

  it("redirects when remember token is invalid and clears cookie", async () => {
    const app = buildApp();
    mockUserModel.findByRememberToken.mockResolvedValue(null);

    const response = await request(app)
      .get("/protected")
      .set("x-remember-token", "bad-token");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login");
    expect(response.headers["set-cookie"].join(";")).toContain(
      "remember_token=",
    );
  });

  it("redirects when session user is missing", async () => {
    const app = buildApp();
    mockUserModel.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .get("/protected")
      .set("x-user-id", "42");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login");
    expect(response.headers["set-cookie"].join(";")).toContain(
      "remember_token=",
    );
  });

  it("redirects when session user is inactive", async () => {
    const app = buildApp();
    mockUserModel.findByPk.mockResolvedValue({ id: 42, is_active: false });

    const response = await request(app)
      .get("/protected")
      .set("x-user-id", "42");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login");
    expect(response.headers["set-cookie"].join(";")).toContain(
      "remember_token=",
    );
  });

  it("allows access with active session user", async () => {
    const app = buildApp();
    mockUserModel.findByPk.mockResolvedValue({ id: 42, is_active: true });

    const response = await request(app)
      .get("/protected")
      .set("x-user-id", "42");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, userId: 42 });
  });
});
