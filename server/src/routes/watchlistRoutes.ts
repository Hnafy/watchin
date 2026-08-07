import { Router } from 'express';
import { watchlistController } from '../controllers/watchlistController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate, addToWatchlistSchema, folderSchema, folderNameSchema, moveToFolderSchema } from '../utils/validators.js';

const router = Router();
router.use(authenticate);

// Folders must be registered before the greedy :mediaId routes.
router.get('/folders', watchlistController.getFolders);
router.post('/folders', validate(folderSchema), watchlistController.createFolder);
router.patch('/folders/:folderId', validate(folderNameSchema), watchlistController.renameFolder);
router.delete('/folders/:folderId', watchlistController.deleteFolder);

router.get('/', watchlistController.getWatchlist);
router.post('/', validate(addToWatchlistSchema), watchlistController.addToWatchlist);
router.delete('/:mediaId', watchlistController.removeFromWatchlist);
router.patch('/:mediaId/folder', validate(moveToFolderSchema), watchlistController.moveToFolder);
router.delete('/', watchlistController.clearWatchlist);
router.get('/:mediaId/check', watchlistController.checkWatchlist);

export default router;
