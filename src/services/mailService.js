const nodemailer = require("nodemailer");
const logger = require("../config/logging");
const appConfig = require("../config/appConfig");

function parseBooleanEnv(value, defaultValue = false) {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPasswordResetMessage({ resetUrl, expiresInMinutes }) {
  const escapedUrl = escapeHtml(resetUrl);
  const currentYear = new Date().getFullYear();

  return {
    subject: "Reset Password eSarpra",
    text: [
      "Permintaan reset password eSarpra",
      "",
      "Kami menerima permintaan untuk mengatur ulang password akun Anda.",
      `Tautan reset: ${resetUrl}`,
      `Masa berlaku tautan: ${expiresInMinutes} menit`,
      "",
      "Jika Anda tidak merasa meminta reset password, abaikan email ini.",
      "Demi keamanan, jangan bagikan tautan ini kepada siapa pun.",
    ].join("\n"),
    html: `<!DOCTYPE html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Reset Password eSarpra</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f1eb;font-family:Arial,Helvetica,sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f4f1eb;margin:0;padding:32px 16px;">
    <tr>
      <td align="center" valign="top">

        <!-- Email card: max 600px -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#fffdf9;border:1px solid #ddd6ca;border-radius:10px;overflow:hidden;">

          <!-- -- HEADER -- -->
          <tr>
            <td style="background-color:#1a1613;padding:0;">
              <!-- Amber top rule -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#d97706;height:4px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <!-- Brand row -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:20px 28px 18px;">
                    <!-- Icon box + wordmark -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#d97706;border-radius:6px;width:36px;height:36px;text-align:center;vertical-align:middle;" width="36" height="36">
                          <span style="font-size:12px;line-height:36px;display:block;font-weight:700;color:#1a1613;">ES</span>
                        </td>
                        <td width="12" style="font-size:0;">&nbsp;</td>
                        <td valign="middle">
                          <p style="margin:0;font-size:11px;letter-spacing:0.09em;text-transform:uppercase;color:#d97706;font-family:Arial,Helvetica,sans-serif;">eSarpra</p>
                          <p style="margin:0;font-size:17px;font-weight:700;color:#fffdf9;letter-spacing:-0.01em;font-family:Georgia,'Times New Roman',serif;line-height:1.2;">Equipment Borrowing System</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- -- HERO -- -->
          <tr>
            <td style="background-color:#221d18;padding:24px 28px 22px;">
              <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#a78965;font-family:Arial,Helvetica,sans-serif;">Keamanan Akun</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#fffdf9;line-height:1.3;letter-spacing:-0.02em;font-family:Georgia,'Times New Roman',serif;">Permintaan Reset Password</h1>
            </td>
          </tr>

          <!-- -- BODY -- -->
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 14px;font-size:14px;line-height:1.75;color:#2d241c;font-family:Arial,Helvetica,sans-serif;">
                Kami menerima permintaan untuk mengatur ulang password akun <strong>eSarpra</strong> Anda. Klik tombol di bawah untuk membuat password baru.
              </p>
            </td>
          </tr>

          <!-- -- CTA BUTTON -- -->
          <tr>
            <td style="padding:4px 28px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:6px;background-color:#d97706;">
                    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapedUrl}" style="height:46px;v-text-anchor:middle;width:200px;" arcsize="13%" strokecolor="#b45309" fillcolor="#d97706"><w:anchorlock/><center style="color:#1a1613;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;">Reset Password</center></v:roundrect><![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${escapedUrl}"
                      style="display:inline-block;padding:13px 28px;color:#1a1613;text-decoration:none;font-size:14px;font-weight:700;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.02em;border-radius:6px;background-color:#d97706;mso-hide:all;">
                      Reset Password
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- -- DIVIDER -- -->
          <tr>
            <td style="padding:0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #e8e0d5;height:1px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- -- META INFO -- -->
          <tr>
            <td style="padding:18px 28px 8px;">
              <!-- Expiry badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                <tr>
                  <td style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:5px;padding:8px 12px;">
                    <p style="margin:0;font-size:12px;color:#92400e;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
                      <strong>Masa berlaku:</strong> Tautan ini aktif selama <strong>${expiresInMinutes} menit</strong> sejak email dikirim.
                    </p>
                  </td>
                </tr>
              </table>
              <!-- Fallback URL -->
              <p style="margin:0 0 6px;font-size:12px;color:#6b5745;font-family:Arial,Helvetica,sans-serif;">Jika tombol tidak berfungsi, salin tautan berikut ke browser Anda:</p>
              <p style="margin:0 0 20px;word-break:break-all;font-size:11px;color:#1a5fa8;font-family:'Courier New',Courier,monospace;background-color:#f4f1eb;border:1px solid #ddd6ca;border-radius:5px;padding:9px 12px;line-height:1.6;">${escapedUrl}</p>
            </td>
          </tr>

          <!-- -- SECURITY NOTICE -- -->
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#f8f4ef;border-left:3px solid #d97706;border-radius:0 5px 5px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:12px;line-height:1.65;color:#5a4535;font-family:Arial,Helvetica,sans-serif;">
                      <strong>Catatan Keamanan:</strong> Jika Anda tidak meminta reset password ini, abaikan email ini; akun Anda tetap aman. Jangan bagikan tautan ini kepada siapa pun.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- -- FOOTER -- -->
          <tr>
            <td style="background-color:#f4f1eb;border-top:1px solid #ddd6ca;padding:16px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 3px;font-size:11px;color:#9b8878;font-family:Arial,Helvetica,sans-serif;">
                      &copy; ${currentYear} eSarpra - Sistem Informasi Peminjaman Alat
                    </p>
                    <p style="margin:0;font-size:10px;color:#b5a496;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.02em;">
                      Email ini dikirim secara otomatis. Mohon tidak membalas pesan ini.
                    </p>
                  </td>
                  <td align="right" valign="middle" width="32">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#d97706;border-radius:4px;width:28px;height:28px;text-align:center;vertical-align:middle;" width="28" height="28">
                          <span style="font-size:10px;line-height:28px;display:block;font-weight:700;color:#1a1613;">ES</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>`,
  };
}

class MailService {
  constructor() {
    this.transporter = null;
    this.transporterVerifiedPromise = null;
    this.config = this.buildConfig();
  }

  buildConfig() {
    const rawPort = process.env.MAIL_PORT || "1025";
    const parsedPort = Number.parseInt(rawPort, 10);
    const port =
      Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 1025;

    if (port !== parsedPort) {
      logger.warn(
        `Invalid MAIL_PORT value "${rawPort}", falling back to port 1025`,
      );
    }

    return {
      host: process.env.MAIL_HOST || "localhost",
      port,
      secure: parseBooleanEnv(process.env.MAIL_SECURE, false),
      user: process.env.MAIL_USER || "",
      pass: process.env.MAIL_PASS || "",
      from: process.env.MAIL_FROM || "eSarpra <no-reply@esarpra.local>",
      resetAllowedHosts: Array.isArray(appConfig.mail.resetAllowedHosts)
        ? appConfig.mail.resetAllowedHosts
        : [],
    };
  }

  getConfig() {
    return this.config;
  }

  getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const config = this.getConfig();
    const auth =
      config.user && config.pass
        ? {
            user: config.user,
            pass: config.pass,
          }
        : undefined;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });

    this.transporterVerifiedPromise = this.transporter.verify();

    return this.transporter;
  }

  async warmup() {
    try {
      this.getTransporter();
      await this.transporterVerifiedPromise;
      logger.info("Mail transporter verified");
      return true;
    } catch (error) {
      logger.warn("Mail transporter warmup failed:", error);
      return false;
    }
  }

  async sendPasswordResetEmail({ to, resetUrl, expiresMinutes = 30 }) {
    const transporter = this.getTransporter();
    const { from, resetAllowedHosts } = this.getConfig();
    const safeUrl = String(resetUrl || "").trim();
    const expiresInMinutes =
      Number.isFinite(expiresMinutes) && expiresMinutes > 0
        ? Math.floor(expiresMinutes)
        : 30;

    let parsedUrl;
    try {
      parsedUrl = new URL(safeUrl);
    } catch (error) {
      const invalidUrlError = new Error("Invalid password reset URL");
      invalidUrlError.cause = error;
      throw invalidUrlError;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      const protocolError = new Error(
        "Unsupported password reset URL protocol",
      );
      protocolError.cause = { protocol: parsedUrl.protocol };
      throw protocolError;
    }

    if (resetAllowedHosts.length > 0) {
      const normalizedHost = parsedUrl.host.toLowerCase();
      const isHostAllowed = resetAllowedHosts.includes(normalizedHost);
      if (!isHostAllowed) {
        const hostError = new Error("Password reset URL host is not allowed");
        hostError.cause = {
          host: parsedUrl.host,
          allowedHosts: resetAllowedHosts,
        };
        throw hostError;
      }
    }

    await this.transporterVerifiedPromise;
    const message = buildPasswordResetMessage({
      resetUrl: parsedUrl.toString(),
      expiresInMinutes,
    });

    await transporter.sendMail({
      from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    logger.info(`Password reset email sent to ${to}`);
  }
}

module.exports = new MailService();
