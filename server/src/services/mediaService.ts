import {
  Media,
  Genre,
  Country,
  Language,
  Keyword,
  Season,
  Episode,
  Rating,
  WatchlistItem,
  WatchHistory,
  TrendingMedia,
  PageView,
  isValidId,
} from '../db/models.js';
import {
  escapeRegex,
  slugify,
  ensureGenre,
  ensureCountry,
  ensureLanguage,
  ensureKeyword,
  attachCountsToMedia,
  mediaCountsMap,
} from '../db/utils.js';
import { AppError } from '../utils/AppError.js';
import { sanitizePublicMedia, sanitizePublicMediaArray } from '../utils/mediaSerializer.js';

interface SearchQuery {
  q?: string;
  type?: string[];
  genre?: string[];
  country?: string[];
  language?: string[];
  status?: string[];
  quality?: string[];
  yearFrom?: number;
  yearTo?: number;
  ratingFrom?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}

interface FacetValue {
  value: string;
  count: number;
  slug?: string;
  code?: string;
}

interface Facets {
  types: FacetValue[];
  genres: FacetValue[];
  countries: FacetValue[];
  languages: FacetValue[];
  statuses: FacetValue[];
  qualities: FacetValue[];
  yearRange: { min: number | null; max: number | null };
  ratingRange: { min: number | null; max: number | null };
  totalResults: number;
}

interface SearchResult {
  data: any[];
  facets: Facets;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function buildBaseWhere(q: SearchQuery): Promise<any> {
  const where: any = { hidden: false };

  if (q.q && q.q.trim()) {
    const raw = q.q.trim();
    const searchTerm = escapeRegex(raw);
    where.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { originalTitle: { $regex: searchTerm, $options: 'i' } },
      { overview: { $regex: searchTerm, $options: 'i' } },
      { shortDescription: { $regex: searchTerm, $options: 'i' } },
    ];

    const qLower = normalizeText(raw);
    const matchedTypes = Object.keys(TYPE_ALIASES).filter((type) =>
      TYPE_ALIASES[type].some(
        (a) => a === qLower || a.startsWith(qLower) || qLower.startsWith(a)
      )
    );
    if (matchedTypes.length) {
      where.$or.push({ type: { $in: matchedTypes } });
    }
  }

  if (q.type?.length) {
    where.type = { $in: q.type };
  }

  if (q.status?.length) {
    where.status = { $in: q.status };
  }

  if (q.genre?.length) {
    const ids = await Genre.find({ slug: { $in: q.genre } }).distinct('_id');
    where.genres = { $in: ids };
  }

  if (q.country?.length) {
    const ids = await Country.find({ code: { $in: q.country } }).distinct('_id');
    where.countries = { $in: ids };
  }

  if (q.language?.length) {
    const ids = await Language.find({ code: { $in: q.language } }).distinct('_id');
    where.languages = { $in: ids };
  }

  if (q.quality?.length) {
    where.quality = { $in: q.quality };
  }

  if (q.yearFrom !== undefined || q.yearTo !== undefined) {
    where.productionYear = {};
    if (q.yearFrom !== undefined) where.productionYear.$gte = q.yearFrom;
    if (q.yearTo !== undefined) where.productionYear.$lte = q.yearTo;
  }

  if (q.ratingFrom !== undefined) {
    where.imdbRating = { $gte: q.ratingFrom };
  }

  return where;
}

function buildOrderBy(sortBy?: string): any {
  switch (sortBy) {
    case 'MOST_VIEWED':
      return { viewCount: -1 };
    case 'HIGHEST_RATED':
      return { imdbRating: -1 };
    case 'LATEST':
      return { releaseDate: -1, createdAt: -1 };
    case 'TITLE_ASC':
      return { title: 1 };
    case 'TITLE_DESC':
      return { title: -1 };
    case 'OLDEST':
      return { releaseDate: 1, createdAt: 1 };
    case 'POPULAR':
    default:
      return { popularity: -1 };
  }
}

