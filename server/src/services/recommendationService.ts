import { Media, WatchHistory, WatchlistItem, Rating, TrendingMedia } from '../db/models.js';

export const recommendationService = {
  async getSimilarMedia(mediaId: string) {
    const media = await Media.findById(mediaId).populate('genres');

    if (!media) return [];

    const m: any = media;
    const genreIds = (m.genres || []).map((g: any) => g._id);

    const similar = await Media.find({
      _id: { $ne: media._id },
      status: 'RELEASED',
      $or: [
        { genres: { $in: genreIds } },
      ],
    })
      .populate('genres')
      .limit(50);

    const recommendations = similar.map((item: any) => {
      let score = 0;
      const sharedGenres = (item.genres || []).filter((g: any) =>
        genreIds.some((id: any) => String(id) === String(g._id))
      ).length;
      score += sharedGenres * 10;

      score += (item.imdbRating || 0) * 2;
      score += Math.log(item.viewCount + 1) * 5;

      return { media: item, score, reason: this.getReason(sharedGenres) };
    });

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, 20);
  },

  getReason(sharedGenres: number): string {
    if (sharedGenres > 0) return `Similar genres (${sharedGenres} match${sharedGenres > 1 ? 'es' : ''})`;
    return 'Popular in your region';
  },

  async updateTrending() {
    const period = 'week';
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [mediaDocs, watchCounts, wlCounts, ratingCounts] = await Promise.all([
      Media.find({ status: 'RELEASED' }),
      WatchHistory.aggregate([
        { $match: { watchedAt: { $gte: since } } },
        { $group: { _id: '$mediaId', n: { $sum: 1 } } },
      ]),
      WatchlistItem.aggregate([
        { $match: { addedAt: { $gte: since } } },
        { $group: { _id: '$mediaId', n: { $sum: 1 } } },
      ]),
      Rating.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$mediaId', n: { $sum: 1 } } },
      ]),
    ]);

    const whMap: Record<string, number> = {};
    const wlMap: Record<string, number> = {};
    const rtMap: Record<string, number> = {};
    watchCounts.forEach((w) => { whMap[String(w._id)] = w.n; });
    wlCounts.forEach((w) => { wlMap[String(w._id)] = w.n; });
    ratingCounts.forEach((w) => { rtMap[String(w._id)] = w.n; });

    const scored = mediaDocs
      .map((m) => ({
        mediaId: m._id,
        score:
          m.viewCount * 0.1 +
          (whMap[String(m._id)] || 0) * 5 +
          (wlMap[String(m._id)] || 0) * 3 +
          (rtMap[String(m._id)] || 0) * 2 +
          (m.imdbRating || 0) * 10,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

    const date = new Date();
    await TrendingMedia.bulkWrite(
      scored.map((item, index) => ({
        updateOne: {
          filter: { mediaId: item.mediaId, period, date },
          update: { $set: { rank: index + 1, score: item.score } },
          upsert: true,
        },
      }))
    );
  },
};