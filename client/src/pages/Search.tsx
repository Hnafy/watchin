import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { mediaApi } from '../services/api';
import { MediaCard } from '../components/media/MediaCard';
import { Search as SearchIcon, X, ChevronLeft, ChevronRight, Mic, SlidersHorizontal, Sparkles } from 'lucide-react';
import { SearchFilters, SearchResult, Media, Genre, Country, Language } from '../types';
import { FilterPopover } from '../components/search/FilterPopover';
import { useI18n } from '../i18n/LanguageProvider';
import {
  paramsToFilters,
  filtersToApiParams,
  filtersToSearchParams,
  getActiveFilterChips,
  removeChip,
} from '../utils/filters';
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlistCheck } from '../hooks/useMedia';

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton aspect-[2/3] rounded-xl" />
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const { t } = useI18n();
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  const range = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - range && i <= page + range)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <div className="mt-10 flex items-center justify-center gap-1.5">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-dark-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{t('search.previous')}</span>
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="px-2 text-sm text-dark-500">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-9 min-w-[36px] rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-[0_4px_16px_rgba(229,9,20,0.35)]'
                : 'text-dark-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-dark-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span className="hidden sm:inline">{t('search.next')}</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Search() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastSearchRef = useRef(searchParams.toString());

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<SearchFilters>(() => paramsToFilters(searchParams));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listening, setListening] = useState(false);

   const debounceRef = useRef<ReturnType<typeof setTimeout>>();

   const addToWatchlist = useAddToWatchlist();
   const removeFromWatchlist = useRemoveFromWatchlist();
   const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());

   const handlePlay = (m: Media) => navigate(`/watch/${m.id}`);
   const handleAddToList = (m: Media) => {
     if (watchlistIds.has(m.id)) {
       removeFromWatchlist.mutate(m.id);
       setWatchlistIds((prev) => { const next = new Set(prev); next.delete(m.id); return next; });
       toast.success('Removed from My List');
     } else {
       addToWatchlist.mutate(m.id);
       setWatchlistIds((prev) => new Set(prev).add(m.id));
       toast.success('Added to My List');
     }
   };
   const handleLike = (m: Media) => {
     toast.success('Added to your likes');
   };

   useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Write state to URL when debounced query or filters change
  useEffect(() => {
    const sp = filtersToSearchParams({ ...filters, q: debouncedQuery || undefined });
    const qs = new URLSearchParams(sp).toString();
    if (qs !== lastSearchRef.current) {
      lastSearchRef.current = qs;
      setSearchParams(sp, { replace: true });
    }
  }, [debouncedQuery, filters, setSearchParams]);

  // Re-read URL params when externally changed
  useEffect(() => {
    const currentQs = searchParams.toString();
    if (currentQs !== lastSearchRef.current) {
      lastSearchRef.current = currentQs;
      const urlFilters = paramsToFilters(searchParams);
      setFilters(urlFilters);
      const urlQ = searchParams.get('q') || '';
      setQuery(urlQ);
      setDebouncedQuery(urlQ);
    }
  }, [searchParams]);

  const queryFilters = useMemo(() => ({ ...filters, q: debouncedQuery || undefined }), [filters, debouncedQuery]);
  const apiParams = useMemo(() => filtersToApiParams(queryFilters), [queryFilters]);

  const { data, isLoading } = useQuery<SearchResult>({
    queryKey: ['media', 'browse', apiParams],
    queryFn: () => mediaApi.searchAndFilter(apiParams).then((r) => r.data),
    staleTime: 300_000,
    placeholderData: keepPreviousData,
  });

  const { data: genres = [] } = useQuery({
    queryKey: ['filter-genres'],
    queryFn: () => mediaApi.getGenres().then((r) => r.data.data as Genre[]),
    staleTime: 3600_000,
  });
  const { data: countries = [] } = useQuery({
    queryKey: ['filter-countries'],
    queryFn: () => mediaApi.getCountries().then((r) => r.data.data as Country[]),
    staleTime: 3600_000,
  });
  const { data: languages = [] } = useQuery({
    queryKey: ['filter-languages'],
    queryFn: () => mediaApi.getLanguages().then((r) => r.data.data as Language[]),
    staleTime: 3600_000,
  });

  const labelMaps = useMemo(() => ({
    genre: Object.fromEntries(genres.map((g) => [g.slug, g.name])),
    country: Object.fromEntries(countries.map((c) => [c.code, c.name])),
    language: Object.fromEntries(languages.map((l) => [l.code, l.name])),
  }), [genres, countries, languages]);

  const activeChips = useMemo(() => getActiveFilterChips(filters, labelMaps), [filters, labelMaps]);
  const totalPages = data?.pagination?.totalPages ?? 0;
  const currentPage = data?.pagination?.page ?? 1;
  const resultCount = data?.pagination?.total ?? data?.data?.length ?? 0;

  const handleApplyFilters = useCallback((next: SearchFilters) => {
    setFilters({ ...next, page: 1 });
    setFiltersOpen(false);
  }, []);

  const handleClearFilters = useCallback(() => setFilters({}), []);

  const handleClearAll = useCallback(() => {
    setFilters({});
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const handleRemoveChip = useCallback((chip: { field: string; value: string }) => {
    setFilters((prev) => ({ ...removeChip(prev, chip), page: 1 }));
  }, []);

  const handleRemoveQuery = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleVoice = useCallback(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || '';
      setQuery(text);
    };
    rec.start();
  }, []);

  const hasAnyActive = activeChips.length > 0 || !!debouncedQuery;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-28 sm:px-10 lg:px-14">
        {/* Search bar */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto mb-5 max-w-2xl">
          <div className="glass-strong relative flex items-center rounded-2xl transition-shadow duration-300 focus-within:shadow-[0_0_0_1px_rgba(229,9,20,0.4),0_8px_40px_rgba(0,0,0,0.5)]">
            <SearchIcon className="absolute left-4 h-5 w-5 text-dark-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (filters.page && filters.page > 1) setFilters((prev) => ({ ...prev, page: undefined }));
              }}
              placeholder={t('search.placeholder')}
              autoFocus
              className="w-full bg-transparent py-4 pl-12 pr-28 text-base text-white placeholder:text-dark-400 focus:outline-none"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                onClick={handleVoice}
                aria-label={t('search.voiceSearch')}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                  listening
                    ? 'animate-pulse bg-primary-600 text-white'
                    : 'text-dark-400 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                onClick={() => setFiltersOpen(true)}
                className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all ${
                  activeChips.length > 0
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-dark-300 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" /> {t('search.filters')}{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
              </button>
              {query && (
                <button onClick={handleRemoveQuery} aria-label="Clear"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-dark-400 transition-colors hover:bg-white/[0.08] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {listening && (
            <p className="mt-2 flex items-center gap-2 text-xs text-primary-400">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary-500" /> {t('search.listening')}
            </p>
          )}

          {/* Filter popover */}
          <FilterPopover open={filtersOpen} onClose={() => setFiltersOpen(false)} onApply={handleApplyFilters} filters={filters} />
        </motion.div>

        {/* Active filter chips */}
        <AnimatePresence>
          {activeChips.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mx-auto mb-5 max-w-2xl overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                {activeChips.map((chip) => (
                  <motion.button
                    key={chip.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => handleRemoveChip(chip)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary-700/30 bg-primary-600/15 px-3 py-1 text-xs font-medium text-primary-300 transition-colors hover:bg-primary-600/25"
                  >
                    {chip.label}
                    <X className="h-3 w-3" />
                  </motion.button>
                ))}
                <button onClick={handleClearFilters} className="ml-1 text-xs font-medium text-dark-400 transition-colors hover:text-primary-400">
                  Clear All
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results header */}
        {!isLoading && data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex items-end justify-between gap-4">
            <p className="text-sm text-dark-400">
              {debouncedQuery ? (
                <>
                  <span className="font-medium text-white">{resultCount.toLocaleString()}</span> {t('search.resultsFor')}{' '}
                  <span className="font-medium text-primary-400">“{debouncedQuery}”</span>
                </>
              ) : activeChips.length > 0 ? (
                <>
                  <span className="font-medium text-white">{resultCount.toLocaleString()}</span> {t('search.resultsFound')}
                </>
              ) : (
                <>
                  <span className="font-medium text-white">{resultCount.toLocaleString()}</span> {t('search.titlesAvailable')}
                </>
              )}
              {totalPages > 1 && (
                <span className="ml-2 text-dark-500">— {t('search.page', { page: currentPage, total: totalPages })}</span>
              )}
            </p>
            {debouncedQuery && (
              <span className="hidden items-center gap-1.5 text-xs font-medium text-dark-500 sm:flex">
                <Sparkles className="h-3.5 w-3.5 text-primary-500" /> {t('search.sortedByRelevance')}
              </span>
            )}
          </motion.div>
        )}

        {/* Results grid */}
        <div>
          {isLoading && !data ? (
            <SkeletonGrid />
          ) : !data || data.data?.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center">
              <div className="glass-card mb-6 flex h-24 w-24 items-center justify-center rounded-full">
                <SearchIcon className="h-12 w-12 text-dark-600" />
              </div>
              <p className="mb-2 text-xl font-semibold">{t('search.noResults')}</p>
              <p className="mb-4 max-w-sm text-dark-400">
                {debouncedQuery
                  ? t('search.tryAdjusting', { q: debouncedQuery })
                  : t('search.tryFilters')}
              </p>
              {hasAnyActive && (
                <button onClick={handleClearAll} className="btn-primary text-sm">
                  {t('search.clearAll')}
                </button>
              )}
            </motion.div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
                {data.data.map((media: Media, i: number) => (
                  <MediaCard key={media.id} media={media} index={i} onClick={() => navigate(`/media/${media.slug}`)} onPlay={() => handlePlay(media)} onAddToList={() => handleAddToList(media)} onLike={() => handleLike(media)} />
                ))}
              </motion.div>

              <Pagination page={currentPage} totalPages={totalPages} onChange={handlePageChange} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
