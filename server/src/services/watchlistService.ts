import { WatchlistItem, WatchlistFolder, Media, isValidId } from '../db/models.js';
import { AppError } from '../utils/AppError.js';
import { mediaCountsMap } from '../db/utils.js';

export const watchlistService = {
  async getWatchlist(userId: string, page = 1, limit = 20, folderId?: string) {
    const where: any = { userId };
    if (folderId === 'none') {
      where.folderId = null;
    } else if (folderId && isValidId(folderId)) {
      where.folderId = folderId;
    }
    const [items, total] = await Promise.all([
      WatchlistItem.find(where)
        .sort({ addedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('media')
        .populate({ path: 'folder', select: 'name icon' }),
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

  async getFolders(userId: string) {
    const [folders, uncategorized] = await Promise.all([
      WatchlistFolder.find({ userId }).sort({ createdAt: 1 }).lean(),
      WatchlistItem.countDocuments({ userId, folderId: null }),
    ]);
    const data = folders.map((f: any) => ({ ...f, id: f._id.toString(), _count: 0 }));
    const counts = await WatchlistItem.aggregate([
      { $match: { userId: userId as any, folderId: { $ne: null } } },
      { $group: { _id: '$folderId', n: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>(counts.map((c: any) => [String(c._id), c.n] as [string, number]));
    data.forEach((f: any) => { f._count = countMap.get(f.id) || 0; });
    return { data, uncategorized };
  },

  async createFolder(userId: string, name: string, icon?: string | null) {
    const clean = (name || '').trim();
    if (!clean) throw AppError.badRequest('Folder name is required');
    if (clean.length > 60) throw AppError.badRequest('Folder name is too long');
    const existing = await WatchlistFolder.findOne({ userId, name: clean });
    if (existing) throw AppError.badRequest('A folder with this name already exists');
    const folder = await WatchlistFolder.create({ userId, name: clean, icon: icon || null });
    return folder;
  },

  async renameFolder(userId: string, folderId: string, name: string, icon?: string | null) {
    const clean = (name || '').trim();
    if (!clean) throw AppError.badRequest('Folder name is required');
    const folder = await WatchlistFolder.findOneAndUpdate(
      { _id: folderId, userId },
      { $set: { name: clean, ...(icon !== undefined ? { icon: icon || null } : {}) } },
      { new: true }
    );
    if (!folder) throw AppError.notFound('Folder not found');
    return folder;
  },

  async deleteFolder(userId: string, folderId: string) {
    const folder = await WatchlistFolder.findOneAndDelete({ _id: folderId, userId });
    if (!folder) throw AppError.notFound('Folder not found');
    // Items in the deleted folder fall back to "uncategorized".
    await WatchlistItem.updateMany({ userId, folderId }, { $set: { folderId: null } });
    return true;
  },

  async addToWatchlist(userId: string, mediaId: string, folderId?: string | null) {
    const media = await Media.findById(mediaId);
    if (!media) throw AppError.notFound('Media not found');

    let folder: { _id: unknown } | null = null;
    if (folderId && isValidId(folderId)) {
      folder = await WatchlistFolder.findOne({ _id: folderId, userId });
      if (!folder) throw AppError.badRequest('Folder not found');
    }

    const item = await WatchlistItem.findOneAndUpdate(
      { userId, mediaId },
      { $set: { folderId: folder ? folder._id : null }, $setOnInsert: { userId, mediaId, addedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('media');

    return item;
  },

  async moveToFolder(userId: string, mediaId: string, folderId?: string | null) {
    let folder: { _id: unknown } | null = null;
    if (folderId && isValidId(folderId)) {
      folder = await WatchlistFolder.findOne({ _id: folderId, userId });
      if (!folder) throw AppError.badRequest('Folder not found');
    }
    const item = await WatchlistItem.findOneAndUpdate(
      { userId, mediaId },
      { $set: { folderId: folder ? folder._id : null } },
      { new: true }
    );
    if (!item) throw AppError.notFound('Not in watchlist');
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
