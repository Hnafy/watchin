import app from './app';
import { config } from './config';
import { connectDB, disconnectDB } from './db';

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Validate MONGODB_URI format
  const dbUrl = process.env.MONGODB_URI!;
  if (!dbUrl.startsWith('mongodb://') && !dbUrl.startsWith('mongodb+srv://')) {
    console.error('MONGODB_URI must be a valid MongoDB connection string');
    process.exit(1);
  }
}

async function startServer() {
  try {
    validateEnv();

    await connectDB();
    console.log('Database connected successfully');

    const server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('Database disconnected');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('Forceful shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
