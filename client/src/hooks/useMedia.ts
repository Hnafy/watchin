import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi, ratingApi, watchHistoryApi, watchlistApi, recommendationApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Media, PaginatedResponse, WatchHistoryItem, WatchlistItem, RatingStats } from '../types';

export const useMediaList = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ['media', 'list', params], queryFn: () => mediaApi.getList(params), select: (r) => r.data as PaginatedResponse<Media>, staleTime: 300_000 });

export const useMedia = (id: string) =>
  useQuery({ queryKey: ['media', id], queryFn: () => mediaApi.getById(id), select: (r) => r.data.data as Media, enabled: !!id, staleTime: 600_000 });

export const useMediaBySlug = (slug: string) =>
  useQuery({ queryKey: ['media', 'slug', slug], queryFn: () => mediaApi.getBySlug(slug), select: (r) => r.data.data as Media, enabled: !!slug });

export const useTrending = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ['media', 'trending', params], queryFn: () => mediaApi.getTrending(params), select: (r) => r.data.data as Media[], staleTime: 900_000 });

export const useTopRated = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ['media', 'topRated', params], queryFn: () => mediaApi.getTopRated(params), select: (r) => r.data.data as Media[] });

export const useUpcoming = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ['media', 'upcoming', params], queryFn: () => mediaApi.getUpcoming(params), select: (r) => r.data.data as Media[], staleTime: 600_000 });

export const usePopular = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ['media', 'popular', params], queryFn: () => mediaApi.getPopular(params), select: (r) => r.data.data as Media[], staleTime: 300_000 });

export const useMediaByGenre = (genreSlug: string, params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ['media', 'genre', genreSlug, params], queryFn: () => mediaApi.getByGenre(genreSlug, params), select: (r) => r.data.data as Media[], enabled: !!genreSlug, staleTime: 300_000 });

export const useRecommended = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ['media', 'recommended', params], queryFn: () => mediaApi.getRecommended(params), select: (r) => r.data.data as Media[], staleTime: 300_000 });

export const useRecentlyWatched = (params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: ['media', 'recentlyWatched', params], queryFn: () => mediaApi.getRecentlyWatched(params), select: (r) => r.data.data as WatchHistoryItem[], staleTime: 120_000 });

export const useGenres = () =>
  useQuery({ queryKey: ['genres'], queryFn: () => mediaApi.getGenres(), select: (r) => r.data.data, staleTime: 3600_000 });

export const useBrowseMedia = (filters: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: ['media', 'browse', filters],
    queryFn: () => mediaApi.searchAndFilter(filters),
    select: (r) => r.data,
    staleTime: 60_000
  });

// ===== RATING =====

export const useRatingStats = (mediaId: string) =>
  useQuery({
    queryKey: ['ratingStats', mediaId],
    queryFn: () => ratingApi.getStats(mediaId).then((r) => r.data.data as RatingStats),
    enabled: !!mediaId,
    staleTime: 60_000,
  });

export const useUserRating = (mediaId: string) =>
  useQuery({
    queryKey: ['userRating', mediaId],
    queryFn: () => ratingApi.getUserRating(mediaId).then((r) => r.data.data.rating as number | null),
    enabled: !!mediaId,
    staleTime: 300_000,
  });

export const useRateMedia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaId, value }: { mediaId: string; value: number }) => ratingApi.rate(mediaId, value),
    onSuccess: (_, { mediaId }) => {
      qc.invalidateQueries({ queryKey: ['ratingStats', mediaId] });
      qc.invalidateQueries({ queryKey: ['userRating', mediaId] });
      qc.invalidateQueries({ queryKey: ['media', mediaId] });
    },
  });
};

export const useDeleteRating = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => ratingApi.delete(mediaId),
    onSuccess: (_, mediaId) => {
      qc.invalidateQueries({ queryKey: ['ratingStats', mediaId] });
      qc.invalidateQueries({ queryKey: ['userRating', mediaId] });
      qc.invalidateQueries({ queryKey: ['media', mediaId] });
    },
  });
};

// ===== WATCHLIST =====

export const useWatchlist = (page = 1, limit = 50) =>
  useQuery({
    queryKey: ['watchlist', page, limit],
    queryFn: () => watchlistApi.getList(page, limit).then((r) => r.data as { data: WatchlistItem[]; pagination: any }),
    staleTime: 60_000,
  });

export const useWatchlistCheck = (mediaId: string) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['watchlistCheck', mediaId],
    queryFn: () => watchlistApi.check(mediaId).then((r) => r.data.data.inWatchlist as boolean),
    enabled: !!mediaId && isAuthenticated,
    staleTime: 120_000,
  });
};

export const useAddToWatchlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => watchlistApi.add(mediaId),
    onSuccess: (_, mediaId) => {
      qc.invalidateQueries({ queryKey: ['watchlistCheck', mediaId] });
      qc.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
};

export const useRemoveFromWatchlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => watchlistApi.remove(mediaId),
    onSuccess: (_, mediaId) => {
      qc.invalidateQueries({ queryKey: ['watchlistCheck', mediaId] });
      qc.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
};

// ===== WATCH HISTORY =====

export const useContinueWatching = (limit = 10) =>
  useQuery({
    queryKey: ['history', 'continue', limit],
    queryFn: () => watchHistoryApi.getContinueWatching(limit).then((r) => r.data.data as WatchHistoryItem[]),
    staleTime: 120_000,
  });

export const useWatchHistory = (page = 1, limit = 20) =>
  useQuery({
    queryKey: ['history', page, limit],
    queryFn: () => watchHistoryApi.getHistory(page, limit).then((r) => r.data),
    staleTime: 60_000,
  });

export const useUpdateProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => watchHistoryApi.updateProgress(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
};

export const useClearHistory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => watchHistoryApi.clearAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
};

export const useDeleteHistoryItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (historyId: string) => watchHistoryApi.deleteItem(historyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
};

export const useAiRecommendations = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: ['recommendations', 'ai', params],
    queryFn: () => recommendationApi.getAiRecommendations(params).then((r) => r.data),
    staleTime: 600_000,
  });

export const useSimilarMedia = (mediaId: string) =>
  useQuery({
    queryKey: ['recommendations', 'similar', mediaId],
    queryFn: () => recommendationApi.getSimilarMedia(mediaId).then((r) => r.data.data as { media: Media; score: number; reason: string }[]),
    enabled: !!mediaId,
    staleTime: 300_000,
  });
