import { Response, NextFunction } from 'express';
import { mediaService } from '../services/mediaService';
import { analyticsService } from '../services/analyticsService';
import { AuthRequest } from '../middleware/authMiddleware';
import { Genre, Country, Person, Media, SearchLog } from '../db/models';
import { escapeRegex } from '../db/utils';
import crypto from 'crypto';

function parseArrayParam(param: unknown): string[] | undefined {
  if (!param) return undefined;
  if (Array.isArray(param)) {
    return param.flatMap((p) =>
      typeof p === 'string'
        ? p.split(',').map((s) => s.trim()).filter(Boolean)
        : []
    );
  }
  if (typeof param === 'string') {
    return param.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

function parseNumberParam(param: unknown): number | undefined {
  if (param === undefined || param === null || param === '') return undefined;
  const n = Number(param);
  return isNaN(n) ? undefined : n;
}

export const mediaController = {
  async searchAndFilter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const q = {
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        type: parseArrayParam(req.query.type),
        genre: parseArrayParam(req.query.genre),
        country: parseArrayParam(req.query.country),
        language: parseArrayParam(req.query.language),
        status: parseArrayParam(req.query.status),
        quality: parseArrayParam(req.query.quality),
        yearFrom: parseNumberParam(req.query.yearFrom),
        yearTo: parseNumberParam(req.query.yearTo),
        ratingFrom: parseNumberParam(req.query.ratingFrom),
        sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
        page: parseNumberParam(req.query.page) || 1,
        limit: parseNumberParam(req.query.limit) || 20,
      };

      const result = await mediaService.searchAndFilter(q);
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  },

  async getMediaList(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await mediaService.getMediaList(req.query as any);
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  },

  async getMediaById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await mediaService.getMediaById(req.params.id);
      if (!media)
        return res.status(404).json({ status: 'error', message: 'Media not found' });
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async getMediaBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await mediaService.getMediaBySlug(req.params.slug);
      if (!media)
        return res.status(404).json({ status: 'error', message: 'Media not found' });
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async getTrending(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { period = 'week', limit = 20, type } = req.query;
      const media = await mediaService.getTrending(
        period as string,
        parseInt(limit as string),
        type as string
      );
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async getTopRated(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit = 20, type } = req.query;
      const media = await mediaService.getTopRated(
        parseInt(limit as string),
        type as string
      );
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async searchMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { q, ...filters } = req.query;
      if (!q || typeof q !== 'string')
        return res.status(400).json({ status: 'error', message: 'Search query required' });
      const result = await mediaService.getMediaList({ ...filters, search: q } as any);
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  },

  async searchPeople(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const q = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      if (!q) return res.json({ status: 'success', data: [] });
      const limit = Math.min(Number(req.query.limit) || 10, 20);
      const data = await Person.find({ name: { $regex: escapeRegex(q), $options: 'i' } })
        .sort({ name: 1 })
        .limit(limit)
        .select('name profilePath');
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Combined type-ahead suggestions: matching titles + people (actors/directors).
   * Used by the header live-search dropdown.
   */
  async suggest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q.length < 2) return res.json({ status: 'success', data: { media: [], people: [] } });
      const limit = Math.min(Number(req.query.limit) || 6, 10);

      const [media, people] = await Promise.all([
        Media.find({
          status: 'RELEASED',
          $or: [
            { title: { $regex: escapeRegex(q), $options: 'i' } },
            { originalTitle: { $regex: escapeRegex(q), $options: 'i' } },
          ],
        })
          .sort({ viewCount: -1, popularity: -1 })
          .limit(limit)
          .select('slug title type posterUrl releaseDate imdbRating originalTitle'),
        Person.find({ name: { $regex: escapeRegex(q), $options: 'i' } })
          .sort({ name: 1 })
          .limit(Math.min(limit, 4))
          .select('name profilePath'),
      ]);

      res.json({ status: 'success', data: { media, people } });
    } catch (error) {
      next(error);
    }
  },

  /** Top search queries over the last 7 days — powers "Trending searches". */
  async trendingSearches(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const rows = await SearchLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $toLower: '$query' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, query: { $toString: '$_id' }, count: 1 } },
      ]);
      res.json({ status: 'success', data: rows });
    } catch (error) {
      next(error);
    }
  },

  /** Fire-and-forget log of a search event (debounced on the client). */
  async trackSearch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
      if (!query || query.length < 2) return res.json({ status: 'success' });

      const ipHash = req.ip
        ? crypto.createHash('sha256').update(req.ip).digest('hex').slice(0, 16)
        : null;

      await SearchLog.create({ query, userId: req.user?.id ?? null, ipHash });
      res.json({ status: 'success' });
    } catch (error) {
      next(error);
    }
  },

  async incrementViewCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await mediaService.incrementViewCount(req.params.id);
      analyticsService
        .trackPageView(
          `/media/${req.params.id}`,
          req.params.id,
          req.ip,
          req.headers['user-agent'],
          req.headers.referer
        )
        .catch(() => {});
      res.json({ status: 'success' });
    } catch (error) {
      next(error);
    }
  },

  async getGenres(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const genres = await Genre.find().sort({ name: 1 });
      res.json({ status: 'success', data: genres });
    } catch (error) {
      next(error);
    }
  },

  async getLatestMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const media = await mediaService.getLatestMedia(limit);
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async getUpcoming(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const media = await mediaService.getUpcoming(limit);
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async getPopular(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string | undefined;
      const media = await mediaService.getPopular(limit, type);
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async getByGenre(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string | undefined;
      const media = await mediaService.getByGenre(req.params.genreSlug, limit, type);
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async getRecommended(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      if (!req.user) {
        const media = await mediaService.getPopular(limit);
        return res.json({ status: 'success', data: media });
      }
      const media = await mediaService.getRecommended(req.user.id, limit);
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async getRecentlyWatched(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.json({ status: 'success', data: [] });
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await mediaService.getRecentlyWatched(req.user.id, limit);
      res.json({ status: 'success', data: history });
    } catch (error) {
      next(error);
    }
  },

  async getCountries(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const countries = await Country.find().sort({ name: 1 });
      res.json({ status: 'success', data: countries });
    } catch (error) {
      next(error);
    }
  },

  async getLanguages(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const languages = await mediaService.getLanguages();
      res.json({ status: 'success', data: languages });
    } catch (error) {
      next(error);
    }
  },

  async getKeywords(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const keywords = await mediaService.getKeywords();
      res.json({ status: 'success', data: keywords });
    } catch (error) {
      next(error);
    }
  },

  async createMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await mediaService.createMedia(req.body, req.user!.id);
      res.status(201).json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async updateMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await mediaService.updateMedia(req.params.id, req.body);
      res.json({ status: 'success', data: media });
    } catch (error) {
      next(error);
    }
  },

  async deleteMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await mediaService.deleteMedia(req.params.id);
      res.json({ status: 'success', message: 'Media deleted' });
    } catch (error) {
      next(error);
    }
  },
};
