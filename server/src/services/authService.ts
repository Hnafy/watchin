import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User, RefreshToken, Notification, EmailVerification, BlockedEmail } from '../db/models.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';
import { sendVerificationEmail } from './emailService.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

const googleClient = config.google.clientId
  ? new OAuth2Client(config.google.clientId)
  : null;

const isBlockedEmail = async (email: string) => {
  const blocked = await BlockedEmail.exists({ email: email.toLowerCase().trim() });
  if (blocked) {
    throw AppError.forbidden('This email is not allowed to create an account');
  }
};

const getIssuedTokens = async (userId: string, email: string, role: string) => {
  const { accessToken, refreshToken } = generateTokens({ userId, email, role });

  await RefreshToken.create({
    token: refreshToken,
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
};

export const authService = {
  async sendVerificationCode(data: { email: string }) {
    const email = data.email.toLowerCase().trim();

    await isBlockedEmail(email);

    const existing = await User.findOne({ email });
    if (existing) {
      throw AppError.badRequest('An account with this email already exists');
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await EmailVerification.findOneAndUpdate(
      { email, purpose: 'REGISTER' },
      { code, attempts: 0, expiresAt, createdAt: new Date() },
      { upsert: true }
    );

    const { devCode } = await sendVerificationEmail(email, code);
    return { devCode };
  },

  async verifyCode(email: string, code: string) {
    const record = await EmailVerification.findOne({
      email: email.toLowerCase().trim(),
      purpose: 'REGISTER',
    });

    if (!record || record.expiresAt < new Date()) {
      throw AppError.badRequest('Verification code expired, request a new one');
    }

    if (record.attempts >= MAX_CODE_ATTEMPTS) {
      await EmailVerification.deleteOne({ _id: record._id });
      throw AppError.badRequest('Too many attempts, request a new code');
    }

    if (record.code !== code) {
      record.attempts += 1;
      await record.save();
      throw AppError.badRequest('Incorrect verification code');
    }

    return true;
  },

  async register(data: { email: string; username: string; password: string; code: string }) {
    const existingUser = await User.findOne({
      $or: [{ email: data.email }, { username: data.username }],
    });

    if (existingUser) {
      throw AppError.badRequest('Email or username already exists');
    }

    await isBlockedEmail(data.email);

    if (!data.code) {
      throw AppError.badRequest('Verification code required');
    }

    await this.verifyCode(data.email, data.code);
    await EmailVerification.deleteOne({ email: data.email.toLowerCase().trim(), purpose: 'REGISTER' });

    const passwordHash = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

    const user = await User.create({
      email: data.email,
      username: data.username,
      passwordHash,
      emailVerified: true,
    });

    const { accessToken, refreshToken } = await getIssuedTokens(user.id, user.email, user.role);

    await Notification.create({
      userId: user._id,
      type: 'WELCOME',
      title: 'Welcome to Watchin',
      body: 'Your account is ready. Build your list and discover something great to watch.',
      link: '/browse',
    });

    return { user, accessToken, refreshToken };
  },

  async googleLogin(idToken: string) {
    if (!googleClient) {
      throw AppError.badRequest('Google sign-in is not configured yet');
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw AppError.unauthorized('Invalid Google token');
    }

    if (!payload || !payload.email) {
      throw AppError.unauthorized('Google account has no email');
    }

    const email = payload.email.toLowerCase();

    await isBlockedEmail(email);

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        username: payload.name || email.split('@')[0],
        googleId: payload.sub,
        avatar: payload.picture || null,
        emailVerified: payload.email_verified !== false,
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      if (payload.avatar) user.avatar = payload.avatar;
      await user.save();
    }

    const { accessToken, refreshToken } = await getIssuedTokens(user.id, user.email, user.role);

    user.lastLoginAt = new Date();
    await user.save();

    return { user, accessToken, refreshToken };
  },

  async login(data: { email: string; password: string }) {
    await isBlockedEmail(data.email);

    const user = await User.findOne({ email: data.email }).select('+passwordHash');

    if (!user || !user.passwordHash || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const { accessToken, refreshToken } = await getIssuedTokens(user.id, user.email, user.role);

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

    const { accessToken, refreshToken: newRefreshToken } = await getIssuedTokens(
      decoded.userId,
      decoded.email,
      decoded.role
    );

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
