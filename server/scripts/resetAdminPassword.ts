import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { User } from '../models';

const resetAdminPassword = async () => {
  const mongoUri = process.env.MONGODB_URI?.trim();
  const emailArgument = process.argv.slice(2).find((argument) => argument !== '--');
  const email = (emailArgument || process.env.BOOTSTRAP_ADMIN_EMAIL)?.trim().toLowerCase();

  if (!mongoUri) throw new Error('Set MONGODB_URI in .env before resetting the admin password.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Pass the exact admin login email or set BOOTSTRAP_ADMIN_EMAIL in .env.');
  }

  await mongoose.connect(mongoUri);
  try {
    const user = await User.findOne({ email, role: 'admin' }).select('+passwordHash');
    if (!user) throw new Error('No admin account matches that email; no account was changed.');

    const temporaryPassword = crypto.randomBytes(24).toString('base64url');
    user.passwordHash = await bcrypt.hash(temporaryPassword, 12);
    user.mustChangePassword = true;
    await user.save();

    console.log('Reset password for the targeted admin account.');
    console.log(`Temporary password (shown once): ${temporaryPassword}`);
    console.log('Sign in at /admin/login and choose a new password before continuing.');
  } finally {
    await mongoose.disconnect();
  }
};

resetAdminPassword().catch((error: unknown) => {
  console.error('Admin password reset failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
