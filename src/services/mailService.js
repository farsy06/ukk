const nodemailer = require("nodemailer");
const logger = require("../config/logging");

class MailService {
  constructor() {
    this.transporter = null;
  }

  getConfig() {
    return {
      host: process.env.MAIL_HOST || "localhost",
      port: parseInt(process.env.MAIL_PORT || "1025", 10),
      secure: process.env.MAIL_SECURE === "true",
      user: process.env.MAIL_USER || "",
      pass: process.env.MAIL_PASS || "",
      from: process.env.MAIL_FROM || "eSarpra <no-reply@esarpra.local>",
    };
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
    });

    return this.transporter;
  }

  async sendPasswordResetEmail({ to, resetUrl, expiresMinutes = 30 }) {
    const transporter = this.getTransporter();
    const { from } = this.getConfig();
    const safeUrl = String(resetUrl || "");

    const html = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7fb;padding:24px 0;margin:0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
              <tr>
                <td style="background:#0d6efd;padding:20px 24px;">
                  <h1 style="margin:0;font-size:20px;line-height:1.3;color:#ffffff;">Reset Password eSarpra</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 12px;font-size:14px;line-height:1.7;">Anda menerima email ini karena ada permintaan reset password untuk akun eSarpra Anda.</p>
                  <p style="margin:0 0 20px;font-size:14px;line-height:1.7;">Klik tombol di bawah untuk membuat password baru.</p>

                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
                    <tr>
                      <td align="center" style="border-radius:8px;background:#16a34a;">
                        <a href="${safeUrl}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Reset Password</a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 12px;font-size:13px;color:#4b5563;">Tautan berlaku selama <strong>${expiresMinutes} menit</strong>.</p>
                  <p style="margin:0 0 8px;font-size:13px;color:#4b5563;">Jika tombol tidak berfungsi, salin tautan berikut ke browser:</p>
                  <p style="margin:0 0 20px;word-break:break-all;font-size:12px;color:#0d6efd;">${safeUrl}</p>

                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
                  <p style="margin:0;font-size:12px;color:#6b7280;">Jika Anda tidak merasa meminta reset password, abaikan email ini.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    await transporter.sendMail({
      from,
      to,
      subject: "Reset Password eSarpra",
      text: [
        "Anda menerima email ini karena ada permintaan reset password.",
        "",
        `Tautan reset: ${resetUrl}`,
        "",
        `Tautan berlaku selama ${expiresMinutes} menit.`,
        "Jika Anda tidak merasa meminta reset password, abaikan email ini.",
      ].join("\n"),
      html,
    });

    logger.info(`Password reset email sent to ${to}`);
  }
}

module.exports = new MailService();
