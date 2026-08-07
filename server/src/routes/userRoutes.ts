import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate, optionalAuth } from '../middleware/authMiddleware.js';
import {
  validate,
  updateProfileSchema,
  changePasswordSchema,
  avatarSchema,
  userSettingsSchema,
  friendRequestSchema,
  followSchema,
  profileLikeSchema,
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

// Friend requests
router.post('/friend-requests', validate(friendRequestSchema), userController.sendFriendRequest);
router.patch('/friend-requests/:requestId/respond', userController.respondFriendRequest);
router.delete('/friend-requests/:requestId/cancel', userController.cancelFriendRequest);
router.delete('/friends', userController.removeFriend);
router.get('/friends/:username', userController.getUserFriends);

// Follows
router.post('/follow', validate(followSchema), userController.toggleFollow);
router.get('/follow-stats', userController.getFollowStats);

// Profile likes
router.post('/like-profile', validate(profileLikeSchema), userController.toggleProfileLike);

export default router;
