import { Router } from 'express';
import { watchlistController } from '../controllers/watchlistController';
import { authenticate } from '../middleware/authMiddleware';
import { validate, addToWatchlistSchema } from '../utils/validators';

const router = Router();
router.use(authenticate);

router.get('/', watchlistController.getWatchlist);
router.post('/', validate(addToWatchlistSchema), watchlistController.addToWatchlist);
router.delete('/:mediaId', watchlistController.removeFromWatchlist);
router.delete('/', watchlistController.clearWatchlist);
router.get('/:mediaId/check', watchlistController.checkWatchlist);

export default router;