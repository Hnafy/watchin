import { Playlist, Media, Notification, User, isValidId } from '../db/models.js';
import { AppError } from '../utils/AppError.js';

export const playlistService = {
  async create(userId: string, title: string, description?: string | null, visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC') {
    const playlist = await Playlist.create({
      title,
      description: description || null,
      coverImage: null,
      userId,
      visibility,
    });
    return playlist;
  },

  async getUserPlaylists(userId: string) {
    return Playlist.find({ userId })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar role');
  },

  async getPublicPlaylists(page = 1, limit = 20, search?: string, sortBy = 'trending') {
    const skip = (page - 1) * limit;
    const where: any = { visibility: 'PUBLIC' };
    if (search) {
      where.title = { $regex: search, $options: 'i' };
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      trending: { likeCount: -1, createdAt: -1 },
      latest: { createdAt: -1 },
      mostLiked: { likeCount: -1, createdAt: -1 },
      mostSaved: { saveCount: -1, createdAt: -1 },
    };

    const [items, total] = await Promise.all([
      Playlist.find(where)
        .sort(sortMap[sortBy] || sortMap.trending)
        .skip(skip)
        .limit(Math.min(limit, 50))
        .populate('user', 'username avatar role'),
      Playlist.countDocuments(where),
    ]);

    return {
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getTrendingPlaylists(limit = 10) {
    return Playlist.find({ visibility: 'PUBLIC' })
      .sort({ likeCount: -1, createdAt: -1 })
      .limit(limit)
      .populate('user', 'username avatar role');
  },

  async getPlaylist(playlistId: string, userId?: string) {
    if (!isValidId(playlistId)) throw AppError.badRequest('Invalid playlist id');

    const where: any = { _id: playlistId };
    if (userId) {
      where.$or = [{ userId }, { visibility: 'PUBLIC' }];
    } else {
      where.visibility = 'PUBLIC';
    }

    const playlist = await Playlist.findOne(where)
      .populate('user', 'username avatar role')
      .populate('items.mediaId', 'title slug posterUrl type');

    if (!playlist) throw AppError.notFound('Playlist not found');
    return playlist;
  },

  async updatePlaylist(playlistId: string, userId: string, data: {
    title?: string;
    description?: string | null;
    visibility?: 'PUBLIC' | 'PRIVATE';
    coverImage?: string | null;
    items?: Array<{ mediaId: string; progress?: number; rating?: number; notes?: string }>;
  }) {
    const playlist = await Playlist.findOneAndUpdate(
      { _id: playlistId, userId },
      { $set: data },
      { new: true, runValidators: true }
    ).populate('user', 'username avatar role');

    if (!playlist) throw AppError.notFound('Playlist not found or not owned');
    return playlist;
  },

  async deletePlaylist(playlistId: string, userId: string) {
    if (!isValidId(playlistId)) throw AppError.badRequest('Invalid playlist id');
    const playlist = await Playlist.findOneAndDelete({ _id: playlistId, userId });
    if (!playlist) throw AppError.notFound('Playlist not found or not owned');
    return true;
  },

  async addItem(playlistId: string, userId: string, mediaId: string, progress = 0, rating?: number, notes?: string) {
    if (!isValidId(playlistId)) throw AppError.badRequest('Invalid playlist id');
    if (!isValidId(mediaId)) throw AppError.badRequest('Invalid media id');

    const media = await Media.exists({ _id: mediaId });
    if (!media) throw AppError.notFound('Media not found');

    const playlist = await Playlist.findOneAndUpdate(
      { _id: playlistId, userId },
      { $addToSet: { items: { mediaId, progress, rating, notes } } },
      { new: true }
    );

    if (!playlist) throw AppError.notFound('Playlist not found or not owned');
    return playlist;
  },

  async removeItem(playlistId: string, userId: string, mediaId: string) {
    if (!isValidId(playlistId)) throw AppError.badRequest('Invalid playlist id');
    if (!isValidId(mediaId)) throw AppError.badRequest('Invalid media id');

    const playlist = await Playlist.findOneAndUpdate(
      { _id: playlistId, userId },
      { $pull: { items: { mediaId } } },
      { new: true }
    );

    if (!playlist) throw AppError.notFound('Playlist not found or not owned');
    return playlist;
  },

  async toggleLike(playlistId: string, userId: string) {
    if (!isValidId(playlistId)) throw AppError.badRequest('Invalid playlist id');

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw AppError.notFound('Playlist not found');

    const alreadyLiked = playlist.likes.includes(userId as any);

    if (alreadyLiked) {
      playlist.likes = playlist.likes.filter((id) => String(id) !== userId);
      playlist.likeCount = Math.max(0, playlist.likeCount - 1);
    } else {
      playlist.likes.push(userId as any);
      playlist.likeCount += 1;

      if (String(playlist.userId) !== userId) {
        const user = await User.findById(userId).select('username');
        if (user) {
          await Notification.create({
            userId: playlist.userId,
            type: 'LIKE',
            title: 'New like on your playlist',
            body: `${user.username} liked your playlist "${playlist.title}"`,
            link: `/playlists/${playlist.id}`,
            relatedUserId: userId,
            relatedId: playlist.id,
          });
        }
      }
    }

    await playlist.save();
    return { liked: !alreadyLiked, likeCount: playlist.likeCount };
  },

  async toggleSave(playlistId: string, userId: string) {
    if (!isValidId(playlistId)) throw AppError.badRequest('Invalid playlist id');

    const playlist = await Playlist.findById(playlistId);
    if (!playlist || playlist.visibility !== 'PUBLIC') throw AppError.notFound('Playlist not found');

    const alreadySaved = playlist.saves.includes(userId as any);

    if (alreadySaved) {
      playlist.saves = playlist.saves.filter((id) => String(id) !== userId);
      playlist.saveCount = Math.max(0, playlist.saveCount - 1);
    } else {
      playlist.saves.push(userId as any);
      playlist.saveCount += 1;
    }

    await playlist.save();
    return { saved: !alreadySaved, saveCount: playlist.saveCount };
  },

  async forkPlaylist(playlistId: string, userId: string) {
    if (!isValidId(playlistId)) throw AppError.badRequest('Invalid playlist id');

    const original = await Playlist.findById(playlistId)
      .populate('items.mediaId', 'title slug posterUrl type');

    if (!original || original.visibility !== 'PUBLIC') {
      throw AppError.notFound('Playlist not found');
    }

    const forked = await Playlist.create({
      title: `${original.title} (Forked)`,
      description: original.description,
      coverImage: original.coverImage,
      userId,
      visibility: 'PRIVATE',
      items: original.items.map((item: any) => ({
        mediaId: item.mediaId,
        addedAt: new Date(),
      })),
      forkedFrom: original._id,
    });

    await Playlist.findByIdAndUpdate(original._id, { $inc: { forkCount: 1 } });

    await Notification.create({
      userId: original.userId,
      type: 'PLAYLIST',
      title: 'Your playlist was forked',
      body: `${(await User.findById(userId))?.username || 'Someone'} forked your playlist "${original.title}"`,
      link: `/playlists/${forked.id}`,
      relatedUserId: userId,
      relatedId: original.id,
    });

    return forked;
  },

  async getUserPlaylistsCount(userId: string) {
    return Playlist.countDocuments({ userId });
  },
};