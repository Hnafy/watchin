import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate, optionalAuth } from '../middleware/authMiddleware.js';
import {
  validate,
  updateProfileSchema,
  changePasswordSchema,
  avatarSchema,
  userSettingsSchema,
  searchUsersQuerySchema,
} from '../utils/validators.js';

const router = Router();

// Public-ish (optional auth): view a profile / search users
router.get('/profile/:username', optionalAuth, userController.getProfile);
router.get('/users/search', optionalAuth, validate(searchUsersQuerySchema, 'query'), userController.searchUsers);

router.use(authenticate);

router.post('/avatar', validate(avatarSchema), userController.uploadAvatar);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.patch('/password', validate(changePasswordSchema), userController.changePassword);
router.get('/stats', userController.getStats);
router.get('/settings', userController.getSettings);
router.patch('/settings', validate(userSettingsSchema), userController.updateSettings);
router.delete('/account', userController.deleteAccount);

export default router;