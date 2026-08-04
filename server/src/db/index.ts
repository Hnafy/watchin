import mongoose from 'mongoose';
import { config } from '../config';

const globalForMongo = globalThis as unknown as { mongoose?: typeof mongoose };

export const getDb = () => globalForMongo.mongoose || mongoose;

export async function connectDB(): Promise<void> {
  await mongoose.connect(config.db.url);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export default getDb;
