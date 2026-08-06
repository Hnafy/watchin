import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate, updateProfileSchema, changePasswordSchema, avatarSchema, userSettingsSchema, friendRequestSchema, playlistSchema, updatePlaylistItemSchema, mediaLikeSchema } from '../utils/validators.js';

const router = Router();

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

// Follows
router.post('/follow', validate({ followingId: friendRequestSchema.shape.toUserId }), userController.toggleFollow);
router.get('/follow-stats', userController.getFollowStats);

// Playlists
router.post('/playlists', validate(playlistSchema), userController.createPlaylist);
router.get('/playlists', userController.getUserPlaylists);
router.get('/playlists/:playlistId', userController.getPlaylist);
router.patch('/playlists/:playlistId', validate(playlistSchema.partial()), userController.updatePlaylist);
router.delete('/playlists/:playlistId', userController.deletePlaylist);
router.post('/playlists/:playlistId/items', validate(updatePlaylistItemSchema), userController.addItemToPlaylist);
router.delete('/playlists/:playlistId/items/:mediaId', userController.removeItemFromPlaylist);

// Notifications
router.get('/notifications', userController.getNotifications);
router.patch('/notifications/:notificationId/read', userController.markNotificationAsRead);

export default router;
