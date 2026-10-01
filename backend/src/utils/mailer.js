// Gmail SMTP mailer (nodemailer). Requires SMTP_USER + SMTP_APP_PASSWORD env
// vars; the app password comes from Google Account 2-Step Verification and is
// never committed (see .env.example).

const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Email is not configured. Set SMTP_USER and SMTP_APP_PASSWORD.",
    );
  }
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return transporter;
}

async function sendVerificationCode(email, code) {
  await getTransporter().sendMail({
    from: `"SwiftAid" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your SwiftAid verification code",
    text:
      `Your SwiftAid verification code is ${code}.\n` +
      `It expires in 15 minutes. If you did not request this, ignore this email.`,
  });
}

module.exports = { sendVerificationCode };
