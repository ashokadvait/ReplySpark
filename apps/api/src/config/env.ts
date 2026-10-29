import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://replyspark:replyspark_secret@localhost:5432/replyspark?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'replyspark_super_secret_jwt_key_2026_dev_mode_only',
  AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GOOGLE_PROVIDER_MODE: process.env.GOOGLE_PROVIDER_MODE || 'mock',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/v1/auth/google/callback',
  WEB_URL: process.env.WEB_URL || 'http://localhost:3000'
};
