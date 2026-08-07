import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate, registerSchema, loginSchema, sendVerificationSchema, googleLoginSchema } from '../utils/validators.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const codeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { status: 'error', message: 'Too many code requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/send-verification', codeLimiter, validate(sendVerificationSchema), authController.sendVerificationCode);
router.post('/google', authLimiter, validate(googleLoginSchema), authController.googleLogin);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
