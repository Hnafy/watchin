import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.get('/', notificationController.list);
router.post('/:id/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);

export default router;
