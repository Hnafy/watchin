import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
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

const app = express();

app.set('trust proxy', 1);

app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;