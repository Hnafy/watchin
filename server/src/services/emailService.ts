import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const smtpConfigured = Boolean(
  config.email.host && config.email.user && config.email.pass
);

let transporter: nodemailer.Transporter | null = null;

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user!,
      pass: config.email.pass!,
    },
  });
}

/**
 * Sends a generic HTML email (admin messages, warnings, account notices).
 * Gracefully no-ops in dev mode when SMTP is not configured.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    // eslint-disable-next-line no-console
    console.log(`[email:dev] to ${to} — subject: "${subject}"`);
    return;
  }
  await transporter.sendMail({
    from: config.email.from || `Watchin <${config.email.user}>`,
    to,
    subject,
    html,
  });
}

const emailShell = (inner: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #e50914; margin: 0 0 16px;">Watchin</h2>
    ${inner}
    <p style="color: #999; font-size: 12px; margin-top: 24px;">You are receiving this because of activity on your Watchin account.</p>
  </div>
`;

export async function sendMessageEmail(to: string, title: string, body: string, senderName: string): Promise<void> {
  await sendEmail(
    to,
    `Message from ${senderName} — Watchin`,
    emailShell(`
      <p style="color: #666; font-size: 12px; margin: 0 0 8px;">A message from the Watchin team (${senderName}):</p>
      <h3 style="color: #111; margin: 0 0 12px;">${title}</h3>
      <p style="color: #333; font-size: 15px; line-height: 1.6; white-space: pre-line;">${body}</p>
    `)
  );
}

export async function sendWarningEmail(to: string, warningCount: number): Promise<void> {
  await sendEmail(
    to,
    'Warning — Watchin',
    emailShell(`
      <p style="color: #333; font-size: 15px; line-height: 1.6;">
        Your Watchin account has received a warning (${warningCount}/4) for repeatedly filing false reports against comments.
      </p>
      <p style="color: #666; font-size: 13px;">Please review the community guidelines. Accounts that reach 4 warnings are permanently blocked.</p>
    `)
  );
}

export async function sendBannedEmail(to: string): Promise<void> {
  await sendEmail(
    to,
    'Account blocked — Watchin',
    emailShell(`
      <p style="color: #333; font-size: 15px; line-height: 1.6;">
        Your Watchin account has been permanently blocked after receiving 4 warnings for filing false reports.
      </p>
    `)
  );
}
