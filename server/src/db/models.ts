import { Schema, model, Types } from 'mongoose';

export const toId = (v: string) => new Types.ObjectId(v);

export const isValidId = (v: any): boolean => Types.ObjectId.isValid(v);

export const jsonTransform = (_doc: any, ret: any) => {
  if (ret._id != null) {
    ret.id = ret._id.toString();
  }
  delete ret._id;
  delete ret.__v;
  return ret;
};

const baseOptions = {
  toJSON: { virtuals: true, transform: jsonTransform },
  toObject: { virtuals: true, transform: jsonTransform },
};

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------
const UserSettingsSchema = new Schema(
  {
    notifications: {
      emailUpdates: { type: Boolean, default: false },
      newReleases: { type: Boolean, default: true },
      watchlist: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
    },
    privacy: {
      publicProfile: { type: Boolean, default: true },
      showWatchHistory: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true },
    },
    playback: {
      autoplay: { type: Boolean, default: true },
      resume: { type: Boolean, default: true },
      defaultQuality: { type: String, default: 'auto' },
    },
    appearance: {
      reduceMotion: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: null },
    role: {
      type: String,
      enum: ['USER', 'ADMIN', 'MODERATOR'],
      default: 'USER',
      index: true,
    },
    emailVerified: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    settings: { type: UserSettingsSchema, default: () => ({}) },
  },
  { ...baseOptions, timestamps: true, collection: 'users' }
);

export const User = model('User', UserSchema);

// ---------------------------------------------------------------------------
// RefreshToken
// ---------------------------------------------------------------------------
const RefreshTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { ...baseOptions, timestamps: true, collection: 'refreshtokens' }
);

export const RefreshToken = model('RefreshToken', RefreshTokenSchema);

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
const MediaSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    originalTitle: { type: String, default: null },
    overview: { type: String, default: null },
    shortDescription: { type: String, default: null },
    type: { type: String, enum: ['MOVIE', 'TV_SHOW', 'ANIME'], required: true },
    status: {
      type: String,
      enum: ['RELEASED', 'UPCOMING', 'ONGOING'],
      default: 'RELEASED',
    },
    posterUrl: { type: String, default: null },
    backdropUrl: { type: String, default: null },
    logoUrl: { type: String, default: null },
    trailerUrl: { type: String, default: null },
    watchUrl: { type: String, default: null },
    sources: {
      type: [
        {
          server: { type: String, default: null },
          label: { type: String, default: null },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },
    releaseDate: { type: Date, default: null },
    firstAirDate: { type: Date, default: null },
    lastAirDate: { type: Date, default: null },
    productionYear: { type: Number, default: null, index: true },
    runtime: { type: Number, default: null },
    numberOfSeasons: { type: Number, default: null },
    numberOfEpisodes: { type: Number, default: null },
    imdbRating: { type: Number, default: null },
    tmdbId: { type: Number, default: null },
    quality: { type: String, default: null, index: true },
    featured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    trendingScore: { type: Number, default: 0, index: true },
    popularity: { type: Number, default: 0, index: true },
    viewCount: { type: Number, default: 0 },
    genres: [{ type: Schema.Types.ObjectId, ref: 'Genre' }],
    countries: [{ type: Schema.Types.ObjectId, ref: 'Country' }],
    languages: [{ type: Schema.Types.ObjectId, ref: 'Language' }],
    keywords: [{ type: Schema.Types.ObjectId, ref: 'Keyword' }],
  },
  { ...baseOptions, timestamps: true, collection: 'media' }
);

MediaSchema.index({ type: 1, status: 1 });
MediaSchema.index({ releaseDate: -1 });
MediaSchema.index({ firstAirDate: -1 });

MediaSchema.virtual('cast', {
  ref: 'CastMember',
  localField: '_id',
  foreignField: 'mediaId',
});
MediaSchema.virtual('directors', {
  ref: 'Director',
  localField: '_id',
  foreignField: 'mediaId',
});
MediaSchema.virtual('seasons', {
  ref: 'Season',
  localField: '_id',
  foreignField: 'mediaId',
});
MediaSchema.virtual('ratings', {
  ref: 'Rating',
  localField: '_id',
  foreignField: 'mediaId',
});
MediaSchema.virtual('watchlistItems', {
  ref: 'WatchlistItem',
  localField: '_id',
  foreignField: 'mediaId',
});
MediaSchema.virtual('watchHistory', {
  ref: 'WatchHistory',
  localField: '_id',
  foreignField: 'mediaId',
});

export const Media = model('Media', MediaSchema);

// ---------------------------------------------------------------------------
// Genre / Country / Language / Keyword
// ---------------------------------------------------------------------------
const GenreSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
  },
  { ...baseOptions, collection: 'genres' }
);
export const Genre = model('Genre', GenreSchema);

const CountrySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
  },
  { ...baseOptions, collection: 'countries' }
);
export const Country = model('Country', CountrySchema);

const LanguageSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
  },
  { ...baseOptions, collection: 'languages' }
);
export const Language = model('Language', LanguageSchema);

const KeywordSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
  },
  { ...baseOptions, collection: 'keywords' }
);
export const Keyword = model('Keyword', KeywordSchema);

// ---------------------------------------------------------------------------
// Person / CastMember / Director
// ---------------------------------------------------------------------------
const PersonSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    profilePath: { type: String, default: null },
  },
  { ...baseOptions, collection: 'people' }
);
export const Person = model('Person', PersonSchema);

const CastMemberSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    personId: { type: Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    character: { type: String, default: null },
    order: { type: Number, default: 0 },
  },
  { ...baseOptions, collection: 'castmembers' }
);
CastMemberSchema.index({ mediaId: 1, personId: 1, character: 1 }, { unique: true });
CastMemberSchema.virtual('person', {
  ref: 'Person',
  localField: 'personId',
  foreignField: '_id',
  justOne: true,
});
export const CastMember = model('CastMember', CastMemberSchema);

const DirectorSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    personId: { type: Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    order: { type: Number, default: 0 },
  },
  { ...baseOptions, collection: 'directors' }
);
DirectorSchema.index({ mediaId: 1, personId: 1 }, { unique: true });
DirectorSchema.virtual('person', {
  ref: 'Person',
  localField: 'personId',
  foreignField: '_id',
  justOne: true,
});
export const Director = model('Director', DirectorSchema);

// ---------------------------------------------------------------------------
// Season / Episode
// ---------------------------------------------------------------------------
const SeasonSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    seasonNumber: { type: Number, required: true },
    name: { type: String, default: null },
    overview: { type: String, default: null },
    posterUrl: { type: String, default: null },
    airDate: { type: Date, default: null },
    episodeCount: { type: Number, default: 0 },
  },
  { ...baseOptions, collection: 'seasons' }
);
SeasonSchema.index({ mediaId: 1, seasonNumber: 1 }, { unique: true });
SeasonSchema.virtual('episodes', {
  ref: 'Episode',
  localField: '_id',
  foreignField: 'seasonId',
});
export const Season = model('Season', SeasonSchema);

const EpisodeSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    seasonId: { type: Schema.Types.ObjectId, ref: 'Season', required: true, index: true },
    episodeNumber: { type: Number, required: true },
    name: { type: String, required: true },
    overview: { type: String, default: null },
    stillUrl: { type: String, default: null },
    airDate: { type: Date, default: null },
    runtime: { type: Number, default: null },
    watchUrl: { type: String, default: null },
    sources: {
      type: [
        {
          server: { type: String, default: null },
          label: { type: String, default: null },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { ...baseOptions, collection: 'episodes' }
);
EpisodeSchema.index({ mediaId: 1, seasonId: 1, episodeNumber: 1 }, { unique: true });
export const Episode = model('Episode', EpisodeSchema);

// ---------------------------------------------------------------------------
// WatchlistItem
// ---------------------------------------------------------------------------
const WatchlistItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    addedAt: { type: Date, default: Date.now },
  },
  { ...baseOptions, collection: 'watchlistitems' }
);
WatchlistItemSchema.index({ userId: 1, mediaId: 1 }, { unique: true });
WatchlistItemSchema.virtual('media', {
  ref: 'Media',
  localField: 'mediaId',
  foreignField: '_id',
  justOne: true,
});
export const WatchlistItem = model('WatchlistItem', WatchlistItemSchema);

// ---------------------------------------------------------------------------
// Rating
// ---------------------------------------------------------------------------
const RatingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    value: { type: Number, required: true, min: 1, max: 10 },
  },
  { ...baseOptions, timestamps: true, collection: 'ratings' }
);
RatingSchema.index({ userId: 1, mediaId: 1 }, { unique: true });
RatingSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});
export const Rating = model('Rating', RatingSchema);

// ---------------------------------------------------------------------------
// WatchHistory
// ---------------------------------------------------------------------------
const WatchHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: 'Episode', default: null },
    seasonNumber: { type: Number, default: null },
    episodeNumber: { type: Number, default: null },
    progress: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    watchedAt: { type: Date, default: Date.now },
  },
  { ...baseOptions, timestamps: true, collection: 'watchhistories' }
);
WatchHistorySchema.index({ userId: 1, mediaId: 1 });
WatchHistorySchema.index({ userId: 1, watchedAt: -1 });
WatchHistorySchema.index({ episodeId: 1 });
WatchHistorySchema.virtual('media', {
  ref: 'Media',
  localField: 'mediaId',
  foreignField: '_id',
  justOne: true,
});
WatchHistorySchema.virtual('episode', {
  ref: 'Episode',
  localField: 'episodeId',
  foreignField: '_id',
  justOne: true,
});
export const WatchHistory = model('WatchHistory', WatchHistorySchema);

