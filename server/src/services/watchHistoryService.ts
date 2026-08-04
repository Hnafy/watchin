import { WatchHistory, Media } from '../db/models';
import { AppError } from '../utils/AppError';
import { mediaCountsMap } from '../db/utils';

export const watchHistoryService = {
  async updateProgress(
    userId: string,
    mediaId: string,
    progress: number,
    duration: number,
    episodeId?: string,
    seasonNumber?: number,
    episodeNumber?: number
  ) {
    const media = await Media.findById(mediaId);
    if (!media) throw AppError.notFound('Media not found');

    const completed = progress >= duration * 0.9;

    const existing = await WatchHistory.findOne({
      userId,
      mediaId,
      episodeId: episodeId || null,
    });

    let history;
    if (existing) {
      existing.progress = progress;
      existing.duration = duration;
      existing.completed = completed;
      existing.seasonNumber = seasonNumber ?? null;
      existing.episodeNumber = episodeNumber ?? null;
      existing.watchedAt = new Date();
      history = await existing.save();
    } else {
      history = await WatchHistory.create({
        userId,
        mediaId,
        episodeId: episodeId || null,
        progress,
        duration,
        completed,
        seasonNumber: seasonNumber ?? null,
        episodeNumber: episodeNumber ?? null,
      });
    }

    return history;
  },

  async getContinueWatching(userId: string, limit = 10) {
    const items = await WatchHistory.find({
      userId,
      completed: false,
      progress: { $gt: 60 },
    })
      .sort({ watchedAt: -1 })
      .limit(limit)
      .populate('media')
      .populate('episode');

    const mediaDocs = items.map((i: any) => i.media).filter(Boolean);
    const counts = await mediaCountsMap(mediaDocs.map((m: any) => m._id));
    return items.map((i: any) => {
      const json = i.toJSON();
      if (json.media && counts[json.media.id]) {
        json.media._count = counts[json.media.id];
      }
      return json;
    });
  },

  async getWatchHistory(userId: string, page = 1, limit = 20) {
    const [history, total] = await Promise.all([
      WatchHistory.find({ userId })
        .sort({ watchedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('media')
        .populate('episode'),
      WatchHistory.countDocuments({ userId }),
    ]);

    const mediaDocs = history.map((i: any) => i.media).filter(Boolean);
    const counts = await mediaCountsMap(mediaDocs.map((m: any) => m._id));
    const data = history.map((i: any) => {
      const json = i.toJSON();
      if (json.media && counts[json.media.id]) {
        json.media._count = counts[json.media.id];
      }
      return json;
    });

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async markCompleted(userId: string, mediaId: string, episodeId?: string) {
    await WatchHistory.updateMany(
      { userId, mediaId, episodeId: episodeId || null },
      { $set: { completed: true } }
    );
  },

  async deleteHistoryItem(userId: string, historyId: string) {
    const item = await WatchHistory.findOne({ _id: historyId, userId });
    if (!item) throw AppError.notFound('History item not found');
    await item.deleteOne();
  },

  async clearAllHistory(userId: string) {
    await WatchHistory.deleteMany({ userId });
  },
};
