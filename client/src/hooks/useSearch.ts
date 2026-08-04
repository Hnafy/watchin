import { useQuery, useMutation } from '@tanstack/react-query';
import { searchApi } from '../services/api';

const RECENT_KEY = 'watchin.recentSearches';
const MAX_RECENT = 8;

export interface SuggestResult {
  media: MediaSuggestion[];
  people: PersonSuggestion[];
}

export interface MediaSuggestion {
  id: string;
  slug: string;
  title: string;
  type: 'MOVIE' | 'TV_SHOW' | 'ANIME';
  posterUrl?: string | null;
  releaseDate?: string | null;
  imdbRating?: number | null;
  originalTitle?: string | null;
}

export interface PersonSuggestion {
  id: string;
  name: string;
  profilePath?: string | null;
}

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function persistRecent(query: string) {
  const q = query.trim();
  if (!q) return;
  try {
    const next = [q, ...getRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function clearRecent() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}

/** Combined type-ahead suggestions (titles + people). */
export function useSuggestions(query: string, enabled: boolean) {
  const q = query.trim();
  return useQuery<SuggestResult>({
    queryKey: ['suggest', q],
    queryFn: async () => {
      const res = await searchApi.suggest(q, 6);
      return res.data.data;
    },
    enabled: enabled && q.length >= 2,
    staleTime: 60_000,
  });
}

export function useTrendingSearches(enabled: boolean) {
  return useQuery<string[]>({
    queryKey: ['search', 'trending'],
    queryFn: async () => {
      const res = await searchApi.trendingSearches();
      const rows: { query: string }[] = res.data.data ?? [];
      return rows.map((r) => r.query).filter(Boolean).slice(0, 6);
    },
    enabled,
    staleTime: 10 * 60_000,
  });
}

export const useTrackSearch = () => {
  return useMutation({
    mutationFn: (query: string) => searchApi.track(query),
    onSuccess: (_data, query) => persistRecent(query),
  });
};

export const searchHistory = {
  get: getRecentSearches,
  clear: clearRecent,
  save: persistRecent,
};
