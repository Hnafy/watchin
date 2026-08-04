import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, SlidersHorizontal, ChevronDown, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { twMerge } from 'tailwind-merge';
import { mediaApi } from '../../services/api';
import { SearchFilters, Genre, Country, Language } from '../../types';

interface FilterPopoverProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  filters: SearchFilters;
}

const TYPE_OPTIONS = [
  { value: 'MOVIE', label: 'Movie' },
  { value: 'TV_SHOW', label: 'Series' },
  { value: 'ANIME', label: 'Anime' },
] as const;

const QUALITY_OPTIONS = [
  { value: 'HD', label: 'HD' },
  { value: 'FHD', label: 'Full HD' },
  { value: 'BluRay', label: 'BluRay' },
  { value: 'WEB-DL', label: 'WEB-DL' },
  { value: '4K', label: '4K' },
] as const;

const SORT_OPTIONS = [
  { value: 'POPULAR', label: 'Popular' },
  { value: 'LATEST', label: 'Latest' },
  { value: 'HIGHEST_RATED', label: 'Highest Rated' },
  { value: 'MOST_VIEWED', label: 'Most Viewed' },
  { value: 'TITLE_ASC', label: 'A-Z' },
] as const;

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        'px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-200',
        active
          ? 'bg-primary-600 text-white border-primary-600'
          : 'bg-dark-800/50 text-dark-400 border-dark-700 hover:border-dark-500 hover:text-dark-200'
      )}
    >
      {children}
    </button>
  );
}

