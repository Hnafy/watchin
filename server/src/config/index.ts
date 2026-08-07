import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');
dotenv.config({ path: envPath });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    url: process.env.MONGODB_URI || 'mongodb+srv://abdallahalfeky18_db_user:YZ2rhhJaDdSgXOMQ@watchin.rmxdal3.mongodb.net',
  },
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },
  
  cors: {
    origins: (process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  },
  
  bcrypt: {
    saltRounds: 12,
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 1500,
  },
  
  tmdb: {
    apiKey: process.env.TMDB_API_KEY,
    baseUrl: 'https://api.themoviedb.org/3',
    imageBaseUrl: 'https://image.tmdb.org/t/p',
  },

  imgbb: {
    apiKey: process.env.IMGBB_API_KEY || '',
    baseUrl: 'https://api.imgbb.com/1/upload',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  mixdrop: {
    email: process.env.MIXDROP_EMAIL || '',
    key: process.env.MIXDROP_KEY || '',
    uploadUrl: process.env.MIXDROP_UPLOAD_URL || 'https://ul.mixdrop.ag/api',
    maxFileSize: 8 * 1024 * 1024 * 1024, // 8GB
  },

  upload: {
    maxFileSize: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};