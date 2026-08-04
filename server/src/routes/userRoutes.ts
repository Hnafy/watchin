import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';
import { validate, updateProfileSchema, changePasswordSchema } from '../utils/validators';

const router = Router();

router.use(authenticate);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.patch('/password', validate(changePasswordSchema), userController.changePassword);
router.get('/stats', userController.getStats);

export default router;
