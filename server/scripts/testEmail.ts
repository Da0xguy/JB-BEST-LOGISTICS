import 'dotenv/config';
import { sendMail, verifyEmailConnection } from '../lib/email';

const recipient = process.argv.slice(2).find((argument) => argument !== '--')?.trim();

const testEmail = async () => {
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error('Usage: pnpm email:test your-address@example.com');
  }

  await verifyEmailConnection();
  console.log('Email provider configuration verified.');
  await sendMail(
    recipient,
    'JB & Best Logistics email delivery test',
    '<p>This test confirms JB &amp; Best Logistics can send email to this address. Replying to this message is not required.</p>',
  );
  console.log(`Test email accepted by the provider for ${recipient}. Check the inbox and spam folder.`);
};

testEmail().catch((error: unknown) => {
  console.error('Email test failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
