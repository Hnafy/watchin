import { Router } from 'express';
import { ratingController } from '../controllers/ratingController';
import { authenticate, optionalAuth } from '../middleware/authMiddleware';
import { validate, rateMediaSchema } from '../utils/validators';

const router = Router();

router.get('/:mediaId', optionalAuth, ratingController.getMediaRatings);
router.get('/:mediaId/stats', ratingController.getMediaRatingStats);

router.use(authenticate);
router.get('/:mediaId/user', ratingController.getUserRating);
router.post('/', validate(rateMediaSchema), ratingController.rateMedia);
router.delete('/:mediaId', ratingController.deleteRating);

export default router;