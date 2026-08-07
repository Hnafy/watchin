export interface MediaSource {
  server?: string;
  label?: string;
  url: string;
}

export interface User {
  id: string; email: string; username: string; avatar?: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR'; emailVerified: boolean; createdAt: string;
}

export interface Media {
  id: string; slug: string; title: string; originalTitle?: string;
  type: 'MOVIE' | 'TV_SHOW' | 'ANIME';
  status: 'RELEASED' | 'UPCOMING' | 'ONGOING';
  overview?: string; shortDescription?: string;
  posterUrl?: string; backdropUrl?: string; logoUrl?: string;
  trailerUrl?: string; watchUrl?: string;
  sources?: MediaSource[];
  releaseDate?: string; firstAirDate?: string; lastAirDate?: string;
  productionYear?: number; runtime?: number;
  numberOfSeasons?: number; numberOfEpisodes?: number;
  imdbRating?: number; tmdbId?: number; quality?: string;
  featured?: boolean; isTrending?: boolean; hidden?: boolean;
  genres: Genre[]; countries: Country[]; languages: Language[];
  keywords?: Keyword[]; cast: CastMember[];
  directors?: Director[]; seasons: Season[];
  trendingScore: number; popularity: number; viewCount: number;
  createdAt: string; updatedAt: string;
  _count?: { ratings: number; watchlistItems?: number };
}

export interface Genre { id: string; name: string; slug: string; }
export interface Country { id: string; name: string; code: string; }
export interface Language { id: string; name: string; code: string; }
export interface Keyword { id: string; name: string; slug: string; }
export interface Person { id: string; name: string; profilePath?: string; }
export interface CastMember { id: string; mediaId: string; personId: string; person: Person; character?: string; order: number; }
export interface Director { id: string; mediaId: string; personId: string; person: Person; order: number; }
export interface Season { id: string; mediaId: string; seasonNumber: number; name?: string; overview?: string; posterUrl?: string; airDate?: string; episodeCount: number; episodes: Episode[]; }
export interface Episode { id: string; mediaId: string; seasonId: string; episodeNumber: number; name: string; overview?: string; stillUrl?: string; airDate?: string; runtime?: number; watchUrl?: string; sources?: MediaSource[]; }

export interface FacetCount { value: string; count: number; slug?: string; code?: string; }

export interface Facets {
  types: FacetCount[];
  genres: FacetCount[];
  countries: FacetCount[];
  languages: FacetCount[];
  statuses: FacetCount[];
  qualities: FacetCount[];
  yearRange: { min: number; max: number };
  ratingRange: { min: number; max: number };
  totalResults: number;
}

export interface SearchFilters {
  q?: string;
  type?: string[];
  genre?: string[];
  country?: string[];
  language?: string[];
  quality?: string[];
  yearFrom?: number;
  yearTo?: number;
  ratingFrom?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  data: Media[];
  facets: Facets;
  pagination: { page: number; limit: number; total: number; totalPages: number; };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number; };
}

export interface ApiError { status: string; message: string; details?: Array<{ field: string; message: string }>; }

export interface WatchHistoryItem {
  id: string;
  userId: string;
  mediaId: string;
  media: Media;
  episodeId?: string;
  episode?: Episode;
  seasonNumber?: number;
  episodeNumber?: number;
  progress: number;
  duration: number;
  completed: boolean;
  watchedAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  id: string;
  mediaId: string;
  media: Media;
  addedAt: string;
}

export interface RatingStats {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export interface UserRatingResponse {
  rating: number | null;
}

export interface Comment {
  id: string;
  mediaId: string;
  userId: string;
  parentId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; avatar?: string; role?: string };
  replies?: Comment[];
}

export interface PlaylistItem {
  id: string;
  mediaId: Media;
  addedAt: string;
  progress: number;
  rating: number | null;
  notes: string | null;
}

export interface Playlist {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  userId: string;
  user: { id: string; username: string; avatar?: string; role?: string };
  visibility: 'PUBLIC' | 'PRIVATE';
  items: PlaylistItem[];
  likes: string[];
  likeCount: number;
  saves: string[];
  saveCount: number;
  forkedFrom: string | null;
  forkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPlaylists {
  data: Playlist[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
