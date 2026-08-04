import {
  Media,
  Genre,
  Country,
  Language,
  Keyword,
  Season,
  Episode,
  CastMember,
  Director,
  AdminMediaInput,
  User,
  isValidId,
} from '../db/models.js';
import {
  slugify,
  escapeRegex,
  ensureGenre,
  ensureCountry,
  ensureLanguage,
  ensureKeyword,
  userCountsMap,
} from '../db/utils.js';
import { AppError } from '../utils/AppError.js';

const clean = (obj: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === undefined) out[k] = null;
    else out[k] = v;
  }
  return out;
};

export const adminService = {
  async getPendingMedia(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      AdminMediaInput.find({ reviewStatus: 'PENDING' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AdminMediaInput.countDocuments({ reviewStatus: 'PENDING' }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getMediaDetail(id: string) {
    return AdminMediaInput.findById(id);
  },

  async getMediaById(id: string) {
    return Media.findById(id).populate('genres countries languages keywords').populate({
      path: 'cast',
      populate: { path: 'person', select: 'name' },
    }).populate({
      path: 'directors',
      populate: { path: 'person', select: 'name' },
    }).populate({
      path: 'seasons',
      options: { sort: { seasonNumber: 1 } },
      populate: { path: 'episodes', options: { sort: { episodeNumber: 1 } } },
    });
  },

  async updateMediaRecord(id: string, data: any) {
    const existing = await Media.findById(id);
    if (!existing) throw AppError.notFound('Media not found');

    const cleaned: Record<string, any> = {};
    const allowed = [
      'title', 'originalTitle', 'type', 'status', 'overview', 'shortDescription',
      'releaseDate', 'firstAirDate', 'lastAirDate', 'productionYear',
      'runtime', 'numberOfSeasons', 'numberOfEpisodes',
      'posterUrl', 'backdropUrl', 'logoUrl', 'trailerUrl', 'watchUrl',
      'imdbRating', 'quality',
      'featured', 'isTrending', 'hidden',
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        cleaned[key] = data[key] === '' ? null : data[key];
      }
    }
    if (cleaned.releaseDate) cleaned.releaseDate = new Date(cleaned.releaseDate);
    if (cleaned.firstAirDate) cleaned.firstAirDate = new Date(cleaned.firstAirDate);
    if (cleaned.lastAirDate) cleaned.lastAirDate = new Date(cleaned.lastAirDate);

    if (data.genres) {
      const genreNames = Array.isArray(data.genres) ? data.genres : [];
      const genres = await Promise.all(
        genreNames.map(async (name: string) => {
          let genre = await Genre.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } });
          if (!genre) {
            genre = await Genre.create({ name, slug: slugify(name) });
          }
          return genre;
        })
      );
      cleaned.genres = genres.map((g) => g._id);
    }

    if (data.countries) {
      const codes = Array.isArray(data.countries) ? data.countries : [];
      const countries = await Promise.all(
        codes.map(async (code: string) => {
          const c = code.toLowerCase().trim();
          let country = await Country.findOne({
            $or: [
              { code: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } },
              { name: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } },
            ],
          });
          if (!country) {
            country = await Country.create({ name: c, code: c.slice(0, 3).toUpperCase() });
          }
          return country;
        })
      );
      cleaned.countries = countries.map((c) => c._id);
    }

    if (data.languages) {
      const codes = Array.isArray(data.languages) ? data.languages : [];
      const languages = await Promise.all(
        codes.map(async (code: string) => {
          const c = code.toLowerCase().trim();
          let lang = await Language.findOne({
            $or: [
              { code: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } },
              { name: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } },
            ],
          });
          if (!lang) {
            lang = await Language.create({ name: c, code: c.slice(0, 3) });
          }
          return lang;
        })
      );
      cleaned.languages = languages.map((l) => l._id);
    }

    if (data.keywords) {
      const keywordNames = Array.isArray(data.keywords) ? data.keywords : [];
      const keywords = await Promise.all(
        keywordNames.map((name: string) => ensureKeyword(name))
      );
      cleaned.keywords = keywords.map((k) => k._id);
    }

    if (data.title && data.title !== existing.title) {
      const slug = slugify(data.title);
      let uniqueSlug = slug;
      let counter = 1;
      while (await Media.findOne({ slug: uniqueSlug, _id: { $ne: id } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      cleaned.slug = uniqueSlug;
    }

    if (data.seasons && Array.isArray(data.seasons)) {
      await Episode.deleteMany({ mediaId: id });
      await Season.deleteMany({ mediaId: id });

      for (const s of data.seasons) {
        const season = await Season.create({
          mediaId: id,
          seasonNumber: s.seasonNumber,
          name: s.name || null,
          episodeCount: s.episodes?.length || 0,
        });
        if (s.episodes?.length > 0) {
          await Episode.create(
            s.episodes.map((ep: any) => ({
              mediaId: id,
              seasonId: season._id,
              episodeNumber: ep.episodeNumber,
              name: ep.title || ep.name,
              watchUrl: ep.watchUrl || null,
            }))
          );
        }
      }

      cleaned.numberOfSeasons = data.seasons.length;
      cleaned.numberOfEpisodes = data.seasons.reduce((sum: number, s: any) => sum + (s.episodes?.length || 0), 0);
    }

    await Media.updateOne({ _id: id }, { $set: cleaned });

    return Media.findById(id).populate('genres countries languages keywords').populate({
      path: 'seasons',
      options: { sort: { seasonNumber: 1 } },
      populate: { path: 'episodes', options: { sort: { episodeNumber: 1 } } },
    });
  },

  async createMedia(data: any, userId: string) {
    return AdminMediaInput.create(
      clean({
        title: data.title,
        originalTitle: data.originalTitle,
        type: data.type,
        overview: data.overview,
        shortDescription: data.shortDescription,
        releaseDate: data.releaseDate,
        firstAirDate: data.firstAirDate,
        lastAirDate: data.lastAirDate,
        productionYear: data.productionYear || undefined,
        runtime: data.runtime || undefined,
        numberOfSeasons: data.numberOfSeasons || undefined,
        numberOfEpisodes: data.numberOfEpisodes || undefined,
        posterUrl: data.posterUrl,
        backdropUrl: data.backdropUrl,
        logoUrl: data.logoUrl,
        trailerUrl: data.trailerUrl,
        watchUrl: data.watchUrl,
        imdbRating: data.imdbRating || undefined,
        quality: data.quality,
        featured: data.featured || false,
        isTrending: data.isTrending || false,
        genres: data.genres || [],
        countries: data.countries || [],
        languages: data.languages || [],
        keywords: data.keywords || [],
        cast: data.cast || [],
        directors: data.directors || [],
        seasons: data.seasons || [],
        submittedBy: userId,
        reviewStatus: 'PENDING',
      }) as any
    );
  },

  async updateMedia(id: string, data: any, _userId: string) {
    const existing = await AdminMediaInput.findById(id);
    if (!existing) throw AppError.notFound('Media not found');
    if (existing.reviewStatus !== 'PENDING') throw AppError.badRequest('Cannot edit approved/rejected media');

    const cleaned = clean(data);
    if (cleaned.releaseDate) cleaned.releaseDate = new Date(cleaned.releaseDate);

    const updated = await AdminMediaInput.findByIdAndUpdate(id, { $set: cleaned }, { new: true });
    return updated;
  },

  async approveMedia(id: string, reviewerId: string) {
    const input = await AdminMediaInput.findById(id);
    if (!input) throw AppError.notFound('Media not found');
    if (input.reviewStatus !== 'PENDING') throw AppError.badRequest('Media already reviewed');

    const slug = slugify(input.title);
    let uniqueSlug = slug;
    let counter = 1;
    while (await Media.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const media = await Media.create({
      title: input.title,
      originalTitle: input.originalTitle,
      type: input.type,
      status: 'RELEASED',
      overview: input.overview,
      shortDescription: input.shortDescription || null,
      releaseDate: input.releaseDate,
      productionYear: input.productionYear || null,
      firstAirDate: input.firstAirDate || null,
      runtime: input.runtime,
      numberOfSeasons: input.numberOfSeasons,
      numberOfEpisodes: input.numberOfEpisodes,
      posterUrl: input.posterUrl,
      backdropUrl: input.backdropUrl || null,
      logoUrl: input.logoUrl || null,
      trailerUrl: input.trailerUrl,
      watchUrl: input.watchUrl || null,
      imdbRating: input.imdbRating,
      quality: input.quality,
      featured: input.featured || false,
      isTrending: input.isTrending || false,
      slug: uniqueSlug,
    });

    if (Array.isArray(input.genres) && input.genres.length) {
      const genres = await Promise.all(
        input.genres.map(async (name: string) => {
          let genre = await Genre.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } });
          if (!genre) genre = await Genre.create({ name, slug: slugify(name) });
          return genre;
        })
      );
      await Media.updateOne({ _id: media._id }, { $set: { genres: genres.map((g) => g._id) } });
    }

    if (Array.isArray(input.countries) && input.countries.length) {
      const countries = await Promise.all(
        input.countries.map(async (code: string) => {
          const c = code.toLowerCase().trim();
          let country = await Country.findOne({
            $or: [
              { code: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } },
              { name: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } },
            ],
          });
          if (!country) country = await Country.create({ name: c, code: c.slice(0, 3).toUpperCase() });
          return country;
        })
      );
      await Media.updateOne({ _id: media._id }, { $set: { countries: countries.map((c) => c._id) } });
    }

    if (Array.isArray(input.languages) && input.languages.length) {
      const languages = await Promise.all(
        input.languages.map(async (code: string) => {
          const c = code.toLowerCase().trim();
          let lang = await Language.findOne({
            $or: [
              { code: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } },
              { name: { $regex: `^${escapeRegex(c)}$`, $options: 'i' } },
            ],
          });
          if (!lang) lang = await Language.create({ name: c, code: c.slice(0, 3) });
          return lang;
        })
      );
      await Media.updateOne({ _id: media._id }, { $set: { languages: languages.map((l) => l._id) } });
    }

    if (Array.isArray(input.keywords) && input.keywords.length) {
      const keywords = await Promise.all(input.keywords.map((name: string) => ensureKeyword(name)));
      await Media.updateOne({ _id: media._id }, { $set: { keywords: keywords.map((k) => k._id) } });
    }

    if (Array.isArray(input.cast) && input.cast.length) {
      for (const c of input.cast) {
        if (!isValidId(c.personId)) continue;
        await CastMember.create({
          mediaId: media._id,
          personId: c.personId,
          character: c.character || null,
          order: c.order || 0,
        });
      }
    }

    if (Array.isArray(input.directors) && input.directors.length) {
      for (const d of input.directors) {
        if (!isValidId(d.personId)) continue;
        await Director.create({
          mediaId: media._id,
          personId: d.personId,
          order: d.order || 0,
        });
      }
    }

    if (Array.isArray(input.seasons) && input.seasons.length && (input.type === 'TV_SHOW' || input.type === 'ANIME')) {
      for (const s of input.seasons) {
        const season = await Season.create({
          mediaId: media._id,
          seasonNumber: s.seasonNumber,
          name: s.name || null,
          episodeCount: s.episodes?.length || 0,
        });
        if (s.episodes?.length > 0) {
          await Episode.create(
            s.episodes.map((ep: any) => ({
              mediaId: media._id,
              seasonId: season._id,
              episodeNumber: ep.episodeNumber,
              name: ep.title || ep.name,
              watchUrl: ep.watchUrl || null,
            }))
          );
        }
      }
    }

    await AdminMediaInput.updateOne(
      { _id: id },
      { $set: { reviewStatus: 'APPROVED', reviewedBy: reviewerId, reviewedAt: new Date(), mediaId: media._id } }
    );

    return media;
  },

  async rejectMedia(id: string, reviewerId: string) {
    const input = await AdminMediaInput.findById(id);
    if (!input) throw AppError.notFound('Media not found');
    if (input.reviewStatus !== 'PENDING') throw AppError.badRequest('Media already reviewed');

    await AdminMediaInput.updateOne(
      { _id: id },
      { $set: { reviewStatus: 'REJECTED', reviewedBy: reviewerId, reviewedAt: new Date() } }
    );
  },

  async createSeries(data: {
    title: string;
    description?: string;
    posterUrl?: string;
    genreIds?: string[];
    seasons: Array<{
      seasonNumber: number;
      name?: string;
      episodes: Array<{ episodeNumber: number; title: string; watchUrl?: string }>;
    }>;
  }) {
    const slug = slugify(data.title);
    let uniqueSlug = slug;
    let counter = 1;
    while (await Media.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const epCount = data.seasons.reduce((sum, s) => sum + s.episodes.length, 0);

    const media = await Media.create({
      title: data.title,
      slug: uniqueSlug,
      overview: data.description || null,
      posterUrl: data.posterUrl || null,
      type: 'TV_SHOW',
      status: 'RELEASED',
      genres: data.genreIds?.length ? data.genreIds : [],
      numberOfSeasons: data.seasons.length,
      numberOfEpisodes: epCount,
    });

    for (const s of data.seasons) {
      const season = await Season.create({
        mediaId: media._id,
        seasonNumber: s.seasonNumber,
        name: s.name || null,
        episodeCount: s.episodes.length,
      });

      if (s.episodes.length > 0) {
        await Episode.create(
          s.episodes.map((ep) => ({
            mediaId: media._id,
            seasonId: season._id,
            episodeNumber: ep.episodeNumber,
            name: ep.title,
            watchUrl: ep.watchUrl || null,
          }))
        );
      }
    }

    return Media.findById(media._id).populate('genres').populate({
      path: 'seasons',
      options: { sort: { seasonNumber: 1 } },
      populate: { path: 'episodes', options: { sort: { episodeNumber: 1 } } },
    });
  },

  async getDashboardStats() {
    const [totalMedia, pendingMedia, totalUsers, viewAgg] = await Promise.all([
      Media.countDocuments(),
      AdminMediaInput.countDocuments({ reviewStatus: 'PENDING' }),
      User.countDocuments(),
      Media.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]),
    ]);

    return {
      totalMedia,
      pendingMedia,
      totalUsers,
      totalViews: viewAgg[0]?.total || 0,
    };
  },

  async getUsers(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('id email username avatar role emailVerified createdAt lastLoginAt'),
      User.countDocuments(),
    ]);

    const counts = await userCountsMap(data.map((u) => u._id));
    const rows = data.map((u) => {
      const json = u.toJSON() as any;
      json._count = counts[u.id] || { watchHistory: 0, ratings: 0, watchlistItems: 0 };
      return json;
    });

    return { data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
};
