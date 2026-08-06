import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate, updateProfileSchema, changePasswordSchema, avatarSchema, userSettingsSchema } from '../utils/validators.js';

const router = Router();

router.use(authenticate);
router.post('/avatar', validate(avatarSchema), userController.uploadAvatar);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.patch('/password', validate(changePasswordSchema), userController.changePassword);
router.get('/stats', userController.getStats);
router.get('/settings', userController.getSettings);
router.patch('/settings', validate(userSettingsSchema), userController.updateSettings);
router.delete('/account', userController.deleteAccount);

export default router;
