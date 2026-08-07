import { Router } from 'express';
import { supportController } from '../controllers/supportController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/contact', optionalAuth, supportController.contact);

export default router;
