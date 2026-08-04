import { Rating, Media } from '../db/models';
import { AppError } from '../utils/AppError';

export const ratingService = {
  async rateMedia(userId: string, mediaId: string, value: number) {
    if (value < 1 || value > 10) {
      throw AppError.badRequest('Rating must be between 1 and 10');
    }

    const media = await Media.findById(mediaId);
    if (!media) throw AppError.notFound('Media not found');

    const rating = await Rating.findOneAndUpdate(
      { userId, mediaId },
      { $set: { value } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await this.updateMediaRating(mediaId);

    return rating;
  },

  async getUserRating(userId: string, mediaId: string) {
    const rating = await Rating.findOne({ userId, mediaId });
    return rating?.value || null;
  },

  async getMediaRatings(mediaId: string, page = 1, limit = 20) {
    const [ratings, total] = await Promise.all([
      Rating.find({ mediaId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: 'user', select: 'username avatar' }),
      Rating.countDocuments({ mediaId }),
    ]);

    return { data: ratings, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getMediaRatingStats(mediaId: string) {
    const [avg, counts] = await Promise.all([
      Rating.aggregate([
        { $match: { mediaId } },
        { $group: { _id: null, avg: { $avg: '$value' }, count: { $sum: 1 } } },
      ]),
      Rating.aggregate([
        { $match: { mediaId } },
        { $group: { _id: '$value', n: { $sum: 1 } } },
      ]),
    ]);

    const distMap: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) distMap[i] = 0;
    counts.forEach((d) => { distMap[d._id] = d.n; });

    const stat = avg[0] || { avg: 0, count: 0 };

    return {
      average: stat.avg || 0,
      count: stat.count,
      distribution: distMap,
    };
  },

  async updateMediaRating(mediaId: string) {
    const avg = await Rating.aggregate([
      { $match: { mediaId } },
      { $group: { _id: null, avg: { $avg: '$value' } } },
    ]);

    const average = avg[0]?.avg || 0;
    await Media.updateOne(
      { _id: mediaId },
      { $set: { imdbRating: average ? Math.round(average * 10) / 10 : null } }
    );
  },

  async deleteRating(userId: string, mediaId: string) {
    await Rating.deleteOne({ userId, mediaId });
    await this.updateMediaRating(mediaId);
  },
};
