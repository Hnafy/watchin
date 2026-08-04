import { Router } from 'express';
import { recommendationController } from '../controllers/recommendationController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/ai', optionalAuth, recommendationController.getAiRecommendations);
router.get('/similar/:mediaId', recommendationController.getSimilarMedia);

export default router;
