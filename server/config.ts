import 'dotenv/config';

const productionClientOrigins = [
  'https://jb-best-logistics.vercel.app',
  'https://www.jb-bestlogistics.com',
  'https://jb-bestlogistics.com',
];
const defaultClientOrigin = process.env.NODE_ENV === 'production'
  ? productionClientOrigins[0]
  : 'http://localhost:3000';
const configuredClientOrigins = (process.env.CLIENT_ORIGIN || defaultClientOrigin)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
// Keep local frontend origins available when testing against the deployed API.
const localClientOrigins = ['http://localhost:3000', 'http://localhost:3001'];

const mongoUri = process.env.MONGODB_URI?.trim();
if (!mongoUri) {
  throw new Error('MONGODB_URI is required. Set it in your .env file.');
}

const required = (name: string, fallback?: string) => {
  const value = process.env[name] || fallback;
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || '';
};

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri,
  jwtSecret: required('JWT_SECRET', 'development-only-change-me'),
  clientOrigin: configuredClientOrigins[0] || defaultClientOrigin,
  clientOrigins: [...new Set([
    ...configuredClientOrigins,
    ...productionClientOrigins,
    ...localClientOrigins,
  ])],
  paystackSecret: process.env.PAYSTACK_SECRET_KEY || '',
};
