const { pushFlash } = require("../utils/flash");

const isApiRequest = (req) =>
  String(req?.originalUrl || "").startsWith("/api/");

const isWebRequest = (req) =>
  Boolean(req?.accepts?.("html")) && !isApiRequest(req);

const redirectWithFlash = (
  req,
  res,
  { type = "error", message, fallback = "/" },
) => {
  if (message) {
    pushFlash(req, type, message);
  }
  return res.redirect(req.get("Referrer") || fallback);
};

const sendWebOrJson = ({
  req,
  res,
  status = 400,
  web = null,
  api = { success: false },
}) => {
  if (isWebRequest(req)) {
    if (web?.mode === "redirect") {
      return redirectWithFlash(req, res, {
        type: web.type || "error",
        message: web.message,
        fallback: web.fallback || "/",
      });
    }

    if (web?.mode === "render") {
      return res.status(status).render(web.view || "error", web.data || {});
    }
  }

  return res.status(status).json(api);
};

module.exports = {
  isApiRequest,
  isWebRequest,
  redirectWithFlash,
  sendWebOrJson,
};
