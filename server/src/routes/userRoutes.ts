import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate, updateProfileSchema, changePasswordSchema } from '../utils/validators.js';

const router = Router();

router.use(authenticate);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.patch('/password', validate(changePasswordSchema), userController.changePassword);
router.get('/stats', userController.getStats);

export default router;
