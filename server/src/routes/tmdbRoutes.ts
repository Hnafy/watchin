import { Router } from 'express';
import { tmdbController } from '../controllers/tmdbController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'MODERATOR'));

router.get('/search', tmdbController.search);
router.get('/details/:tmdbId', tmdbController.getDetails);
router.post('/import', tmdbController.import);

export default router;
