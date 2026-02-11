const { Op } = require("sequelize");

const mockUserModel = function UserModel() {};
mockUserModel.prototype = {};
mockUserModel.findAll = jest.fn();
mockUserModel.findByPk = jest.fn();

jest.mock("../../src/config/database", () => ({
  sequelize: {
    define: jest.fn(() => mockUserModel),
  },
}));

describe("User model security", () => {
  let User;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    User = require("../../src/models/User");
  });

  it("toJSON returns an allowlisted view", () => {
    const now = new Date();
    const instance = {
      get: () => ({
        id: 1,
        nama: "Test User",
        username: "testuser",
        email: "test@example.com",
        role: "peminjam",
        is_active: true,
        last_login: now,
        created_at: now,
        updated_at: now,
        password: "hash",
        remember_token: "tokenhash",
        remember_expires: now,
      }),
    };

    const json = User.prototype.toJSON.call(instance);

    expect(json).toEqual({
      id: 1,
      nama: "Test User",
      username: "testuser",
      email: "test@example.com",
      role: "peminjam",
      is_active: true,
      last_login: now,
      created_at: now,
      updated_at: now,
    });
  });

  it("findByRememberToken returns sanitized user", async () => {
    const token = "plain-token";
    const fullUser = {
      id: 123,
      validateRememberToken: jest.fn(() => true),
    };
    const safeUser = { id: 123, email: "safe@example.com" };

    User.findAll.mockResolvedValue([{ id: 123 }]);
    User.findByPk
      .mockResolvedValueOnce(fullUser)
      .mockResolvedValueOnce(safeUser);

    const result = await User.findByRememberToken(token);

    expect(result).toBe(safeUser);
    expect(User.findAll).toHaveBeenCalledWith({
      where: {
        remember_expires: { [Op.gt]: expect.any(Date) },
        is_active: true,
      },
      attributes: {
        exclude: ["password", "remember_token", "remember_expires"],
      },
    });
    expect(User.findByPk).toHaveBeenCalledWith(123);
    expect(User.findByPk).toHaveBeenCalledWith(123, {
      attributes: {
        exclude: ["password", "remember_token", "remember_expires"],
      },
    });
    expect(fullUser.validateRememberToken).toHaveBeenCalledWith(token);
  });
});
