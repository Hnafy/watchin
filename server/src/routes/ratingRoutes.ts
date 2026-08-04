import { Router } from 'express';
import { ratingController } from '../controllers/ratingController.js';
import { authenticate, optionalAuth } from '../middleware/authMiddleware.js';
import { validate, rateMediaSchema } from '../utils/validators.js';

const router = Router();

router.get('/:mediaId', optionalAuth, ratingController.getMediaRatings);
router.get('/:mediaId/stats', ratingController.getMediaRatingStats);

router.use(authenticate);
router.get('/:mediaId/user', ratingController.getUserRating);
router.post('/', validate(rateMediaSchema), ratingController.rateMedia);
router.delete('/:mediaId', ratingController.deleteRating);

export default router;