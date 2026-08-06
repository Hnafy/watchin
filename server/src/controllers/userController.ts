import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User, RefreshToken, WatchHistory, WatchlistItem, Rating } from '../db/models.js';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';

function flattenSettings(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenSettings(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

export const userController = {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const user = await User.findById(userId).select('settings');
      res.json({ status: 'success', data: user?.settings || {} });
    } catch (error) {
      next(error);
    }
  },

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const updates = req.body as Record<string, any>;
      const set: Record<string, any> = {};
      for (const [key, value] of Object.entries(flattenSettings(updates))) {
        set[`settings.${key}`] = value;
      }
      const user = await User.findByIdAndUpdate(userId, { $set: set }, { new: true }).select('settings');
      res.json({ status: 'success', data: user?.settings || {} });
    } catch (error) {
      next(error);
    }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      await Promise.all([
        User.deleteOne({ _id: userId }),
        RefreshToken.deleteMany({ userId }),
        WatchHistory.deleteMany({ userId }),
        WatchlistItem.deleteMany({ userId }),
        Rating.deleteMany({ userId }),
        FriendRequest.deleteMany({ $or: [{ fromUserId: userId }, { toUserId: userId }] }),
        Follow.deleteMany({ $or: [{ followerId: userId }, { followedId: userId }] }),
        Playlist.deleteMany({ userId }),
      ]);
      res.json({ status: 'success', message: 'Account deleted' });
    } catch (error) {
      next(error);
    }
  },

  // Friend requests
  async sendFriendRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const fromUserId = (req as any).user.id;
      const { toUserId } = req.body;

      if (fromUserId === toUserId) throw AppError.badRequest('Cannot send friend request to yourself');

      const existing = await FriendRequest.findOne({ fromUserId, toUserId });
      if (existing) {
        if (existing.status === 'PENDING') throw AppError.badRequest('Friend request already sent');
        if (existing.status === 'ACCEPTED') throw AppError.badRequest('Already friends');
      }

      const reverse = await FriendRequest.findOne({ fromUserId: toUserId, toUserId: fromUserId });
      if (reverse && reverse.status === 'PENDING') {
        await FriendRequest.updateOne(
          { fromUserId: toUserId, toUserId: fromUserId },
          { $set: { status: 'ACCEPTED' } }
        );
        await Follow.create([{ followerId: fromUserId, followedId: toUserId }, { followerId: toUserId, followedId: fromUserId }]);
        await Promise.all([
          createNotification(fromUserId, toUserId, 'FRIEND_REQUEST', 'You are now friends!', `/profile/${toUserId}`),
          createNotification(toUserId, fromUserId, 'FRIEND_REQUEST', 'Accepted your friend request!', `/profile/${fromUserId}`),
        ]);
        res.json({ status: 'success', message: 'Friend request accepted' });
        return;
      }

      await FriendRequest.create({ fromUserId, toUserId, status: 'PENDING' });
      await createNotification(toUserId, fromUserId, 'FRIEND_REQUEST', `${(await User.findById(fromUserId)).username} sent you a friend request`, `/profile/${fromUserId}`);

      res.json({ status: 'success', message: 'Friend request sent' });
    } catch (error) {
      next(error);
    }
  },

  async respondFriendRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { requestId, action } = req.body;

      const request = await FriendRequest.findById(requestId);
      if (!request) throw AppError.notFound('Friend request not found');
      if (request.toUserId.toString() !== userId) throw AppError.forbidden('Not authorized to respond');

      if (action === 'accept') {
        request.status = 'ACCEPTED';
        await request.save();
        await Follow.create([{ followerId: request.fromUserId, followedId: request.toUserId }, { followerId: request.toUserId, followedId: request.fromUserId }]);
        await createNotification(request.fromUserId, request.toUserId, 'FRIEND_REQUEST', 'Accepted your friend request!', `/profile/${request.fromUserId}`);
        res.json({ status: 'success', message: 'Friend request accepted' });
      } else {
        request.status = 'DECLINED';
        await request.save();
        await createNotification(request.fromUserId, request.toUserId, 'FRIEND_REQUEST', 'Declined your friend request', `/profile/${request.fromUserId}`);
        res.json({ status: 'success', message: 'Friend request declined' });
      }
    } catch (error) {
      next(error);
    }
  },

  async cancelFriendRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { requestId } = req.body;

      const request = await FriendRequest.findById(requestId);
      if (!request) throw AppError.notFound('Friend request not found');
      if (request.fromUserId.toString() !== userId) throw AppError.forbidden('Not authorized to cancel');

      await FriendRequest.deleteOne({ _id: requestId });
      res.json({ status: 'success', message: 'Friend request cancelled' });
    } catch (error) {
      next(error);
    }
  },

  async removeFriend(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { friendId } = req.body;

      await Follow.deleteMany({ $or: [{ followerId: userId, followedId: friendId }, { followerId: friendId, followedId: userId }] });
      res.json({ status: 'success', message: 'Friend removed' });
    } catch (error) {
      next(error);
    }
  },

  // Follow/Unfollow
  async toggleFollow(req: Request, res: Response, next: NextFunction) {
    try {
      const followerId = (req as any).user.id;
      const { followingId } = req.body;

      if (followerId === followingId) throw AppError.badRequest('Cannot follow yourself');

      const existing = await Follow.findOne({ followerId, followedId: followingId });
      if (existing) {
        await Follow.deleteOne({ _id: existing._id });
        await createNotification(followingId, followerId, 'FOLLOW', `${(await User.findById(followerId)).username} unfollowed you`, `/profile/${followerId}`);
        res.json({ status: 'success', message: 'Unfollowed' });
        return;
      }

      await Follow.create({ followerId, followedId: followingId });
      await createNotification(followingId, followerId, 'FOLLOW', `${(await User.findById(followerId)).username} started following you`, `/profile/${followerId}`);
      res.json({ status: 'success', message: 'Following' });
    } catch (error) {
      next(error);
    }
  },

  async getFollowStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const [followers, followings] = await Promise.all([
        Follow.countDocuments({ followedId: userId }),
        Follow.countDocuments({ followerId: userId }),
      ]);

      res.json({
        status: 'success',
        data: { followers, followings },
      });
    } catch (error) {
      next(error);
    }
  },

  async getUserFriends(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params;
      const mode = req.query.mode as string || 'friends';

      const targetUser = await User.findOne({ username }).select('_id');
      if (!targetUser) throw AppError.notFound('User not found');

      let friends: any[] = [];

      if (mode === 'friends') {
        const followPairs = await Follow.find({
          $or: [
            { followerId: targetUser._id, followedId: { $ne: targetUser._id } },
            { followedId: targetUser._id, followerId: { $ne: targetUser._id } },
          ],
        }).populate('followerId', 'username avatar role createdAt').populate('followedId', 'username avatar role createdAt');

        const userMap = new Map();
        followPairs.forEach((pair) => {
          const friend = pair.followerId._id.toString() === targetUser._id.toString()
            ? pair.followedId
            : pair.followerId;
          if (!userMap.has(friend._id.toString())) {
            userMap.set(friend._id.toString(), friend);
          }
        });

        friends = Array.from(userMap.values());
      } else if (mode === 'following') {
        const following = await Follow.find({ followerId: targetUser._id }).populate('followedId', 'username avatar role createdAt');
        friends = following.map((pair) => pair.followedId);
      } else if (mode === 'followers') {
        const followers = await Follow.find({ followedId: targetUser._id }).populate('followerId', 'username avatar role createdAt');
        friends = followers.map((pair) => pair.followerId);
      }

      res.json({
        status: 'success',
        data: friends,
      });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params;

      const user = await User.findOne({ username }).select('id username avatar role emailVerified createdAt');
      if (!user) throw AppError.notFound('User not found');

      res.json({
        status: 'success',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  // Playlists
  async createPlaylist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { title, description, visibility = 'PUBLIC', items = [] } = req.body;

      const playlist = await Playlist.create({
        title,
        description,
        userId,
        visibility,
        items,
      });

      res.json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async getPlaylist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { playlistId } = req.params;

      const playlist = await Playlist.findOne({ _id: playlistId, $or: [{ userId }, { visibility: 'PUBLIC' }] });
      if (!playlist) throw AppError.notFound('Playlist not found');

      res.json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async updatePlaylist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { playlistId } = req.params;
      const { title, description, visibility, items } = req.body;

      const playlist = await Playlist.findOneAndUpdate(
        { _id: playlistId, userId },
        { $set: { ...(title && { title }), ...(description !== undefined && { description }), ...(visibility && { visibility }), ...(items && { items }), updatedAt: new Date() } },
        { new: true }
      );

      if (!playlist) throw AppError.notFound('Playlist not found');

      res.json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async deletePlaylist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { playlistId } = req.params;

      const playlist = await Playlist.findOneAndDelete({ _id: playlistId, userId });
      if (!playlist) throw AppError.notFound('Playlist not found');

      res.json({ status: 'success', message: 'Playlist deleted' });
    } catch (error) {
      next(error);
    }
  },

  async addItemToPlaylist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { playlistId } = req.params;
      const { mediaId, progress = 0, rating = null, notes = null } = req.body;

      const playlist = await Playlist.findOneAndUpdate(
        { _id: playlistId, userId },
        { $push: { items: { mediaId, addedAt: new Date(), progress, rating, notes } }, updatedAt: new Date() },
        { new: true }
      );

      if (!playlist) throw AppError.notFound('Playlist not found');

      res.json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async removeItemFromPlaylist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { playlistId, mediaId } = req.params;

      const playlist = await Playlist.findOneAndUpdate(
        { _id: playlistId, userId },
        { $pull: { items: { mediaId } }, updatedAt: new Date() },
        { new: true }
      );

      if (!playlist) throw AppError.notFound('Playlist not found');

      res.json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async getUserPlaylists(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const playlists = await Playlist.find({ userId }).sort({ createdAt: -1 });

      res.json({ status: 'success', data: playlists });
    } catch (error) {
      next(error);
    }
  },

  // Notifications
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

      res.json({ status: 'success', data: notifications });
    } catch (error) {
      next(error);
    }
  },

  async markNotificationAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { notificationId } = req.params;

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { $set: { read: true } },
        { new: true }
      );

      if (!notification) throw AppError.notFound('Notification not found');

      res.json({ status: 'success', data: notification });
    } catch (error) {
      next(error);
    }
  },

  // Avatar upload
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { image } = req.body as { image: string };

      if (!config.imgbb.apiKey) throw AppError.badGateway('Image upload service is not configured');

      const match = /^data:(image\/[a-zA-Z]+);base64,(.+)$/.exec(image);
      if (!match) throw AppError.badRequest('Invalid image data');
      const mime = match[1];
      if (!config.upload.allowedMimeTypes.includes(mime)) {
        throw AppError.badRequest('Only JPG, PNG, or WebP images are allowed');
      }
      const base64 = match[2];
      const sizeBytes = Math.floor((base64.length * 3) / 4);
      if (sizeBytes > config.upload.maxFileSize) {
        throw AppError.badRequest('Image exceeds the 10MB limit');
      }

      const form = new FormData();
      form.append('key', config.imgbb.apiKey);
      form.append('image', base64);

      const response = await fetch(config.imgbb.baseUrl, { method: 'POST', body: form });
      const json: any = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success || !json?.data) {
        throw AppError.badGateway(json?.error?.message || 'Image upload failed');
      }

      const avatarUrl = json.data.display_url || json.data.url;
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { avatar: avatarUrl } },
        { new: true }
      ).select('id email username avatar role emailVerified createdAt');

      res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  },

  // Existing methods...
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { username, email } = req.body;

      if (username) {
        const existing = await User.findOne({ username, _id: { $ne: userId } });
        if (existing) throw AppError.badRequest('Username already taken');
      }

      if (email) {
        const existing = await User.findOne({ email, _id: { $ne: userId } });
        if (existing) throw AppError.badRequest('Email already taken');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { ...(username && { username }), ...(email && { email }) } },
        { new: true }
      ).select('id email username avatar role emailVerified createdAt');

      res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId).select('+passwordHash');
      if (!user) throw AppError.notFound('User not found');

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw AppError.badRequest('Current password is incorrect');

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await User.updateOne({ _id: userId }, { $set: { passwordHash } });

      res.json({ status: 'success', message: 'Password updated' });
    } catch (error) {
      next(error);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const [watchCount, watchlistCount, ratingCount, distinctMedia, historyDays] = await Promise.all([
        WatchHistory.countDocuments({ userId }),
        WatchlistItem.countDocuments({ userId }),
        Rating.countDocuments({ userId }),
        WatchHistory.distinct('mediaId', { userId }),
        WatchHistory.distinct('watchedAt', { userId }),
      ]);

      // Streak: consecutive days with at least one watch event
      const days = [...new Set(
        historyDays.map((d: Date) => new Date(d).toISOString().slice(0, 10))
      )].sort();
      let streak = 0;
      const today = new Date().toISOString().slice(0, 10);
      const cursor = new Date(today);
      const daySet = new Set(days);
      if (daySet.has(today) || daySet.has(new Date(Date.now() - 86400000).toISOString().slice(0, 10))) {
        for (let i = 0; i < 366; i++) {
          const key = cursor.toISOString().slice(0, 10);
          if (daySet.has(key)) streak++;
          else break;
          cursor.setDate(cursor.getDate() - 1);
        }
      }

      res.json({
        status: 'success',
        data: {
          totalWatches: watchCount,
          watchlistCount,
          ratingCount,
          titlesWatched: distinctMedia.length,
          streakDays: streak,
          activityDays: days.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

async function createNotification(
  recipientId: string,
  senderId: string,
  type: string,
  title: string,
  link?: string
) {
  await Notification.create({
    userId: recipientId,
    type,
    title,
    body: `${(await User.findById(senderId)).username} ${type.toLowerCase().replace('_', ' ')}`,
    link,
    relatedUserId: senderId,
    createdAt: new Date(),
  });
}

