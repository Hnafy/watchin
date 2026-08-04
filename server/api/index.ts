import type { Request, Response } from 'express';
import app from '../src/app';
import { connectDB } from '../src/db';

const HEALTH_PATHS = ['/', '/health', '/api/health'];

let connectionPromise: Promise<void> | null = null;

function ensureConnection(): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((err: unknown) => {
      connectionPromise = null;
      throw err;
    });
  }
  return connectionPromise;
}

export default async function handler(req: Request, res: Response) {
  if (HEALTH_PATHS.includes(req.url)) {
    return app(req, res);
  }

  try {
    await ensureConnection();
  } catch (err) {
    console.error(`MongoDB connection failed for ${req.method} ${req.url}:`, err);
  }

  return app(req, res);
}
