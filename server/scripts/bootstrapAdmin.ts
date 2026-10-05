import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { User } from '../models';

const bootstrapAdmin = async () => {
  const mongoUri = process.env.MONGODB_URI;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

  if (!mongoUri) throw new Error('Set MONGODB_URI in the local environment before bootstrapping');
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set BOOTSTRAP_ADMIN_NAME and a valid BOOTSTRAP_ADMIN_EMAIL');
  }

  await mongoose.connect(mongoUri);
  try {
    if (await User.exists({ role: 'admin' })) {
      throw new Error('An admin account already exists; bootstrap is limited to the first admin');
    }

    const temporaryPassword = crypto.randomBytes(24).toString('base64url');
    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      role: 'admin',
      mustChangePassword: true,
    });

    console.log(`Created first admin account: ${user.email}`);
    console.log(`Temporary password (shown once): ${temporaryPassword}`);
    console.log('Sign in at /admin/login and choose a new password before continuing.');
  } finally {
    await mongoose.disconnect();
  }
};

bootstrapAdmin().catch((error: unknown) => {
  console.error('Admin bootstrap failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
