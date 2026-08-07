import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { requestLogger } from './middleware/requestLogger.js';

import authRoutes from './routes/authRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import watchHistoryRoutes from './routes/watchHistoryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import tmdbRoutes from './routes/tmdbRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import adsRoutes from './routes/adsRoutes.js';
import mixdropRoutes from './routes/mixdropRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import supportRoutes from './routes/supportRoutes.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const allowedOrigins = config.cors.origins;
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow Vercel preview deployments (watchin-client-*.vercel.app)
      if (/^https:\/\/watchin-client-[a-z0-9-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: config.cors.credentials,
  })
);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: true },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { status: 'error', message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

import { getDb } from './db/index.js';

app.get(['/', '/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'ok',
    service: 'streaming-server',
    timestamp: new Date().toISOString(),
    database: getDb().connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/history', watchHistoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/mixdrop', mixdropRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/support', supportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;