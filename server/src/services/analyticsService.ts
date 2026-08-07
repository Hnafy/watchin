import { Media, AdminMediaInput, User, Rating, PageView, DailyStat, SiteSetting, WatchHistory, WatchlistItem, WatchlistFolder, Notification, RefreshToken, Comment, BlockedEmail, Season, Episode, TrendingMedia } from '../db/models.js';
import { subDays, startOfDay, format } from 'date-fns';
import { escapeRegex, attachCountsToMedia, mediaCountsMap, userCountsMap } from '../db/utils.js';
import { createNotification } from './notificationService.js';
import { sendWarningEmail, sendBannedEmail } from './emailService.js';

export const analyticsService = {
  async trackPageView(path: string, mediaId?: string, ip?: string, userAgent?: string, referer?: string) {
    const ipHash = ip ? require('crypto').createHash('sha256').update(ip).digest('hex').slice(0, 16) : null;

    await PageView.create({ path, mediaId: mediaId || null, ipHash, userAgent, referer });

    const today = startOfDay(new Date());
    await DailyStat.updateOne(
      { date: today },
      { $inc: { totalViews: 1 } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  },

  async getDashboardStats() {
    const today = startOfDay(new Date());
    const yesterday = startOfDay(subDays(new Date(), 1));
    await this.ensureTodayExists(today);

    const [totalMedia, pendingMedia, totalUsers, viewAgg, totalRatings, activeUsers, todayStat, yesterdayStat] =
      await Promise.all([
        Media.countDocuments(),
        AdminMediaInput.countDocuments({ reviewStatus: 'PENDING' }),
        User.countDocuments(),
        Media.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
        Rating.countDocuments(),
        User.countDocuments({ lastLoginAt: { $gte: subDays(new Date(), 7) } }),
        DailyStat.findOne({ date: today }),
        DailyStat.findOne({ date: yesterday }),
      ]);

    return {
      totalMedia,
      pendingMedia,
      totalUsers,
      totalViews: viewAgg[0]?.total || 0,
      totalRatings,
      activeUsers,
      todayViews: todayStat?.totalViews || 0,
      yesterdayViews: yesterdayStat?.totalViews || 0,
    };
  },

  async getViewsByDay(days = 30) {
    const since = startOfDay(subDays(new Date(), days));
    const stats = await DailyStat.find({ date: { $gte: since } }).sort({ date: 1 });

    const filled: Array<{ date: string; views: number; uniqueViews: number; newUsers: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const key = format(date, 'yyyy-MM-dd');
      const found = stats.find((s) => format(s.date, 'yyyy-MM-dd') === key);
      filled.push({
        date: key,
        views: found?.totalViews || 0,
        uniqueViews: found?.uniqueViews || 0,
        newUsers: found?.newUsers || 0,
      });
    }
    return filled;
  },

  async getAllMedia(page = 1, limit = 20, search?: string, type?: string) {
    const where: any = {};
    if (search) where.title = { $regex: escapeRegex(search), $options: 'i' };
    if (type) where.type = type;

    const [docs, total] = await Promise.all([
      Media.find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Media.countDocuments(where),
    ]);

    const counts = await mediaCountsMap(docs.map((d) => d._id));
    const data = attachCountsToMedia(docs, counts);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async deleteMedia(id: string) {
    const media = await Media.findById(id);
    if (!media) return false;

    await Promise.all([
      Media.deleteOne({ _id: id }),
      Season.deleteMany({ mediaId: id }),
      Episode.deleteMany({ mediaId: id }),
      Rating.deleteMany({ mediaId: id }),
      WatchlistItem.deleteMany({ mediaId: id }),
      WatchHistory.deleteMany({ mediaId: id }),
      TrendingMedia.deleteMany({ mediaId: id }),
      PageView.deleteMany({ mediaId: id }),
    ]);

    return true;
  },

  async getMediaAnalytics(id: string) {
    const media = await Media.findById(id);
    if (!media) return null;

    const [ratings, totalRatings, totalWatchlist, totalWatches] = await Promise.all([
      Rating.find({ mediaId: id }).select('value'),
      Rating.countDocuments({ mediaId: id }),
      WatchlistItem.countDocuments({ mediaId: id }),
      WatchHistory.countDocuments({ mediaId: id }),
    ]);

    const avgRating = ratings.length
      ? ratings.reduce((s, r) => s + r.value, 0) / ratings.length
      : 0;

    return {
      id: media.id,
      title: media.title,
      viewCount: media.viewCount,
      avgRating,
      totalRatings,
      totalWatchlist,
      totalWatches,
    };
  },

  async getAllUsers(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) {
      const term = escapeRegex(search);
      where.$or = [
        { email: { $regex: term, $options: 'i' } },
        { username: { $regex: term, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('id email username avatar role emailVerified createdAt lastLoginAt warningCount isBanned'),
      User.countDocuments(where),
    ]);

    const counts = await userCountsMap(users.map((u) => u._id));
    const data = users.map((u) => {
      const json = u.toJSON() as any;
      json._count = counts[u.id] || { watchHistory: 0, ratings: 0, watchlistItems: 0 };
      return json;
    });

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async updateUserRole(id: string, role: string) {
    return User.findByIdAndUpdate(id, { $set: { role } }, { new: true });
  },

  async updateUserVerified(id: string, emailVerified: boolean) {
    return User.findByIdAndUpdate(id, { $set: { emailVerified: Boolean(emailVerified) } }, { new: true });
  },

  /**
   * Sends an "alarm" (warning) to a user, typically for filing false reports.
   * After 4 warnings the user's email is blocked and the account deleted.
   * Returns { warningCount, banned, deleted }.
   */
  async warnUser(id: string, adminId: string, reason?: string) {
    const user = await User.findById(id);
    if (!user) return null;

    const nextCount = (user.warningCount || 0) + 1;
    const banned = nextCount >= 4;

    await User.updateOne({ _id: id }, { $set: { warningCount: nextCount, isBanned: banned } });

    const note = reason ? reason.trim() : 'Repeated false reports';
    const link = '/notifications';

    if (banned) {
      await BlockedEmail.create({
        email: user.email.toLowerCase(),
        note: `Auto-blocked after ${nextCount} warnings: ${note}`,
        blockedBy: adminId,
      }).catch(() => {});
      await Comment.updateMany(
        { userId: id },
        { $set: { hidden: true, moderationStatus: 'FLAGGED' } }
      );
      await this.deleteUser(id);
      sendBannedEmail(user.email).catch(() => {});
      return { warningCount: nextCount, banned, deleted: true };
    }

    await createNotification({
      userId: id,
      type: 'WARNING',
      title: `Warning ${nextCount}/4`,
      body: note,
      link,
      relatedUserId: adminId,
    });
    sendWarningEmail(user.email, nextCount).catch(() => {});

    return { warningCount: nextCount, banned: false, deleted: false };
  },

  async deleteUser(id: string) {
    await Promise.all([
      User.deleteOne({ _id: id }),
      WatchHistory.deleteMany({ userId: id }),
      Rating.deleteMany({ userId: id }),
      WatchlistItem.deleteMany({ userId: id }),
      WatchlistFolder.deleteMany({ userId: id }),
      Notification.deleteMany({ $or: [{ userId: id }, { relatedUserId: id }] }),
      RefreshToken.deleteMany({ userId: id }),
      Comment.deleteMany({ userId: id }),
    ]);
  },

  async getSettings(group?: string) {
    const where = group ? { group } : {};
    return SiteSetting.find(where);
  },

  async updateSetting(key: string, value: any, label?: string, group?: string) {
    return SiteSetting.findOneAndUpdate(
      { key },
      { $set: { value }, $setOnInsert: { key, label, group } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  },

  async ensureTodayExists(today: Date) {
    await DailyStat.updateOne(
      { date: today },
      { $setOnInsert: { date: today, totalViews: 0, uniqueViews: 0, newUsers: 0, totalWatches: 0 } },
      { upsert: true }
    );
  },
};
