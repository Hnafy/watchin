import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User, RefreshToken, WatchHistory, WatchlistItem, Rating, FriendRequest, Follow, ProfileLike, Playlist, Notification } from '../db/models.js';
import { escapeRegex } from '../db/utils.js';
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

async function createNotification(
  recipientId: string,
  senderId: string,
  type: string,
  title: string,
  link?: string
) {
  const sender = await User.findById(senderId).select('username');
  await Notification.create({
    userId: recipientId,
    type,
    title,
    body: sender ? `${sender.username} ${type.toLowerCase().replace('_', ' ')}` : title,
    link,
    relatedUserId: senderId,
  });
}

async function getFriendCount(userId: any): Promise<number> {
  const [following, followers] = await Promise.all([
    Follow.find({ followerId: userId }).select('followedId'),
    Follow.find({ followedId: userId }).select('followerId'),
  ]);
  const followerIds = new Set(followers.map((f) => String(f.followerId)));
  return following.filter((f) => followerIds.has(String(f.followedId))).length;
}

async function getUsername(id: string): Promise<string> {
  const u = await User.findById(id).select('username');
  return u?.username ?? 'Someone';
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
        ProfileLike.deleteMany({ $or: [{ userId: userId }, { likerId: userId }] }),
        Notification.deleteMany({ $or: [{ userId: userId }, { relatedUserId: userId }] }),
      ]);
      res.json({ status: 'success', message: 'Account deleted' });
    } catch (error) {
      next(error);
    }
  },

  // Public profile (optionally authenticated) with counts + public playlists
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params;
      const viewerId = (req as any).user?.id || null;

      const user = await User.findOne({ username }).select('id username avatar role emailVerified createdAt');
      if (!user) throw AppError.notFound('User not found');
      const userId = (user as any)._id;

      const [followerCount, followingCount, likeCount, publicPlaylists, isFollowing, isBackFollowing, hasLiked, sentRequest, receivedRequest] = await Promise.all([
        Follow.countDocuments({ followedId: userId }),
        Follow.countDocuments({ followerId: userId }),
        ProfileLike.countDocuments({ userId }),
        Playlist.find({ userId, visibility: 'PUBLIC' })
          .sort({ createdAt: -1 })
          .limit(12)
          .select('title description coverImage visibility likeCount saveCount items createdAt updatedAt')
          .populate({ path: 'items.mediaId', select: 'title slug posterUrl' }),
        viewerId ? Follow.exists({ followerId: viewerId, followedId: userId }) : Promise.resolve(null),
        viewerId ? Follow.exists({ followerId: userId, followedId: viewerId }) : Promise.resolve(null),
        viewerId ? ProfileLike.exists({ userId, likerId: viewerId }) : Promise.resolve(null),
        viewerId
          ? FriendRequest.findOne({ fromUserId: viewerId, toUserId: userId, status: 'PENDING' })
          : Promise.resolve(null),
        viewerId
          ? FriendRequest.findOne({ fromUserId: userId, toUserId: viewerId, status: 'PENDING' })
          : Promise.resolve(null),
      ]);

      const friendCount = await getFriendCount(userId);

      res.json({
        status: 'success',
        data: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          stats: {
            followers: followerCount,
            following: followingCount,
            friends: friendCount,
            likes: likeCount,
          },
          publicPlaylists,
          relationship: {
            isFollowing: !!isFollowing,
            isFriend: !!(isFollowing && isBackFollowing),
            hasLiked: !!hasLiked,
            requestStatus: sentRequest ? 'sent' : receivedRequest ? 'received' : null,
            requestId: sentRequest ? sentRequest.id : receivedRequest ? receivedRequest.id : null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Search users (optionally authenticated) with follow/friend relation
  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const viewerId = (req as any).user?.id || null;
      const q = (typeof req.query.q === 'string' ? req.query.q : '').trim();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Number(req.query.limit) || 20);

      const where: any = {};
      if (q) {
        where.$or = [
          { username: { $regex: escapeRegex(q), $options: 'i' } },
        ];
      }

      const [users, total] = await Promise.all([
        User.find(where)
          .select('id username avatar role createdAt')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        User.countDocuments(where),
      ]);

      const userIds = users.map((u: any) => u._id);
      const [followedByMe, sentTo, receivedFrom, countRows] = userIds.length
        ? await Promise.all([
            viewerId ? Follow.find({ followerId: viewerId, followedId: { $in: userIds } }).select('followedId') : Promise.resolve([]),
            viewerId ? FriendRequest.find({ fromUserId: viewerId, toUserId: { $in: userIds }, status: 'PENDING' }).select('toUserId') : Promise.resolve([]),
            viewerId ? FriendRequest.find({ fromUserId: { $in: userIds }, toUserId: viewerId, status: 'PENDING' }).select('fromUserId') : Promise.resolve([]),
            Follow.aggregate([
              { $match: { followedId: { $in: userIds } } },
              { $group: { _id: '$followedId', count: { $sum: 1 } } },
            ]),
          ])
        : [[], [], [], []];

      const followingSet = new Set(followedByMe.map((f: any) => String(f.followedId)));
      const sentSet = new Set(sentTo.map((f: any) => String(f.toUserId)));
      const receivedSet = new Set(receivedFrom.map((f: any) => String(f.fromUserId)));
      const followerCounts = new Map(countRows.map((r: any) => [String(r._id), r.count]));

      const data = users.map((u: any) => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        role: u.role,
        createdAt: u.createdAt,
        followerCount: followerCounts.get(String(u._id)) || 0,
        isFollowing: followingSet.has(String(u._id)),
        friendStatus: sentSet.has(String(u._id))
          ? 'sent'
          : receivedSet.has(String(u._id))
            ? 'received'
            : null,
      }));

      res.json({
        status: 'success',
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
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
      if (!(await User.exists({ _id: toUserId }))) throw AppError.notFound('User not found');

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
        await Promise.all([
          Follow.updateOne(
            { followerId: fromUserId, followedId: toUserId },
            { $setOnInsert: { followerId: fromUserId, followedId: toUserId } },
            { upsert: true }
          ),
          Follow.updateOne(
            { followerId: toUserId, followedId: fromUserId },
            { $setOnInsert: { followerId: toUserId, followedId: fromUserId } },
            { upsert: true }
          ),
        ]);
        const myName = await getUsername(fromUserId);
        await Promise.all([
          createNotification(fromUserId, toUserId, 'FRIEND_REQUEST', `You are now friends with ${myName}`, `/user/${fromUserId}`),
          createNotification(toUserId, fromUserId, 'FRIEND_REQUEST', `${myName} accepted your friend request!`, `/user/${fromUserId}`),
        ]);
        res.json({ status: 'success', message: 'Friend request accepted', data: { accepted: true } });
        return;
      }

      await FriendRequest.create({ fromUserId, toUserId, status: 'PENDING' });
      const myName = await getUsername(fromUserId);
      await createNotification(toUserId, fromUserId, 'FRIEND_REQUEST', `${myName} sent you a friend request`, `/user/${fromUserId}`);

      res.json({ status: 'success', message: 'Friend request sent' });
    } catch (error) {
      next(error);
    }
  },

  async respondFriendRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { requestId } = req.params;
      const { action } = req.body;

      const request = await FriendRequest.findById(requestId);
      if (!request) throw AppError.notFound('Friend request not found');
      if (String(request.toUserId) !== userId) throw AppError.forbidden('Not authorized to respond');
      if (request.status !== 'PENDING') throw AppError.badRequest('This request has already been handled');

      const otherId = String(request.fromUserId);
      const other = await User.findById(otherId).select('username');

      if (action === 'accept') {
        request.status = 'ACCEPTED';
        await request.save();
        await Promise.all([
          Follow.updateOne(
            { followerId: otherId, followedId: userId },
            { $setOnInsert: { followerId: otherId, followedId: userId } },
            { upsert: true }
          ),
          Follow.updateOne(
            { followerId: userId, followedId: otherId },
            { $setOnInsert: { followerId: userId, followedId: otherId } },
            { upsert: true }
          ),
        ]);
        const myName = await getUsername(userId);
        await createNotification(otherId, userId, 'FRIEND_REQUEST', `${myName} accepted your friend request!`, `/user/${userId}`);
        res.json({ status: 'success', message: 'Friend request accepted' });
      } else {
        request.status = 'DECLINED';
        await request.save();
        if (other) {
          const myName = await getUsername(userId);
          await createNotification(otherId, userId, 'FRIEND_REQUEST', `${myName} declined your friend request`, `/user/${userId}`);
        }
        res.json({ status: 'success', message: 'Friend request declined' });
      }
    } catch (error) {
      next(error);
    }
  },

  async cancelFriendRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { requestId } = req.params;

      const request = await FriendRequest.findById(requestId);
      if (!request) throw AppError.notFound('Friend request not found');
      if (String(request.fromUserId) !== userId) throw AppError.forbidden('Not authorized to cancel');

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

      await Follow.deleteMany({
        $or: [
          { followerId: userId, followedId: friendId },
          { followerId: friendId, followedId: userId },
        ],
      });
      res.json({ status: 'success', message: 'Friend removed' });
    } catch (error) {
      next(error);
    }
  },

  // Follow / Unfollow
  async toggleFollow(req: Request, res: Response, next: NextFunction) {
    try {
      const followerId = (req as any).user.id;
      const { followingId } = req.body;

      if (followerId === followingId) throw AppError.badRequest('Cannot follow yourself');
      if (!(await User.exists({ _id: followingId }))) throw AppError.notFound('User not found');

      const existing = await Follow.findOne({ followerId, followedId: followingId });
      if (existing) {
        await Follow.deleteOne({ _id: existing._id });
        res.json({ status: 'success', message: 'Unfollowed', data: { following: false } });
        return;
      }

      await Follow.create({ followerId, followedId: followingId });
      const myName = await getUsername(followerId);
      await Notification.create({
        userId: followingId,
        type: 'FOLLOW',
        title: `${myName} started following you`,
        body: `${myName} started following you`,
        link: `/user/${followerId}`,
        relatedUserId: followerId,
      });
      res.json({ status: 'success', message: 'Following', data: { following: true } });
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
      res.json({ status: 'success', data: { followers, followings } });
    } catch (error) {
      next(error);
    }
  },

  // List friends / followers / following of a user by username
  async getUserFriends(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params;
      const mode = (req.query.mode as string) || 'friends';

      const user = await User.findOne({ username });
      if (!user) throw AppError.notFound('User not found');
      const userId = (user as any)._id;

      let ids: any[] = [];
      if (mode === 'following') {
        const rows = await Follow.find({ followerId: userId }).select('followedId');
        ids = rows.map((r) => r.followedId);
      } else if (mode === 'followers') {
        const rows = await Follow.find({ followedId: userId }).select('followerId');
        ids = rows.map((r) => r.followerId);
      } else {
        const [followingRows, followerRows] = await Promise.all([
          Follow.find({ followerId: userId }).select('followedId'),
          Follow.find({ followedId: userId }).select('followerId'),
        ]);
        const followerIds = new Set(followerRows.map((r) => String(r.followerId)));
        ids = followingRows.filter((r) => followerIds.has(String(r.followedId))).map((r) => r.followedId);
      }

      const users = await User.find({ _id: { $in: ids } })
        .select('id username avatar role createdAt')
        .sort({ username: 1 });

      res.json({ status: 'success', data: users });
    } catch (error) {
      next(error);
    }
  },

  // Like / unlike a user's profile
  async toggleProfileLike(req: Request, res: Response, next: NextFunction) {
    try {
      const likerId = (req as any).user.id;
      const { userId } = req.body;

      if (likerId === userId) throw AppError.badRequest('Cannot like your own profile');
      if (!(await User.exists({ _id: userId }))) throw AppError.notFound('User not found');

      const existing = await ProfileLike.findOne({ userId, likerId });
      if (existing) {
        await ProfileLike.deleteOne({ _id: existing._id });
        res.json({ status: 'success', data: { liked: false } });
        return;
      }

      await ProfileLike.create({ userId, likerId });
      const myName = await getUsername(likerId);
      await Notification.create({
        userId,
        type: 'LIKE',
        title: `${myName} liked your profile`,
        body: `${myName} liked your profile`,
        link: `/user/${likerId}`,
        relatedUserId: likerId,
      });
      res.json({ status: 'success', data: { liked: true } });
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
