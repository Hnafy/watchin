import { WatchlistItem, Media } from '../db/models.js';
import { AppError } from '../utils/AppError.js';
import { mediaCountsMap } from '../db/utils.js';

export const watchlistService = {
  async getWatchlist(userId: string, page = 1, limit = 20) {
    const where = { userId };
    const [items, total] = await Promise.all([
      WatchlistItem.find(where)
        .sort({ addedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('media'),
      WatchlistItem.countDocuments(where),
    ]);

    const mediaDocs = items.map((i: any) => i.media).filter(Boolean);
    const counts = await mediaCountsMap(mediaDocs.map((m: any) => m._id));
    const data = items.map((i: any) => {
      const json = i.toJSON();
      if (json.media && counts[json.media.id]) {
        json.media._count = counts[json.media.id];
      }
      return json;
    });

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async addToWatchlist(userId: string, mediaId: string) {
    const media = await Media.findById(mediaId);
    if (!media) throw AppError.notFound('Media not found');

    const item = await WatchlistItem.findOneAndUpdate(
      { userId, mediaId },
      { $setOnInsert: { userId, mediaId, addedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('media');

    return item;
  },

  async removeFromWatchlist(userId: string, mediaId: string) {
    await WatchlistItem.deleteOne({ userId, mediaId });
  },

  async isInWatchlist(userId: string, mediaId: string) {
    const item = await WatchlistItem.findOne({ userId, mediaId });
    return !!item;
  },

  async getWatchlistCount(userId: string) {
    return WatchlistItem.countDocuments({ userId });
  },

  async clearWatchlist(userId: string) {
    await WatchlistItem.deleteMany({ userId });
  },
};