function Section({ label, defaultOpen = false, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-dark-800/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2.5 px-1 text-xs font-semibold text-dark-400 uppercase tracking-wider hover:text-dark-200 transition-colors"
      >
        {label}
        <ChevronDown className={twMerge('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="section"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-3 px-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchableMultiSelect({
  options,
  selected,
  onToggle,
  placeholder = 'Search...',
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="space-y-1">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-dark-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-7 pr-2.5 py-1.5 rounded-md bg-dark-800/50 border border-dark-700 text-xs text-dark-200 placeholder:text-dark-500 focus:outline-none focus:border-primary-500/50 transition-colors"
        />
      </div>
      <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-hide">
        {filtered.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              className={twMerge(
                'flex w-full items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors',
                active ? 'bg-primary-600/15 text-primary-300' : 'text-dark-400 hover:bg-dark-800/50'
              )}
            >
              <span
                className={twMerge(
                  'flex h-3 w-3 shrink-0 items-center justify-center rounded border transition-colors',
                  active ? 'border-primary-500 bg-primary-600' : 'border-dark-600'
                )}
              >
                {active && (
                  <svg className="h-2 w-2 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-dark-500 text-xs py-2">No results</p>
        )}
      </div>
    </div>
  );
}

export function FilterPopover({ open, onClose, onApply, filters }: FilterPopoverProps) {
  const [local, setLocal] = useState<SearchFilters>({ ...filters });

  useEffect(() => {
    setLocal({ ...filters });
  }, [filters, open]);

  const { data: genres = [] } = useQuery({
    queryKey: ['filter-genres'],
    queryFn: () => mediaApi.getGenres().then((r) => r.data.data as Genre[]),
    staleTime: 3600_000,
    enabled: open,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['filter-countries'],
    queryFn: () => mediaApi.getCountries().then((r) => r.data.data as Country[]),
    staleTime: 3600_000,
    enabled: open,
  });

  const { data: languages = [] } = useQuery({
    queryKey: ['filter-languages'],
    queryFn: () => mediaApi.getLanguages().then((r) => r.data.data as Language[]),
    staleTime: 3600_000,
    enabled: open,
  });

  const toggleArray = useCallback((key: keyof SearchFilters, value: string) => {
    setLocal((prev) => {
      const arr = (prev[key] as string[] | undefined) || [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next.length ? next : undefined };
    });
  }, []);

  const setField = useCallback((key: keyof SearchFilters, value: any) => {
    setLocal((prev) => ({ ...prev, [key]: value || undefined }));
  }, []);

  const genreOptions = useMemo(() => genres.map((g) => ({ value: g.slug, label: g.name })), [genres]);
  const countryOptions = useMemo(() => countries.map((c) => ({ value: c.code, label: c.name })), [countries]);
  const languageOptions = useMemo(() => languages.map((l) => ({ value: l.code, label: l.name })), [languages]);

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleClear = () => {
    setLocal({});
  };

  const activeCount = useMemo(() => {
    let count = 0;
    if (local.type?.length) count += local.type.length;
    if (local.genre?.length) count += local.genre.length;
    if (local.yearFrom || local.yearTo) count += 1;
    if (local.country?.length) count += local.country.length;
    if (local.language?.length) count += local.language.length;
    if (local.ratingFrom) count += 1;
    if (local.quality?.length) count += local.quality.length;
    if (local.sortBy) count += 1;
    return count;
  }, [local]);

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800 shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary-500" />
          <span className="text-sm font-semibold text-white">Filters</span>
          {activeCount > 0 && (
            <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary-600 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-dark-500 hover:text-white hover:bg-dark-800 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto px-4 scrollbar-hide">
        {/* Sort By — always visible at top */}
        <div className="py-2.5 border-b border-dark-800/50">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">Sort By</p>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <ChipBtn key={opt.value} active={local.sortBy === opt.value} onClick={() => setField('sortBy', local.sortBy === opt.value ? undefined : opt.value)}>
                {opt.label}
              </ChipBtn>
            ))}
          </div>
        </div>

        <Section label="Type">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map((opt) => (
              <ChipBtn key={opt.value} active={(local.type || []).includes(opt.value)} onClick={() => toggleArray('type', opt.value)}>
                {opt.label}
              </ChipBtn>
            ))}
          </div>
        </Section>

        <Section label="Genre">
          <SearchableMultiSelect
            options={genreOptions}
            selected={(local.genre as string[]) || []}
            onToggle={(v) => toggleArray('genre', v)}
          />
        </Section>

        <Section label="Year">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={local.yearFrom ?? ''}
              onChange={(e) => setField('yearFrom', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="From"
              min={1900}
              max={new Date().getFullYear()}
              className="w-full px-2.5 py-1.5 rounded-md bg-dark-800/50 border border-dark-700 text-xs text-dark-200 placeholder:text-dark-500 focus:outline-none focus:border-primary-500/50 transition-colors"
            />
            <span className="text-dark-500 text-xs">—</span>
            <input
              type="number"
              value={local.yearTo ?? ''}
              onChange={(e) => setField('yearTo', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="To"
              min={1900}
              max={new Date().getFullYear()}
              className="w-full px-2.5 py-1.5 rounded-md bg-dark-800/50 border border-dark-700 text-xs text-dark-200 placeholder:text-dark-500 focus:outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>
        </Section>

        <Section label="Country">
          <SearchableMultiSelect
            options={countryOptions}
            selected={(local.country as string[]) || []}
            onToggle={(v) => toggleArray('country', v)}
          />
        </Section>

        <Section label="Language">
          <SearchableMultiSelect
            options={languageOptions}
            selected={(local.language as string[]) || []}
            onToggle={(v) => toggleArray('language', v)}
          />
        </Section>

        <Section label="IMDb Rating">
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={local.ratingFrom ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                setField('ratingFrom', v > 0 ? v : undefined);
              }}
              className="flex-1 h-1 rounded-full appearance-none bg-dark-700 accent-primary-500 cursor-pointer"
            />
            <span className="text-xs text-dark-400 w-8 text-right font-medium tabular-nums">
              {local.ratingFrom ? `${local.ratingFrom}+` : 'Any'}
            </span>
          </div>
        </Section>

        <Section label="Quality">
          <div className="flex flex-wrap gap-1.5">
            {QUALITY_OPTIONS.map((opt) => (
              <ChipBtn key={opt.value} active={(local.quality || []).includes(opt.value)} onClick={() => toggleArray('quality', opt.value)}>
                {opt.label}
              </ChipBtn>
            ))}
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-dark-800 px-4 py-3 flex items-center gap-2">
        <button
          onClick={handleClear}
          className="px-3 py-2 rounded-lg text-xs font-medium text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="filter-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/50 lg:bg-transparent lg:pointer-events-auto"
            onClick={onClose}
          />
          <motion.div
            key="filter-mobile"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed inset-x-0 bottom-0 top-[25%] bg-dark-950 border-t border-dark-800 rounded-t-2xl z-50 flex flex-col lg:hidden overflow-hidden"
          >
            {content}
          </motion.div>
          <motion.div
            key="filter-desktop"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="hidden lg:block absolute top-full mt-2 right-0 w-[320px] bg-dark-950 border border-dark-800 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            {content}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
