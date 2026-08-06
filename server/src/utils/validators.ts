import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  email: z.string().email('Invalid email address').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be at most 128 characters'),
});

export const avatarSchema = z.object({
  image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,.+$/, 'Image must be a valid JPEG, PNG, or WebP data URL'),
});

const settingsBool = z.boolean().optional();

export const userSettingsSchema = z.object({
  notifications: z.object({
    emailUpdates: settingsBool,
    newReleases: settingsBool,
    watchlist: settingsBool,
    comments: settingsBool,
  }).optional(),
  privacy: z.object({
    publicProfile: settingsBool,
    showWatchHistory: settingsBool,
    showStats: settingsBool,
  }).optional(),
  playback: z.object({
    autoplay: settingsBool,
    resume: settingsBool,
    defaultQuality: z.enum(['auto', '1080p', '720p', '480p']).optional(),
  }).optional(),
  appearance: z.object({
    reduceMotion: settingsBool,
  }).optional(),
}).strict();

export const friendRequestSchema = z.object({
  toUserId: z.string().min(1),
});

export const playlistSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  items: z.array(z.object({
    mediaId: z.string().min(1),
    progress: z.number().min(0).max(100).optional(),
    rating: z.number().min(1).max(10).optional(),
    notes: z.string().max(500).optional(),
  })).optional(),
});

export const updatePlaylistItemSchema = z.object({
  progress: z.number().min(0).max(100).optional(),
  rating: z.number().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
});

export const mediaLikeSchema = z.object({
  mediaId: z.string().min(1),
});

export const mediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['MOVIE', 'TV_SHOW', 'ANIME']).optional(),
  status: z.enum(['RELEASED', 'UPCOMING', 'ONGOING']).optional(),
  genre: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  sortBy: z.enum(['popularity', 'imdbRating', 'releaseDate', 'title', 'viewCount']).default('popularity'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

export const createMediaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  originalTitle: z.string().max(200).optional(),
  type: z.enum(['MOVIE', 'TV_SHOW', 'ANIME']),
  status: z.enum(['RELEASED', 'UPCOMING', 'ONGOING']).default('RELEASED'),
  overview: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  releaseDate: z.coerce.date().optional(),
  firstAirDate: z.coerce.date().optional(),
  lastAirDate: z.coerce.date().optional(),
  productionYear: z.coerce.number().int().min(1900).max(2100).optional(),
  runtime: z.coerce.number().int().positive().optional(),
  numberOfSeasons: z.coerce.number().int().positive().optional(),
  numberOfEpisodes: z.coerce.number().int().positive().optional(),
  posterUrl: z.string().url().optional().or(z.literal('')),
  backdropUrl: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  trailerUrl: z.string().url().optional().or(z.literal('')),
  watchUrl: z.string().url().optional().or(z.literal('')),
  imdbRating: z.coerce.number().min(0).max(10).optional(),
  quality: z.string().max(20).optional(),
  featured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  hidden: z.boolean().optional(),
  genres: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  cast: z.array(z.object({
    personId: z.string(),
    character: z.string(),
    order: z.number().int().default(0),
  })).optional(),
  directors: z.array(z.object({
    personId: z.string(),
    order: z.number().int().default(0),
  })).optional(),
  seasons: z.array(z.object({
    seasonNumber: z.number().int().positive(),
    name: z.string().optional(),
    overview: z.string().optional(),
    posterUrl: z.string().url().optional().or(z.literal('')),
    airDate: z.coerce.date().optional(),
    episodeCount: z.number().int().optional(),
    episodes: z.array(z.object({
      episodeNumber: z.number().int().positive(),
      name: z.string(),
      overview: z.string().optional(),
      stillUrl: z.string().url().optional().or(z.literal('')),
      airDate: z.coerce.date().optional(),
      runtime: z.coerce.number().int().positive().optional(),
      watchUrl: z.string().url().optional().or(z.literal('')),
    })).optional(),
  })).optional(),
});

export const updateMediaSchema = createMediaSchema.partial();

export const adminMediaInputSchema = createMediaSchema;

export const rateMediaSchema = z.object({
  mediaId: z.string().min(1),
  value: z.number().int().min(1).max(10),
});

export const addToWatchlistSchema = z.object({
  mediaId: z.string().min(1),
});

export const updateProgressSchema = z.object({
  mediaId: z.string().min(1),
  progress: z.number().int().min(0),
  duration: z.number().int().min(0),
  episodeId: z.string().optional().nullable(),
  seasonNumber: z.number().int().optional().nullable(),
  episodeNumber: z.number().int().optional().nullable(),
});

export const markCompletedSchema = z.object({
  episodeId: z.string().optional().nullable(),
});

export const mediaIdParamSchema = z.object({
  mediaId: z.string().min(1),
});

export const validate = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          status: 'error',
          message: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};
