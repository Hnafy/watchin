import { Router } from 'express';
import { adsController } from '../controllers/adsController';

const router = Router();

// Public ad-zone config (used by AdSlot components across the client)
router.get('/config', adsController.getConfig);

// Public analytics beacon — records impressions/clicks without auth
router.post('/track', adsController.track);

export default router;