const TYPE_ALIASES: Record<string, string[]> = {
  MOVIE: ['movie', 'movies', 'film', 'films', 'feature', 'features'],
  TV_SHOW: ['tv show', 'tv shows', 'series', 'tv series', 'show', 'shows'],
  ANIME: ['anime', 'animes', 'animation'],
};

function normalizeText(s: string | null | undefined): string {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(s: string): string[] {
  return normalizeText(s).split(/[^a-z0-9]+/).filter(Boolean);
}

function scoreMediaForQuery(doc: any, q: string): number {
  const query = normalizeText(q).trim();
  if (!query) return 0;
  const qTokens = tokenize(query);

  const title = normalizeText(doc.title);
  const original = normalizeText(doc.originalTitle);
  const titleTokens = tokenize(title);
  const originalTokens = tokenize(original);

  let score = 0;

  if (title) {
    if (title === query) score += 1000;
    else if (title.startsWith(query)) score += 600;
    else if (title.includes(query)) score += 300;
    else if (titleTokens.join(' ').includes(qTokens.join(' '))) score += 450;
  }

  if (original && original !== title) {
    if (original === query) score += 850;
    else if (original.startsWith(query)) score += 500;
    else if (original.includes(query)) score += 250;
  }

  for (const t of qTokens) {
    if (titleTokens.includes(t)) score += 100;
    else if (originalTokens.includes(t)) score += 70;
  }

  const matchedTokens = qTokens.filter((t) => titleTokens.includes(t)).length;
  if (qTokens.length) score += (matchedTokens / qTokens.length) * 80;

  const blobTokens = tokenize(`${doc.overview || ''} ${doc.shortDescription || ''}`);
  for (const t of qTokens) {
    if (blobTokens.includes(t)) score += 30;
  }

  const genreNames = (doc.genres || []).map((g: any) => normalizeText(g.name || g.slug || ''));
  if (genreNames.some((n: string) => n === query || n.includes(query) || query.includes(n))) score += 150;

  const langNames = (doc.languages || []).map((l: any) => normalizeText(l.name || ''));
  if (langNames.some((n: string) => n === query || n.includes(query))) score += 80;

  const countryNames = (doc.countries || []).map((c: any) => normalizeText(c.name || ''));
  if (countryNames.some((n: string) => n === query || n.includes(query))) score += 80;

  const aliases = TYPE_ALIASES[doc.type] || [];
  if (aliases.some((a: string) => a === query || a.startsWith(query) || query.startsWith(a))) score += 120;

  return score;
}

function relevanceCompare(a: any, b: any): number {
  const sa = a.__score || 0;
  const sb = b.__score || 0;
  if (sa !== sb) return sb - sa;

  const pop = (b.popularity || 0) - (a.popularity || 0);
  if (pop !== 0) return pop;
  const rating = (b.imdbRating || 0) - (a.imdbRating || 0);
  if (rating !== 0) return rating;
  const views = (b.viewCount || 0) - (a.viewCount || 0);
  if (views !== 0) return views;
  return new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime();
}

const MEDIA_POPULATE = [{ path: 'genres countries languages keywords' }];

async function computeFacets(q: SearchQuery): Promise<Omit<Facets, 'totalResults'>> {
  const filter = await buildBaseWhere(q);

  const [types, statuses, qualities, yearRange, ratingRange, genres, countries, languages] =
    await Promise.all([
      Media.aggregate([
        { $match: filter },
        { $group: { _id: '$type', n: { $sum: 1 } } },
      ]),
      Media.aggregate([
        { $match: filter },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
      Media.aggregate([
        { $match: { ...filter, quality: { $ne: null } } },
        { $group: { _id: '$quality', n: { $sum: 1 } } },
      ]),
      Media.aggregate([
        { $match: filter },
        { $group: { _id: null, min: { $min: '$productionYear' }, max: { $max: '$productionYear' } } },
      ]),
      Media.aggregate([
        { $match: filter },
        { $group: { _id: null, min: { $min: '$imdbRating' }, max: { $max: '$imdbRating' } } },
      ]),
      Media.aggregate([
        { $match: filter },
        { $unwind: '$genres' },
        { $group: { _id: '$genres', n: { $sum: 1 } } },
        { $lookup: { from: 'genres', localField: '_id', foreignField: '_id', as: 'g' } },
        { $unwind: '$g' },
        { $sort: { 'g.name': 1 } },
        { $project: { _id: 0, value: '$g.name', count: '$n', slug: '$g.slug' } },
      ]),
      Media.aggregate([
        { $match: filter },
        { $unwind: '$countries' },
        { $group: { _id: '$countries', n: { $sum: 1 } } },
        { $lookup: { from: 'countries', localField: '_id', foreignField: '_id', as: 'c' } },
        { $unwind: '$c' },
        { $sort: { 'c.name': 1 } },
        { $project: { _id: 0, value: '$c.name', count: '$n', code: '$c.code' } },
      ]),
      Media.aggregate([
        { $match: filter },
        { $unwind: '$languages' },
        { $group: { _id: '$languages', n: { $sum: 1 } } },
        { $lookup: { from: 'languages', localField: '_id', foreignField: '_id', as: 'l' } },
        { $unwind: '$l' },
        { $sort: { 'l.name': 1 } },
        { $project: { _id: 0, value: '$l.name', count: '$n', code: '$l.code' } },
      ]),
    ]);

  const yr = yearRange[0] || {};
  const rr = ratingRange[0] || {};

  return {
    types: types.map((t) => ({ value: t._id, count: t.n })),
    genres,
    countries,
    languages,
    statuses: statuses.map((s) => ({ value: s._id, count: s.n })),
    qualities: qualities.map((q) => ({ value: q._id, count: q.n })),
    yearRange: { min: yr.min ?? null, max: yr.max ?? null },
    ratingRange: { min: rr.min ?? null, max: rr.max ?? null },
  };
}

async function withMediaCounts(docs: any[]): Promise<any[]> {
  const counts = await mediaCountsMap(docs.map((d) => d._id));
  return sanitizePublicMediaArray(attachCountsToMedia(docs, counts));
}

export const mediaService = {
  async searchAndFilter(query: SearchQuery): Promise<SearchResult> {
    const { page = 1, limit = 20, ...filters } = query;
    const q = typeof filters.q === 'string' ? filters.q.trim() : '';

    const [facets, where] = await Promise.all([
      computeFacets(filters),
      buildBaseWhere(filters),
    ]);

    const total = await Media.countDocuments(where);

    let docs: any[];
    if (q && !filters.sortBy) {
      const all = await Media.find(where)
        .sort(buildOrderBy(filters.sortBy))
        .populate(MEDIA_POPULATE);

      const scored = all.map((d) => {
        const json: any = d.toJSON();
        json.__score = scoreMediaForQuery(json, q);
        return json;
      });
      scored.sort(relevanceCompare);
      docs = scored.slice((page - 1) * limit, page * limit);
      docs.forEach((d) => delete d.__score);
    } else {
      docs = await Media.find(where)
        .sort(buildOrderBy(filters.sortBy))
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(MEDIA_POPULATE);
    }

    const data = await withMediaCounts(docs);

    return {
      data,
      facets: { ...facets, totalResults: total },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getMediaById(id: string) {
    const media = await Media.findById(id)
      .populate('genres countries languages keywords')
      .populate({
        path: 'seasons',
        options: { sort: { seasonNumber: 1 } },
        populate: { path: 'episodes', options: { sort: { episodeNumber: 1 } } },
      })
      .populate({
        path: 'ratings',
        options: { sort: { createdAt: -1 }, perDocumentLimit: 10 },
        populate: { path: 'user', select: 'username avatar' },
      });

    if (!media) return null;

    const counts = await mediaCountsMap([media._id]);
    const json = media.toJSON() as any;
    json._count = counts[json.id] || { ratings: 0, watchlistItems: 0 };
    return sanitizePublicMedia(json);
  },

  async getMediaBySlug(slug: string) {
    const media = await Media.findOne({ slug })
      .populate('genres countries languages keywords')
      .populate({
        path: 'seasons',
        options: { sort: { seasonNumber: 1 } },
        populate: { path: 'episodes', options: { sort: { episodeNumber: 1 } } },
      });

    if (!media) return null;

    const counts = await mediaCountsMap([media._id]);
    const json = media.toJSON() as any;
    json._count = counts[json.id] || { ratings: 0, watchlistItems: 0 };
    return sanitizePublicMedia(json);
  },

  async getTrending(period: string, limit: number, type?: string) {
    const trending = await TrendingMedia.find({ period })
      .sort({ rank: 1 })
      .limit(limit * 3)
      .populate({ path: 'media', populate: 'genres countries languages' });

    const filtered = type ? trending.filter((t: any) => t.media?.type === type) : trending;
    const mediaDocs = filtered.slice(0, limit).map((t: any) => t.media).filter(Boolean);
    const counts = await mediaCountsMap(mediaDocs.map((m: any) => m._id));

    return filtered.slice(0, limit).map((t: any) => {
      if (!t.media) return null;
      const json = t.media.toJSON();
      json._count = counts[json.id] || { ratings: 0, watchlistItems: 0 };
      return { ...sanitizePublicMedia(json), trendingRank: t.rank, trendingScore: t.score };
    }).filter(Boolean);
  },

  async getTopRated(limit: number, type?: string) {
    const where: any = { status: 'RELEASED', hidden: false };
    if (type) where.type = type;

    const docs = await Media.find(where)
      .sort({ imdbRating: -1 })
      .limit(limit)
      .populate('genres countries languages');

    return withMediaCounts(docs);
  },

  async getLatestMedia(limit: number) {
    const docs = await Media.find({ hidden: false })
      .sort({ releaseDate: -1, createdAt: -1 })
      .limit(limit)
      .populate('genres countries languages');

    return withMediaCounts(docs);
  },

  async getMediaList(query: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    genre?: string;
    country?: string;
    language?: string;
    year?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      genre,
      country,
      language,
      year,
      sortBy = 'popularity',
      sortOrder = 'desc',
      search,
    } = query;

    const where: any = { hidden: false };

    if (type) where.type = type;
    if (status) where.status = status;

    if (genre) {
      const g = await Genre.findOne({ slug: genre });
      where.genres = { $in: g ? [g._id] : [] };
    }
    if (country) {
      const c = await Country.findOne({ code: { $regex: `^${escapeRegex(country)}$`, $options: 'i' } });
      where.countries = { $in: c ? [c._id] : [] };
    }
    if (language) {
      const l = await Language.findOne({ code: { $regex: `^${escapeRegex(language)}$`, $options: 'i' } });
      where.languages = { $in: l ? [l._id] : [] };
    }
    if (year) where.productionYear = year;
    if (search) {
      const term = escapeRegex(search);
      where.$or = [
        { title: { $regex: term, $options: 'i' } },
        { originalTitle: { $regex: term, $options: 'i' } },
        { overview: { $regex: term, $options: 'i' } },
      ];

      const qLower = normalizeText(search);
      const matchedTypes = Object.keys(TYPE_ALIASES).filter((type) =>
        TYPE_ALIASES[type].some(
          (a) => a === qLower || a.startsWith(qLower) || qLower.startsWith(a)
        )
      );
      if (matchedTypes.length) {
        where.$or.push({ type: { $in: matchedTypes } });
      }
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder === 'asc' ? 1 : -1;

    let docs: any[];
    if (search && !query.sortBy) {
      const all = await Media.find(where)
        .populate('genres countries languages');

      const scored = all.map((d) => {
        const json: any = d.toJSON();
        json.__score = scoreMediaForQuery(json, search);
        return json;
      });
      scored.sort(relevanceCompare);
      docs = scored.slice((page - 1) * limit, page * limit);
      docs.forEach((d) => delete d.__score);
    } else {
      docs = await Media.find(where)
        .sort(orderBy)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('genres countries languages');
    }

    const data = await withMediaCounts(docs);
    const total = await Media.countDocuments(where);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async createMedia(data: any, _userId: string) {
    const genres = await Promise.all(
      (data.genres || []).map((name: string) => ensureGenre(name))
    );
    const countries = await Promise.all(
      (data.countries || []).map((code: string) => ensureCountry(code))
    );
    const languages = await Promise.all(
      (data.languages || []).map((code: string) => ensureLanguage(code))
    );
    const keywords = await Promise.all(
      (data.keywords || []).map((name: string) => ensureKeyword(name))
    );

    const slug = await this.generateUniqueSlug(data.title);

    const media = await Media.create({
      title: data.title,
      originalTitle: data.originalTitle || null,
      type: data.type,
      status: data.status || 'RELEASED',
      overview: data.overview || null,
      shortDescription: data.shortDescription || null,
      releaseDate: data.releaseDate || null,
      firstAirDate: data.firstAirDate || null,
      lastAirDate: data.lastAirDate || null,
      productionYear: data.productionYear || null,
      runtime: data.runtime || null,
      numberOfSeasons: data.numberOfSeasons || null,
      numberOfEpisodes: data.numberOfEpisodes || null,
      posterUrl: data.posterUrl || null,
      backdropUrl: data.backdropUrl || null,
      logoUrl: data.logoUrl || null,
      trailerUrl: data.trailerUrl || null,
      watchUrl: data.watchUrl || null,
      imdbRating: data.imdbRating || null,
      quality: data.quality || null,
      featured: data.featured || false,
      isTrending: data.isTrending || false,
      hidden: data.hidden || false,
      slug,
      genres: genres.map((g) => g._id),
      countries: countries.map((c) => c._id),
      languages: languages.map((l) => l._id),
      keywords: keywords.map((k) => k._id),
    });

    if (data.seasons?.length && (data.type === 'TV_SHOW' || data.type === 'ANIME')) {
      for (const season of data.seasons) {
        const createdSeason = await Season.create({
          mediaId: media._id,
          seasonNumber: season.seasonNumber,
          name: season.name || null,
          overview: season.overview || null,
          posterUrl: season.posterUrl || null,
          airDate: season.airDate || null,
          episodeCount: season.episodeCount || 0,
        });

        if (season.episodes?.length) {
          for (const ep of season.episodes) {
            await Episode.create({
              mediaId: media._id,
              seasonId: createdSeason._id,
              episodeNumber: ep.episodeNumber,
              name: ep.name,
              overview: ep.overview || null,
              stillUrl: ep.stillUrl || null,
              airDate: ep.airDate || null,
              runtime: ep.runtime || null,
              watchUrl: ep.watchUrl || null,
            });
          }
        }
      }
    }

    return this.getMediaById(media.id);
  },

  async updateMedia(id: string, data: any) {
    const existing = await Media.findById(id);
    if (!existing) throw AppError.notFound('Media not found');

    const updateData: any = { ...data };
    delete updateData.genres;
    delete updateData.countries;
    delete updateData.languages;
    delete updateData.keywords;

    if (data.genres) {
      const genres = await Promise.all(data.genres.map((name: string) => ensureGenre(name)));
      updateData.genres = genres.map((g) => g._id);
    }
    if (data.countries) {
      const countries = await Promise.all(data.countries.map((code: string) => ensureCountry(code)));
      updateData.countries = countries.map((c) => c._id);
    }
    if (data.languages) {
      const languages = await Promise.all(data.languages.map((code: string) => ensureLanguage(code)));
      updateData.languages = languages.map((l) => l._id);
    }
    if (data.keywords) {
      const keywords = await Promise.all(data.keywords.map((name: string) => ensureKeyword(name)));
      updateData.keywords = keywords.map((k) => k._id);
    }

    await Media.updateOne({ _id: id }, { $set: updateData });

    return this.getMediaById(id);
  },

  async deleteMedia(id: string) {
    const existing = await Media.findById(id);
    if (!existing) throw AppError.notFound('Media not found');

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
  },

  async incrementViewCount(id: string) {
    await Media.updateOne({ _id: id }, { $inc: { viewCount: 1 } });
  },

  async generateUniqueSlug(baseTitle: string): Promise<string> {
    const base = slugify(baseTitle);
    let slug = base;
    let counter = 1;
    while (await Media.findOne({ slug })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    return slug;
  },

  async getUpcoming(limit: number) {
    const docs = await Media.find({ status: 'UPCOMING', hidden: false })
      .sort({ releaseDate: 1 })
      .limit(limit)
      .populate('genres countries languages');

    return withMediaCounts(docs);
  },

  async getPopular(limit: number, type?: string) {
    const where: any = { hidden: false };
    if (type) where.type = type;

    const docs = await Media.find(where)
      .sort({ popularity: -1 })
      .limit(limit)
      .populate('genres countries languages');

    return withMediaCounts(docs);
  },

  async getByGenre(genreSlug: string, limit: number, type?: string) {
    const genre = await Genre.findOne({ slug: genreSlug });
    if (!genre) return [];

    const where: any = { hidden: false, genres: { $in: [genre._id] } };
    if (type) where.type = type;

    const docs = await Media.find(where)
      .sort({ popularity: -1 })
      .limit(limit)
      .populate('genres');

    return withMediaCounts(docs);
  },

  async getRecommended(userId: string, limit: number) {
    const userHistory = await WatchHistory.find({ userId })
      .sort({ watchedAt: -1 })
      .limit(50)
      .populate('media');

    const genreIds = new Set<string>();
    const watchedIds = new Set<string>();
    for (const h of userHistory) {
      const m: any = (h as any).media;
      if (!m) continue;
      watchedIds.add(m.id);
      for (const g of m.genres || []) genreIds.add(String(g._id));
    }

    if (genreIds.size === 0) {
      return this.getPopular(limit);
    }

    const docs = await Media.find({
      hidden: false,
      _id: { $nin: Array.from(watchedIds) },
      genres: { $in: Array.from(genreIds) },
    })
      .sort({ popularity: -1 })
      .limit(limit)
      .populate('genres countries languages');

    return withMediaCounts(docs);
  },

  async getRecentlyWatched(userId: string, limit: number) {
    const items = await WatchHistory.find({ userId })
      .sort({ watchedAt: -1 })
      .limit(limit)
      .populate('media');

    const mediaDocs = items.map((i: any) => i.media).filter(Boolean);
    const counts = await mediaCountsMap(mediaDocs.map((m: any) => m._id));

    return items.map((i: any) => {
      const json = i.toJSON();
      if (json.media && counts[json.media.id]) {
        json.media._count = counts[json.media.id];
      }
      if (json.media) {
        json.media = sanitizePublicMedia(json.media);
      }
      return json;
    });
  },

  /**
   * Returns the real video sources for a media item or a specific episode.
   * Available to guests so they can watch without an account.
   */
  async getWatchSource(id: string, episodeId?: string) {
    const media = await Media.findById(id);
    if (!media) throw AppError.notFound('Media not found');

    if (episodeId) {
      const episode = await Episode.findOne({ _id: episodeId, mediaId: media._id });
      if (!episode) throw AppError.notFound('Episode not found');
      return {
        mediaId: media.id,
        episodeId: episode.id,
        title: media.title,
        watchUrl: episode.watchUrl || null,
        sources: episode.sources || [],
        hasWatchSource: Boolean(episode.watchUrl || (episode.sources?.length > 0)),
      };
    }

    return {
      mediaId: media.id,
      title: media.title,
      watchUrl: media.watchUrl || null,
      sources: media.sources || [],
      hasWatchSource: Boolean(media.watchUrl || (media.sources?.length > 0)),
    };
  },

  async getLanguages() {
    return Language.find().sort({ name: 1 });
  },

  async getKeywords() {
    return Keyword.find().sort({ name: 1 });
  },
};
