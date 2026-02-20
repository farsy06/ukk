const FLASH_TYPES = Object.freeze(["success", "error", "info", "warning"]);

const FLASH_CONFIG = Object.freeze({
  success: { icon: "fas fa-check-circle", className: "alert-success" },
  error: { icon: "fas fa-exclamation-circle", className: "alert-danger" },
  info: { icon: "fas fa-info-circle", className: "alert-info" },
  warning: { icon: "fas fa-triangle-exclamation", className: "alert-warning" },
});

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "undefined" || value === null) return [];
  return [value];
};

const sanitizeMessage = (message) => {
  if (typeof message !== "string") return "";
  return message.trim().slice(0, 500);
};

const toMessageString = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
};

const canUseFlash = (req) => {
  return Boolean(req && typeof req.flash === "function" && req.session);
};

const pushFlash = (req, type, message) => {
  if (!canUseFlash(req)) return;
  if (!FLASH_TYPES.includes(type)) return;

  toArray(message).forEach((entry) => {
    const safeMessage = sanitizeMessage(toMessageString(entry));
    if (!safeMessage) return;
    try {
      req.flash(type, safeMessage);
    } catch {
      // No-op if flash storage is unavailable in this context.
    }
  });
};

const buildAlerts = (req) => {
  const grouped = {
    success: [],
    error: [],
    info: [],
    warning: [],
  };

  const alerts = [];
  if (!canUseFlash(req)) {
    return { alerts, grouped };
  }

  FLASH_TYPES.forEach((type) => {
    const rawMessages = (() => {
      try {
        return toArray(req.flash(type));
      } catch {
        return [];
      }
    })();
    const messages = rawMessages.map((m) =>
      sanitizeMessage(toMessageString(m)),
    );
    grouped[type] = messages.filter(Boolean);

    grouped[type].forEach((text) => {
      alerts.push({
        type,
        text,
        icon: FLASH_CONFIG[type].icon,
        className: FLASH_CONFIG[type].className,
      });
    });
  });

  return { alerts, grouped };
};

const attachFlashHelpers = (req, res, next) => {
  req.flashSuccess = (message) => pushFlash(req, "success", message);
  req.flashError = (message) => pushFlash(req, "error", message);
  req.flashInfo = (message) => pushFlash(req, "info", message);
  req.flashWarning = (message) => pushFlash(req, "warning", message);
  next();
};

module.exports = {
  buildAlerts,
  attachFlashHelpers,
  pushFlash,
};
