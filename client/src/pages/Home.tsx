import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Play, Info, Plus, Check, Sparkles, Flame, TrendingUp, Trophy, Clock } from 'lucide-react';
import {
  useTrending,
  useTopRated,
  useContinueWatching,
  useMediaByGenre,
  useGenres,
  useAiRecommendations,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlistCheck,
} from '../hooks/useMedia';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../services/api';
import { MediaCarousel } from '../components/media/MediaCarousel';
import { Chip } from '../components/ui/Chip';
import { Media } from '../types';

const ease = [0.16, 1, 0.3, 1] as const;

/* ============ HERO ============ */

function HeroSlide({ media, active }: { media: Media; active: boolean }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: inList } = useWatchlistCheck(active ? media.id : '');
  const addToList = useAddToWatchlist();
  const removeFromList = useRemoveFromWatchlist();

  const toggleList = () => {
    if (!isAuthenticated) {
      toast('Sign in to save to My List');
      navigate('/login');
      return;
    }
    if (inList) removeFromList.mutate(media.id);
    else addToList.mutate(media.id);
  };

  const year = media.releaseDate || media.firstAirDate
    ? new Date(media.releaseDate || media.firstAirDate!).getFullYear()
    : null;

  const match = Math.min(99, Math.max(40, Math.round((media.imdbRating || media.popularity || 8) * 10)));

  return (
    <div className="relative z-[2] h-full pl-6 pr-6 sm:pl-[8vw] sm:pr-10">
      <div className="flex h-full items-center pb-24 pt-[72px]">
        <div className="w-full max-w-[600px]">
          <div className="mb-5 flex items-center gap-2">
            <Chip tone="primary" className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
              {media.type === 'MOVIE' ? 'Movie' : media.type === 'ANIME' ? 'Anime' : 'Series'}
            </Chip>
            {media.featured && (
              <Chip tone="gold" className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">★ Featured</Chip>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_8px_48px_rgba(0,0,0,0.85)] mb-6 max-w-full">
            {media.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] sm:text-sm text-dark-300">
            <span className="font-bold text-green-400">{match}% Match</span>
            {year && <span>{year}</span>}
            {media.runtime && <span>{Math.floor(media.runtime / 60)}h {media.runtime % 60}m</span>}
            {media.quality && (
              <span className="rounded-[3px] border border-white/40 px-1.5 py-0.5 text-[11px] leading-tight text-white/90">
                {media.quality}
              </span>
            )}
            {media.genres?.slice(0, 3).map((g, i) => (
              <span key={g?.id ?? i} className="text-white/60">
                {g?.name}{i < Math.min(media.genres.length, 3) - 1 ? ' ·' : ''}
              </span>
            ))}
          </div>

          {media.overview && (
            <p className="mt-5 max-w-[550px] text-sm leading-6 text-dark-200 sm:text-[15px] line-clamp-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {media.overview}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(`/watch/${media.id}`)}
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-7 py-3 text-sm font-bold text-black shadow-[0_8px_40px_rgba(255,255,255,0.25)] transition-all hover:scale-[1.03] active:scale-95"
            >
              <Play className="h-5 w-5 fill-black transition-transform group-hover:scale-110" /> Play
            </button>
            <button
              onClick={toggleList}
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-white/20 bg-white/[0.08] px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/[0.16] hover:scale-[1.03] active:scale-95"
            >
              {inList ? <Check className="h-5 w-5 text-green-400" /> : <Plus className="h-5 w-5" />}
              {inList ? 'In My List' : 'My List'}
            </button>
            <button
              onClick={() => navigate(`/media/${media.slug}`)}
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-white/10 bg-black/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-black/50 hover:scale-[1.03] active:scale-95"
            >
              <Info className="h-5 w-5" /> More Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const { data: latestMedia = [] } = useQuery<Media[]>({
    queryKey: ['latest-media'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/media/latest?limit=10`);
      if (!res.ok) throw new Error(`Failed to fetch latest media: ${res.status}`);
      const json = await res.json();
      return Array.isArray(json?.data) ? (json.data as Media[]) : [];
    },
    staleTime: 60_000,
  });

  const items = latestMedia.filter((m) => m.backdropUrl).slice(0, 8);
  const [index, setIndex] = useState(0);
  const total = items.length;

  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(next, 8000);
    return () => clearInterval(t);
  }, [next, total, index]);

  const hero = items[index];

  // Scroll parallax
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '60%']);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  if (!hero) return null;

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[620px] overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={hero.id}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0 z-0"
        >
          {hero.backdropUrl ? (
            <>
              <motion.img
                src={hero.backdropUrl}
                alt=""
                style={{ y: bgY }}
                className="h-[112%] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-dark-800 to-dark-950" />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-dark-950 via-dark-950/10 to-transparent" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-dark-950/90 via-dark-950/30 to-transparent" />

      {/* Slide content */}
      <motion.div className="absolute inset-0 z-[2]" style={{ y: contentY, opacity: fade }}>
        <HeroSlide media={hero} active />
      </motion.div>

      {/* Controls */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous"
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/30 p-3 text-white/70 backdrop-blur-xl transition-all hover:bg-black/50 hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/30 p-3 text-white/70 backdrop-blur-xl transition-all hover:bg-black/50 hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>

          {/* Progress indicators */}
          <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className="relative h-1 overflow-hidden rounded-full bg-white/25 transition-all duration-500"
                style={{ width: i === index ? 44 : 12 }}
              >
                {i === index && (
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 8, ease: 'linear' }}
                    style={{ originX: 0 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ============ HOME ============ */

export function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const mode = location.pathname === '/tv-shows' ? 'series' : location.pathname === '/movies' ? 'movies' : location.pathname === '/trending' ? 'trending' : 'all';

  const { data: trending = [] } = useTrending({ period: 'week', limit: 20 });
  const { data: trendingToday = [] } = useTrending({ period: 'day', limit: 18 });
  const { data: movies = [] } = useTopRated({ limit: 12, type: 'MOVIE' });
  const { data: shows = [] } = useTopRated({ limit: 12, type: 'TV_SHOW' });
  const { data: continueWatching = [] } = useContinueWatching(12);
  const { data: recs } = useAiRecommendations({ limit: 20 });

  const continueItems = continueWatching.map((cw) => cw.media).filter(Boolean) as Media[];
  const continueProgress: Record<string, number> = Object.fromEntries(
    continueWatching.filter((cw) => cw.media).map((cw) => [cw.media.id, cw.progress || 0]),
  );

  const aiItems = Array.isArray(recs?.data) ? (recs.data as Media[]) : [];
  const aiSource = recs?.source;

   const goToMedia = (m: Media) => navigate(`/media/${m.slug}`);
   const goBrowse = (slug: string) => navigate(`/search?genre=${slug}`);

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

   return (
    <div className="min-h-screen">
      <Hero />

<div className="pb-20">
         {mode === 'all' && (
          <>
             {continueItems.length > 0 && (
               <MediaCarousel
                 title="Continue Watching"
                 eyebrow="Pick up where you left off"
                 items={continueItems}
                 progress={continueProgress}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
                 variant="wide"
                 className="pt-6"
               />
             )}

             {aiItems.length > 0 && (
               <MediaCarousel
                 title="Because You Watched"
                 eyebrow={aiSource === 'ai' ? 'Powered by Gemini AI' : aiSource === 'db' ? 'Curated for you' : 'Trending picks'}
                 icon={<Sparkles className="h-4 w-4" />}
                 items={aiItems}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
               />
             )}

             {trending.length > 0 && (
               <MediaCarousel
                 title="Trending Now"
                 icon={<Flame className="h-4 w-4" />}
                 subtitle="What everyone is watching"
                 items={trending.slice(0, 18)}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
                 variant="banner"
               />
             )}

             {trendingToday.length > 0 && (
               <MediaCarousel
                 title="Trending Today"
                 icon={<Flame className="h-4 w-4" />}
                 subtitle="Hot right now"
                 items={trendingToday}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
                 variant="banner"
               />
             )}

             {/* Top Rated This Month */}
             {(() => {
               const combined = [...movies, ...shows]
                 .sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0))
                 .slice(0, 18);
               return combined.length > 0 && (
                 <MediaCarousel
                   title="Top Rated This Month"
                   icon={<Trophy className="h-4 w-4" />}
                   subtitle="Highest rated"
                   items={combined}
                   onItemClick={goToMedia}
                   onPlay={handlePlay}
                   onAddToList={handleAddToList}
                   onLike={handleLike}
                 />
               );
             })()}

             {movies.length > 0 && (
               <MediaCarousel
                 title="Top Rated Movies"
                 icon={<Trophy className="h-4 w-4" />}
                 items={movies}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
               />
             )}

             {shows.length > 0 && (
               <MediaCarousel
                 title="Top Rated Series"
                 icon={<TrendingUp className="h-4 w-4" />}
                 items={shows}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
               />
             )}

            <GenreSections onItemClick={goToMedia} onBrowse={goBrowse} typeFilter={undefined} onPlay={handlePlay} onAddToList={handleAddToList} onLike={handleLike} />
          </>
        )}

        {mode === 'trending' && (
          <>
             {trending.length > 0 && (
               <MediaCarousel
                 title="New & Popular"
                 icon={<Flame className="h-4 w-4" />}
                 subtitle="What everyone is watching"
                 items={trending.slice(0, 18)}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
                 variant="banner"
                 className="pt-6"
               />
             )}

             {continueItems.length > 0 && (
               <MediaCarousel
                 title="Continue Watching"
                 eyebrow="Pick up where you left off"
                 items={continueItems}
                 progress={continueProgress}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
                 variant="wide"
               />
             )}

             {aiItems.length > 0 && (
               <MediaCarousel
                 title="Because You Watched"
                 eyebrow={aiSource === 'ai' ? 'Powered by Gemini AI' : aiSource === 'db' ? 'Curated for you' : 'Trending picks'}
                 icon={<Sparkles className="h-4 w-4" />}
                 items={aiItems}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
               />
             )}

             {movies.length > 0 && (
               <MediaCarousel
                 title="Top Rated Movies"
                 icon={<Trophy className="h-4 w-4" />}
                 items={movies}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
               />
             )}

             {shows.length > 0 && (
               <MediaCarousel
                 title="Top Rated Series"
                 icon={<TrendingUp className="h-4 w-4" />}
                 items={shows}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
               />
             )}
           </>
         )}

         {mode === 'movies' && (
           <>
             {movies.length > 0 && (
               <MediaCarousel
                 title="Top Rated Movies"
                 icon={<Trophy className="h-4 w-4" />}
                 items={movies}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
                 className="pt-6"
               />
             )}
             <GenreSections onItemClick={goToMedia} onBrowse={goBrowse} typeFilter="MOVIE" onPlay={handlePlay} onAddToList={handleAddToList} onLike={handleLike} />
           </>
         )}

         {mode === 'series' && (
           <>
             {shows.length > 0 && (
               <MediaCarousel
                 title="Top Rated Series"
                 icon={<TrendingUp className="h-4 w-4" />}
                 items={shows}
                 onItemClick={goToMedia}
                 onPlay={handlePlay}
                 onAddToList={handleAddToList}
                 onLike={handleLike}
                 className="pt-6"
               />
             )}
             <GenreSections onItemClick={goToMedia} onBrowse={goBrowse} typeFilter="TV_SHOW" onPlay={handlePlay} onAddToList={handleAddToList} onLike={handleLike} />
           </>
         )}
      </div>
    </div>
  );
}

/* ============ GENRES ============ */

interface GenreSectionsProps {
  onItemClick: (m: Media) => void;
  onBrowse: (slug: string) => void;
  typeFilter?: 'MOVIE' | 'TV_SHOW';
  onPlay?: (m: Media) => void;
  onAddToList?: (m: Media) => void;
  onLike?: (m: Media) => void;
}

function GenreSections({ onItemClick, onBrowse, typeFilter, onPlay, onAddToList, onLike }: GenreSectionsProps) {
  const skip = ['action', 'drama', 'horror', 'comedy', 'anime', 'animation'];
  const { data: genres } = useGenres();

  if (!genres) return null;

  return (
    <>
      {genres
        .filter((g: { slug: string }) => !skip.includes(g.slug))
.slice(0, 5)
        .map((genre: { slug: string; name: string }) => (
          <GenreSection
            key={genre.slug}
            genreSlug={genre.slug}
            genreName={genre.name}
            onItemClick={onItemClick}
            onBrowse={onBrowse}
            typeFilter={typeFilter}
            onPlay={onPlay}
            onAddToList={onAddToList}
            onLike={onLike}
          />
        ))}
    </>
  );
}

function GenreSection({ genreSlug, genreName, onItemClick, onBrowse, typeFilter, onPlay, onAddToList, onLike }: {
  genreSlug: string;
  genreName: string;
  onItemClick: (m: Media) => void;
  onBrowse: (slug: string) => void;
  typeFilter?: 'MOVIE' | 'TV_SHOW';
  onPlay?: (m: Media) => void;
  onAddToList?: (m: Media) => void;
  onLike?: (m: Media) => void;
}) {
  const params: Record<string, unknown> = { limit: 18 };
  if (typeFilter) params.type = typeFilter;
  const { data: items = [] } = useMediaByGenre(genreSlug, params);

  if (items.length === 0) return null;

  return (
    <MediaCarousel
      title={genreName}
      items={items.slice(0, 18)}
      onItemClick={onItemClick}
      onPlay={onPlay}
      onAddToList={onAddToList}
      onLike={onLike}
      action={{ label: 'Browse All', onClick: () => onBrowse(genreSlug) }}
    />
  );
}
