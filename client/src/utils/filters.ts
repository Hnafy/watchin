import { SearchFilters } from '../types';

export function parseArrayParam(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const arr = value.split(',').filter(Boolean);
  return arr.length ? arr : undefined;
}

export function parseNumberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

export function paramsToFilters(sp: URLSearchParams): SearchFilters {
  return {
    q: sp.get('q') || undefined,
    type: parseArrayParam(sp.get('type')),
    genre: parseArrayParam(sp.get('genre')),
    country: parseArrayParam(sp.get('country')),
    language: parseArrayParam(sp.get('language')),
    quality: parseArrayParam(sp.get('quality')),
    yearFrom: parseNumberParam(sp.get('yearFrom')),
    yearTo: parseNumberParam(sp.get('yearTo')),
    ratingFrom: parseNumberParam(sp.get('ratingFrom')),
    sortBy: sp.get('sortBy') || undefined,
    page: parseNumberParam(sp.get('page')),
  };
}

export function filtersToApiParams(filters: SearchFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (filters.q) params.q = filters.q;
  if (filters.type?.length) params.type = filters.type.join(',');
  if (filters.genre?.length) params.genre = filters.genre.join(',');
  if (filters.country?.length) params.country = filters.country.join(',');
  if (filters.language?.length) params.language = filters.language.join(',');
  if (filters.quality?.length) params.quality = filters.quality.join(',');
  if (filters.yearFrom) params.yearFrom = filters.yearFrom;
  if (filters.yearTo) params.yearTo = filters.yearTo;
  if (filters.ratingFrom) params.ratingFrom = filters.ratingFrom;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.page) params.page = filters.page;
  return params;
}

export function filtersToSearchParams(filters: SearchFilters): Record<string, string> {
  const sp: Record<string, string> = {};
  if (filters.q) sp.q = filters.q;
  if (filters.type?.length) sp.type = filters.type.join(',');
  if (filters.genre?.length) sp.genre = filters.genre.join(',');
  if (filters.country?.length) sp.country = filters.country.join(',');
  if (filters.language?.length) sp.language = filters.language.join(',');
  if (filters.quality?.length) sp.quality = filters.quality.join(',');
  if (filters.yearFrom) sp.yearFrom = String(filters.yearFrom);
  if (filters.yearTo) sp.yearTo = String(filters.yearTo);
  if (filters.ratingFrom) sp.ratingFrom = String(filters.ratingFrom);
  if (filters.sortBy) sp.sortBy = filters.sortBy;
  if (filters.page && filters.page > 1) sp.page = String(filters.page);
  return sp;
}

export const DISPLAY_LABELS: Record<string, string> = {
  MOVIE: 'Movie',
  TV_SHOW: 'Series',
  ANIME: 'Anime',
  HD: 'HD',
  FHD: 'Full HD',
  BluRay: 'BluRay',
  'WEB-DL': 'WEB-DL',
  '4K': '4K',
  POPULAR: 'Popular',
  LATEST: 'Latest',
  HIGHEST_RATED: 'Highest Rated',
  MOST_VIEWED: 'Most Viewed',
  TITLE_ASC: 'A-Z',
};

export function getActiveFilterChips(
  filters: SearchFilters,
  labelMaps?: { genre?: Record<string, string>; country?: Record<string, string>; language?: Record<string, string> },
): { key: string; label: string; field: string; value: string }[] {
  const chips: { key: string; label: string; field: string; value: string }[] = [];
  const add = (field: string, arr: string[] | undefined, map?: Record<string, string>) => {
    if (!arr?.length) return;
    arr.forEach((v) => chips.push({ key: `${field}:${v}`, label: map?.[v] || DISPLAY_LABELS[v] || v, field, value: v }));
  };
  add('type', filters.type);
  add('genre', filters.genre, labelMaps?.genre);
  add('country', filters.country, labelMaps?.country);
  add('language', filters.language, labelMaps?.language);
  add('quality', filters.quality);
  if (filters.yearFrom || filters.yearTo) {
    const label = `${filters.yearFrom || '?'} – ${filters.yearTo || '?'}`;
    chips.push({ key: 'year', label, field: 'year', value: '' });
  }
  if (filters.ratingFrom) {
    chips.push({ key: 'rating', label: `IMDb ${filters.ratingFrom}+`, field: 'rating', value: String(filters.ratingFrom) });
  }
  if (filters.sortBy) {
    chips.push({ key: 'sortBy', label: DISPLAY_LABELS[filters.sortBy] || filters.sortBy, field: 'sortBy', value: filters.sortBy });
  }
  return chips;
}

export function removeChip(filters: SearchFilters, chip: { field: string; value: string }): SearchFilters {
  const next = { ...filters };
  const arrayFields = ['type', 'genre', 'country', 'language', 'quality'];
  if (arrayFields.includes(chip.field)) {
    const key = chip.field as keyof SearchFilters;
    const arr = (next[key] as string[] | undefined) || [];
    const updated = arr.filter((v) => v !== chip.value);
    (next as Record<string, unknown>)[key] = updated.length ? updated : undefined;
  } else if (chip.field === 'year') {
    next.yearFrom = undefined;
    next.yearTo = undefined;
  } else if (chip.field === 'rating') {
    next.ratingFrom = undefined;
  } else if (chip.field === 'sortBy') {
    next.sortBy = undefined;
  }
  return next;
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return !!(filters.q || filters.type?.length || filters.genre?.length || filters.country?.length || filters.language?.length || filters.quality?.length || filters.yearFrom || filters.yearTo || filters.ratingFrom || filters.sortBy);
}
