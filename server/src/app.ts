import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';
import { requestLogger } from './middleware/requestLogger';

import authRoutes from './routes/authRoutes';
import mediaRoutes from './routes/mediaRoutes';
import watchlistRoutes from './routes/watchlistRoutes';
import ratingRoutes from './routes/ratingRoutes';
import watchHistoryRoutes from './routes/watchHistoryRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import tmdbRoutes from './routes/tmdbRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import adsRoutes from './routes/adsRoutes';

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

import { getDb } from './db';

app.get('/api/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    await getDb().connection.db!.admin().command({ ping: 1 });
    dbStatus = 'connected';
  } catch { dbStatus = 'error'; }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
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