import { Router } from 'express';
import { playlistController } from '../controllers/playlistController.js';
import { authenticate, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', playlistController.list);
router.get('/trending', playlistController.trending);
router.get('/mine', authenticate, playlistController.getUserPlaylists);
router.get('/:playlistId', optionalAuth, playlistController.getById);

router.use(authenticate);

router.post('/', playlistController.create);

router.patch('/:playlistId', playlistController.update);
router.delete('/:playlistId', playlistController.remove);

router.post('/:playlistId/items', playlistController.addItem);
router.delete('/:playlistId/items/:mediaId', playlistController.removeItem);

router.post('/:playlistId/like', playlistController.toggleLike);
router.post('/:playlistId/save', playlistController.toggleSave);
router.post('/:playlistId/fork', playlistController.fork);

export default router;
