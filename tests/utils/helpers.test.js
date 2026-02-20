const {
  isValidPassword,
  getPagination,
  isValidEmail,
} = require("../../src/utils/helpers");

describe("utils/helpers", () => {
  describe("isValidEmail", () => {
    test("returns true for valid email and false for invalid input", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("not-an-email")).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe("isValidPassword", () => {
    test("returns false for non-string values", () => {
      expect(isValidPassword()).toBe(false);
      expect(isValidPassword(null)).toBe(false);
      expect(isValidPassword(12345678)).toBe(false);
    });

    test("returns true only for passwords meeting current policy", () => {
      expect(isValidPassword("TestPass123!")).toBe(true);
      expect(isValidPassword("testpass123!")).toBe(false);
      expect(isValidPassword("TestPass!!!!")).toBe(false);
      expect(isValidPassword("Tes1!")).toBe(false);
    });
  });

  describe("getPagination", () => {
    test("normalizes invalid page/limit values", () => {
      const pagination = getPagination("abc", "0", 25);

      expect(pagination.currentPage).toBe(1);
      expect(pagination.perPage).toBeGreaterThan(0);
      expect(pagination.totalItems).toBe(25);
      expect(pagination.totalPages).toBeGreaterThan(0);
    });

    test("clamps total below zero to zero", () => {
      const pagination = getPagination(2, 10, -50);

      expect(pagination.totalItems).toBe(0);
      expect(pagination.totalPages).toBe(0);
      expect(pagination.hasNext).toBe(false);
    });
  });
});
