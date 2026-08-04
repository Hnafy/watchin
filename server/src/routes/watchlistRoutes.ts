import { Router } from 'express';
import { watchlistController } from '../controllers/watchlistController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate, addToWatchlistSchema } from '../utils/validators.js';

const router = Router();
router.use(authenticate);

router.get('/', watchlistController.getWatchlist);
router.post('/', validate(addToWatchlistSchema), watchlistController.addToWatchlist);
router.delete('/:mediaId', watchlistController.removeFromWatchlist);
router.delete('/', watchlistController.clearWatchlist);
router.get('/:mediaId/check', watchlistController.checkWatchlist);

export default router;