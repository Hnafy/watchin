import { Router } from 'express';
import { commentController } from '../controllers/commentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/config', commentController.getConfig);
router.get('/media/:mediaId', commentController.getByMedia);

router.use(authenticate);
router.post('/media/:mediaId', commentController.create);
router.post('/:id/reply', commentController.reply);
router.post('/:id/report', commentController.report);
router.delete('/:id', commentController.remove);

export default router;
