import { Router } from 'express';
import { watchHistoryController } from '../controllers/watchHistoryController';
import { authenticate } from '../middleware/authMiddleware';
import { validate, updateProgressSchema, markCompletedSchema } from '../utils/validators';

const router = Router();
router.use(authenticate);

router.get('/continue', watchHistoryController.getContinueWatching);
router.get('/', watchHistoryController.getWatchHistory);
router.post('/', validate(updateProgressSchema), watchHistoryController.updateProgress);
router.post('/:mediaId/complete', validate(markCompletedSchema), watchHistoryController.markCompleted);
router.delete('/:historyId', watchHistoryController.deleteHistoryItem);
router.delete('/', watchHistoryController.clearAllHistory);

export default router;