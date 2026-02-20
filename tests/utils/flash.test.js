const {
  pushFlash,
  buildAlerts,
  attachFlashHelpers,
} = require("../../src/utils/flash");

const createMockFlashReq = () => {
  const store = {
    success: [],
    error: [],
    info: [],
    warning: [],
  };

  return {
    session: {},
    flash(type, message) {
      if (!Object.prototype.hasOwnProperty.call(store, type)) {
        store[type] = [];
      }

      if (arguments.length > 1) {
        store[type].push(message);
        return store[type];
      }

      const values = [...store[type]];
      store[type] = [];
      return values;
    },
  };
};

describe("utils/flash", () => {
  describe("pushFlash", () => {
    test("stores valid flash messages for supported types", () => {
      const req = createMockFlashReq();
      pushFlash(req, "success", "Saved");

      const values = req.flash("success");
      expect(values).toEqual(["Saved"]);
    });

    test("ignores unsupported types and unsafe payload values", () => {
      const req = createMockFlashReq();

      pushFlash(req, "unknown", "Nope");
      pushFlash(req, "error", { nested: "object" });
      pushFlash(req, "error", [1, true, null, undefined, { a: 1 }, "ok"]);

      expect(req.flash("unknown")).toEqual([]);
      expect(req.flash("error")).toEqual(["1", "true", "ok"]);
    });
  });

  describe("buildAlerts", () => {
    test("returns grouped and flat alerts with icon/class metadata", () => {
      const req = createMockFlashReq();
      pushFlash(req, "success", "Done");
      pushFlash(req, "warning", "Check this");

      const result = buildAlerts(req);

      expect(result.grouped.success).toEqual(["Done"]);
      expect(result.grouped.warning).toEqual(["Check this"]);
      expect(result.alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "success",
            text: "Done",
            icon: expect.any(String),
            className: expect.any(String),
          }),
          expect.objectContaining({
            type: "warning",
            text: "Check this",
            icon: expect.any(String),
            className: expect.any(String),
          }),
        ]),
      );
    });
  });

  describe("attachFlashHelpers", () => {
    test("attaches flash helper methods on req", () => {
      const req = createMockFlashReq();
      const res = {};
      const next = jest.fn();

      attachFlashHelpers(req, res, next);
      req.flashSuccess("ok");
      req.flashError("err");

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.flash("success")).toEqual(["ok"]);
      expect(req.flash("error")).toEqual(["err"]);
    });
  });
});