// ---------------------------------------------------------------------------
// TrendingMedia
// ---------------------------------------------------------------------------
const TrendingMediaSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    period: { type: String, required: true },
    rank: { type: Number, required: true },
    score: { type: Number, required: true },
    date: { type: Date, default: Date.now, index: true },
  },
  { ...baseOptions, collection: 'trendingmedia' }
);
TrendingMediaSchema.index({ mediaId: 1, period: 1, date: 1 }, { unique: true });
TrendingMediaSchema.index({ period: 1, rank: 1 });
TrendingMediaSchema.virtual('media', {
  ref: 'Media',
  localField: 'mediaId',
  foreignField: '_id',
  justOne: true,
});
export const TrendingMedia = model('TrendingMedia', TrendingMediaSchema);

// ---------------------------------------------------------------------------
// AdminMediaInput
// ---------------------------------------------------------------------------
const AdminMediaInputSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', default: null },
    title: { type: String, required: true },
    originalTitle: { type: String, default: null },
    type: { type: String, enum: ['MOVIE', 'TV_SHOW', 'ANIME'], required: true },
    reviewStatus: { type: String, default: 'PENDING', index: true },
    overview: { type: String, default: null },
    shortDescription: { type: String, default: null },
    releaseDate: { type: Date, default: null },
    firstAirDate: { type: Date, default: null },
    lastAirDate: { type: Date, default: null },
    productionYear: { type: Number, default: null },
    runtime: { type: Number, default: null },
    numberOfSeasons: { type: Number, default: null },
    numberOfEpisodes: { type: Number, default: null },
    posterUrl: { type: String, default: null },
    backdropUrl: { type: String, default: null },
    logoUrl: { type: String, default: null },
    trailerUrl: { type: String, default: null },
    watchUrl: { type: String, default: null },
    sources: { type: Schema.Types.Mixed, default: [] },
    quality: { type: String, default: null },
    imdbRating: { type: Number, default: null },
    genres: [{ type: String }],
    countries: [{ type: String }],
    languages: [{ type: String }],
    keywords: [{ type: String }],
    cast: { type: Schema.Types.Mixed, default: [] },
    directors: { type: Schema.Types.Mixed, default: [] },
    seasons: { type: Schema.Types.Mixed, default: [] },
    featured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    submittedBy: { type: String, required: true, index: true },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { ...baseOptions, timestamps: true, collection: 'adminmediainputs' }
);
export const AdminMediaInput = model('AdminMediaInput', AdminMediaInputSchema);

// ---------------------------------------------------------------------------
// PageView
// ---------------------------------------------------------------------------
const PageViewSchema = new Schema(
  {
    path: { type: String, required: true, index: true },
    ipHash: { type: String, default: null },
    userAgent: { type: String, default: null },
    referer: { type: String, default: null },
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', default: null, index: true },
  },
  { ...baseOptions, timestamps: true, collection: 'pageviews' }
);
PageViewSchema.index({ createdAt: -1 });
export const PageView = model('PageView', PageViewSchema);

// ---------------------------------------------------------------------------
// DailyStat
// ---------------------------------------------------------------------------
const DailyStatSchema = new Schema(
  {
    date: { type: Date, required: true, unique: true, index: true },
    totalViews: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    totalWatches: { type: Number, default: 0 },
  },
  { ...baseOptions, timestamps: true, collection: 'dailystats' }
);
export const DailyStat = model('DailyStat', DailyStatSchema);

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------
const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['WELCOME', 'SYSTEM', 'ADMIN', 'WATCHLIST', 'RATING', 'REPLY', 'CONTENT'],
      default: 'SYSTEM',
    },
    title: { type: String, required: true },
    body: { type: String, default: null },
    link: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { ...baseOptions, collection: 'notifications' }
);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
export const Notification = model('Notification', NotificationSchema);

// ---------------------------------------------------------------------------
// SearchLog
// ---------------------------------------------------------------------------
const SearchLogSchema = new Schema(
  {
    query: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ipHash: { type: String, default: null },
  },
  { ...baseOptions, timestamps: true, collection: 'searchlogs' }
);
SearchLogSchema.index({ createdAt: -1 });
export const SearchLog = model('SearchLog', SearchLogSchema);

// ---------------------------------------------------------------------------
// AdEvent
// ---------------------------------------------------------------------------
const AdEventSchema = new Schema(
  {
    zone: { type: String, required: true, index: true },
    type: { type: String, enum: ['IMPRESSION', 'CLICK'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ipHash: { type: String, default: null },
    page: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { ...baseOptions, collection: 'adevents' }
);
AdEventSchema.index({ zone: 1, type: 1, createdAt: -1 });
export const AdEvent = model('AdEvent', AdEventSchema);

// ---------------------------------------------------------------------------
// SiteSetting
// ---------------------------------------------------------------------------
const SiteSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    label: { type: String, default: null },
    group: { type: String, default: null, index: true },
  },
  { ...baseOptions, timestamps: true, collection: 'sitesettings' }
);
export const SiteSetting = model('SiteSetting', SiteSettingSchema);

// ---------------------------------------------------------------------------
// Comment
// ---------------------------------------------------------------------------
const CommentSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { ...baseOptions, timestamps: true, collection: 'comments' }
);
CommentSchema.index({ mediaId: 1, parentId: 1, createdAt: -1 });
CommentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
  select: 'username avatar role',
});
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
});
export const Comment = model('Comment', CommentSchema);
