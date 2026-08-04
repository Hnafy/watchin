import { Router } from 'express';
import { tmdbController } from '../controllers/tmdbController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'MODERATOR'));

router.get('/search', tmdbController.search);
router.get('/details/:tmdbId', tmdbController.getDetails);
router.post('/import', tmdbController.import);

export default router;
