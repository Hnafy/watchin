import { Router } from 'express';
import { recommendationController } from '../controllers/recommendationController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/ai', optionalAuth, recommendationController.getAiRecommendations);
router.get('/similar/:mediaId', recommendationController.getSimilarMedia);

export default router;
