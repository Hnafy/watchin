import bcrypt from 'bcryptjs';
import { User, RefreshToken, Notification } from '../db/models.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';

export const authService = {
  async register(data: { email: string; username: string; password: string }) {
    const existingUser = await User.findOne({
      $or: [{ email: data.email }, { username: data.username }],
    });

    if (existingUser) {
      throw AppError.badRequest('Email or username already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

    const user = await User.create({
      email: data.email,
      username: data.username,
      passwordHash,
      emailVerified: true,
    });

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await Notification.create({
      userId: user._id,
      type: 'WELCOME',
      title: 'Welcome to Watchin',
      body: 'Your account is ready. Build your list and discover something great to watch.',
      link: '/browse',
    });

    return { user, accessToken, refreshToken };
  },

  async login(data: { email: string; password: string }) {
    const user = await User.findOne({ email: data.email }).select('+passwordHash');

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.lastLoginAt = new Date();
    await user.save();

    return { user, accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    const storedToken = await RefreshToken.findOne({ token: refreshToken });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const decoded = verifyRefreshToken(refreshToken);

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    storedToken.token = newRefreshToken;
    storedToken.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storedToken.save();

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string) {
    await RefreshToken.deleteMany({ token: refreshToken });
  },

  async getMe(userId: string) {
    return User.findById(userId).select('id email username avatar role emailVerified createdAt settings');
  },
};
