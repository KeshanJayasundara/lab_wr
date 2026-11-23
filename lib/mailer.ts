import tls from "tls";
import { randomBytes } from "crypto";

/**
 * Tiny SMTP client (no extra npm package needed).
 * It talks to Gmail over a secure TLS connection (smtp.gmail.com : 465) and logs in with
 * the Gmail address + a Google "App password" (the secret key).
 *
 * .env:
 *   SMTP_USER=labwrkurunagala@gmail.com
 *   SMTP_PASS=xxxx xxxx xxxx xxxx        (Google App password - NOT the normal Gmail password)
 *   SMTP_FROM="NWSDB LIMS" <labwrkurunagala@gmail.com>     (optional)
 *   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465                 (optional, these are the defaults)
 */

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
// base64 body wrapped at 76 characters (MIME rule) - also means no line can ever start with "."
const b64Lines = (s: string) => (b64(s).match(/.{1,76}/g) || []).join("\r\n");
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

type MailInput = { host: string; port: number; user: string; pass: string; from: string; to: string; subject: string; text: string; html: string };

function buildMessage(m: MailInput) {
  const boundary = `=_nwsdb_${randomBytes(12).toString("hex")}`;
  const domain = m.user.split("@")[1] || "localhost";
  return [
    `From: ${m.from}`,
    `To: ${m.to}`,
    `Subject: ${encodeHeader(m.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomBytes(12).toString("hex")}@${domain}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64Lines(m.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64Lines(m.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function smtpSend(m: MailInput): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: m.host,
      port: m.port,
      servername: m.host,
      // only ever switched off by a developer testing against a local fake server
      rejectUnauthorized: process.env.SMTP_INSECURE_TLS !== "true",
    });
    socket.setEncoding("utf8");
    socket.setTimeout(20000);

    let buffer = "";
    let pending: ((r: { code: number; text: string }) => void) | null = null;
    let failed = false;

    const fail = (err: Error) => {
      if (failed) return;
      failed = true;
      socket.destroy();
      reject(err);
    };

    // A reply is complete when its last line looks like "250 text" (a space after the code)
    const tryDeliver = () => {
      if (!pending) return;
      const lines = buffer.split("\r\n");
      if (lines[lines.length - 1] === "") lines.pop();
      if (lines.length === 0) return;
      const last = lines[lines.length - 1];
      if (/^\d{3} /.test(last) || /^\d{3}$/.test(last)) {
        const reply = { code: parseInt(last.slice(0, 3), 10), text: lines.join("\n") };
        buffer = "";
        const cb = pending;
        pending = null;
        cb(reply);
      }
    };

    socket.on("data", (chunk: string) => {
      buffer += chunk;
      tryDeliver();
    });
    socket.on("timeout", () => fail(new Error("SMTP connection timed out")));
    socket.on("error", (e) => fail(e));
    socket.on("close", () => {
      if (pending && !failed) fail(new Error("SMTP connection closed unexpectedly"));
    });

    const reply = () =>
      new Promise<{ code: number; text: string }>((res) => {
        pending = res;
        tryDeliver();
      });

    const command = async (line: string | null, ok: number[]) => {
      if (line !== null) socket.write(line + "\r\n");
      const r = await reply();
      if (!ok.includes(r.code)) throw new Error(`SMTP error ${r.code}: ${r.text}`);
      return r;
    };

    socket.once("secureConnect", async () => {
      try {
        await command(null, [220]); // greeting
        await command("EHLO nwsdb-lims", [250]);
        await command("AUTH LOGIN", [334]);
        await command(b64(m.user), [334]);
        await command(b64(m.pass), [235]);
        await command(`MAIL FROM:<${m.user}>`, [250]);
        await command(`RCPT TO:<${m.to}>`, [250, 251]);
        await command("DATA", [354]);
        socket.write(buildMessage(m) + "\r\n.\r\n");
        const sent = await reply();
        if (sent.code !== 250) throw new Error(`SMTP error ${sent.code}: ${sent.text}`);
        socket.write("QUIT\r\n");
        socket.end();
        resolve();
      } catch (e: any) {
        fail(e);
      }
    });
  });
}

/**
 * Sends the password-reset code by e-mail.
 * In development, when SMTP_USER / SMTP_PASS are not set, the code is printed in the terminal instead,
 * so the flow can be tested without an e-mail account.
 */
export async function sendPasswordResetOtp(to: string, name: string, otp: string, minutes: number) {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, ""); // Google shows app passwords with spaces

  if (!user || !pass) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[DEV ONLY] SMTP not configured. Password reset code for ${to}: ${otp}\n`);
      return;
    }
    throw new Error("SMTP is not configured (SMTP_USER / SMTP_PASS)");
  }

  const safeName = escapeHtml(name || "User");

  await smtpSend({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    user,
    pass,
    from: process.env.SMTP_FROM || `"NWSDB LIMS" <${user}>`,
    to,
    subject: "Your NWSDB LIMS password reset code",
    text:
      `Hello ${name || "User"},\n\n` +
      `Your password reset code is: ${otp}\n\n` +
      `It expires in ${minutes} minutes. If you did not request this, ignore this e-mail - your password stays the same.\n\n` +
      `NWSDB Water Reclamation Section`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 12px">Password reset code</h2>
        <p>Hello ${safeName},</p>
        <p>Use this code to reset your NWSDB LIMS password:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${otp}</p>
        <p style="color:#475569;font-size:14px">The code expires in <b>${minutes} minutes</b> and can be used once.
        If you did not request it, you can ignore this e-mail - your password stays the same.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">NWSDB Water Reclamation Section</p>
      </div>`,
  });
}