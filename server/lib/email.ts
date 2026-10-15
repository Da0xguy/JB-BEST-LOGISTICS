import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const resendApiKey = () => process.env.RESEND_API_KEY?.trim();
const resendFromEmail = () => process.env.RESEND_FROM_EMAIL?.trim();
const hasResendSettings = () => Boolean(resendApiKey() || resendFromEmail());
const hasSmtpSettings = () =>
  Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS);

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const isEmailConfigured = () => hasResendSettings()
  ? Boolean(resendApiKey() && resendFromEmail())
  : hasSmtpSettings();

export async function verifyEmailConnection(): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('For Resend, set RESEND_API_KEY and RESEND_FROM_EMAIL in .env. Alternatively, configure SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  }
  if (hasResendSettings()) return;
  await transporter.verify();
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('For Resend, set RESEND_API_KEY and RESEND_FROM_EMAIL in .env. Alternatively, configure SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  }
  if (hasResendSettings()) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail(),
        to: [to],
        subject,
        html,
      }),
    });
    const responseBody = await response.json().catch(() => ({})) as {
      id?: string;
      message?: string;
      name?: string;
    };
    if (!response.ok) {
      const providerMessage = responseBody.message || responseBody.name || '';
      const message = /domain is not verified/i.test(providerMessage)
        ? 'The Resend sender domain is not verified. Verify your domain in Resend and set RESEND_FROM_EMAIL to an address at that domain.'
        : `Resend rejected the email (HTTP ${response.status}). Check the Resend API key and sender configuration.`;
      throw new EmailDeliveryError(message);
    }
    if (!responseBody.id) throw new Error('Resend accepted the request but returned no message ID.');
    console.log(`Email accepted by Resend: ${responseBody.id}`);
    return;
  }
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `"JB Best Logistics" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  if (!info.accepted.length || info.rejected.length) {
    throw new Error(`Email server did not accept the message for ${to}.`);
  }
  console.log(`Email accepted by SMTP server: ${info.messageId}`);
}
