import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');
dotenv.config({ path: envPath });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    // Production credentials are provided via MONGODB_URI. The localhost
    // fallback only covers local development and contains no secrets.
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/streaming',
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

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  discord: {
    supportWebhook: process.env.DISCORD_WEBHOOK_URL || '',
    reportWebhook: process.env.DISCORD_REPORT_WEBHOOK_URL || '',
    username: 'Watchin Bot',
  },

  stream: {
    // Used to sign watch-source responses. Falls back to the JWT access
    // secret so it works out of the box in every environment.
    signingSecret: process.env.STREAM_SIGNING_SECRET || process.env.JWT_ACCESS_SECRET || '',
    tokenTtlSec: 60 * 60,
  },

  comments: {
    defaultEnabled: true,
    defaultAiModeration: true,
    defaultProfanityFilter: true,
    defaultRequireVerifiedEmail: true,
    defaultReportThreshold: 3,
    defaultMaxLength: 2000,
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