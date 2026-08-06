import { Router, raw } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { mixdropController } from '../controllers/mixdropController.js';
import { config } from '../config/index.js';

const router = Router();

router.post(
  '/upload',
  authenticate,
  authorize('ADMIN'),
  raw({ type: () => true, limit: config.mixdrop.maxFileSize }),
  mixdropController.upload
);

export default router;
