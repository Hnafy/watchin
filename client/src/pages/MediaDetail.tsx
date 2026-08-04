import { useParams, useNavigate } from "react-router-dom";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { mediaApi } from "../services/api";
import { Media } from "../types";
import {
  Play,
  Clock,
  Calendar,
  ArrowLeft,
  Heart,
  Share2,
  X,
  Eye,
  Film,
  HeartOff,
  Loader2,
  Star,
  Sparkles,
  UserCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatRuntime, formatNumber } from "../utils/formatters";
import { StarRating } from "../components/ui/StarRating";
import { Chip } from "../components/ui/Chip";
import { EpisodeSelector } from "../components/media/EpisodeSelector";
import { MediaCarousel } from "../components/media/MediaCarousel";
import {
  useRateMedia,
  useDeleteRating,
  useUserRating,
  useRatingStats,
  useWatchlistCheck,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useSimilarMedia,
} from "../hooks/useMedia";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const ease = [0.16, 1, 0.3, 1] as const;

function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

function PersonAvatar({
  src,
  name,
  className,
  ringClass,
}: {
  src?: string;
  name: string;
  className?: string;
  ringClass?: string;
}) {
  const [broken, setBroken] = useState(false);
  const base = `shrink-0 overflow-hidden rounded-full object-cover ${ringClass ?? ""}`;
  if (!src || broken) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-dark-700 to-dark-800 font-bold text-dark-400 ${ringClass ?? ""} ${className ?? ""}`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`${base} ${className ?? ""}`}
    />
  );
}

function TrailerModal({ url, onClose }: { url: string; onClose: () => void }) {
  const ytId = getYouTubeId(url);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative w-full max-w-4xl aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white backdrop-blur hover:bg-black/80 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={url} controls autoPlay className="h-full w-full" />
        )}
      </motion.div>
    </motion.div>
  );
}

export function MediaDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showShareToast, setShowShareToast] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const rateMedia = useRateMedia();
  const deleteRating = useDeleteRating();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());

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

  const { data: media, isLoading } = useQuery({
    queryKey: ["media", "slug", slug],
    queryFn: () => mediaApi.getBySlug(slug!),
    select: (r) => r.data.data as Media,
    enabled: !!slug,
  });

  const mediaId = media?.id || "";
  const { data: userRating } = useUserRating(mediaId);
  const { data: ratingStats } = useRatingStats(mediaId);
  const { data: inWatchlist = false } = useWatchlistCheck(mediaId);
  const { data: similar } = useSimilarMedia(mediaId);

  // Backdrop parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const castRef = useRef<HTMLDivElement>(null);

  const scrollCast = (dir: 'left' | 'right') => {
    const el = castRef.current;
    if (!el) return;
    const amount = 180;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0.35]);

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-4 border-primary-500 border-t-transparent"
        />
      </div>
    );

  if (!media)
    return (
      <div className="flex min-h-screen items-center justify-center text-xl text-dark-200">
        Media not found
      </div>
    );

  const year =
    media.releaseDate || media.firstAirDate
      ? new Date(media.releaseDate || media.firstAirDate!).getFullYear()
      : null;
  const trailerUrl = media.trailerUrl;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleWatchlist = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to use watchlist");
      return;
    }
    if (inWatchlist) {
      removeFromWatchlist.mutate(mediaId, {
        onSuccess: () => toast.success("Removed from My List"),
        onError: () => toast.error("Failed to remove"),
      });
    } else {
      addToWatchlist.mutate(mediaId, {
        onSuccess: () => toast.success("Added to My List"),
        onError: () => toast.error("Failed to add"),
      });
    }
  };

  const similarItems = (similar || []).map((s) => s.media);
  const similarReasons: Record<string, string> = {};
  for (const s of similar || []) similarReasons[s.media.id] = s.reason;

  const match = Math.min(
    99,
    Math.max(40, Math.round((media.imdbRating || media.popularity || 8) * 10)),
  );

  return (
    <div className="min-h-screen">
      {/* ===== BACKDROP HERO ===== */}
      <div ref={heroRef} className="relative overflow-hidden">
        {media.backdropUrl && (
          <motion.div
            style={{ y: bgY, scale: bgScale }}
            className="absolute inset-0"
          >
            <img
              src={media.backdropUrl}
              alt=""
              className="h-[130%] w-full object-cover"
            />
          </motion.div>
        )}
        <motion.div
          style={{ opacity: fade }}
          className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/60 to-black/30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-950/90 via-dark-950/30 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-28 sm:px-10 sm:pt-32 lg:px-14">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </motion.button>

          <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
            {/* Poster */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease }}
              className="hidden lg:block"
            >
              {media.posterUrl ? (
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-primary-600/15 blur-3xl" />
                  <div className="relative rounded-2xl border border-white/[0.1] bg-dark-900/70 p-1.5 shadow-card">
                    <img
                      src={media.posterUrl}
                      alt={media.title}
                      className="w-full max-w-[300px] aspect-[2/3] rounded-xl object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </motion.div>

            {/* Info */}
            <div className="min-w-0 text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.6, ease }}
                className="mb-4 flex flex-wrap items-center gap-2"
              >
                <Chip
                  tone="primary"
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
                >
                  {media.type === "MOVIE"
                    ? "Movie"
                    : media.type === "ANIME"
                      ? "Anime"
                      : "Series"}
                </Chip>
                {media.quality && (
                  <span className="rounded-[4px] border border-white/40 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/90">
                    {media.quality}
                  </span>
                )}
                {media.featured && (
                  <Chip
                    tone="gold"
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
                  >
                    ★ Featured
                  </Chip>
                )}
                <span className="font-bold text-green-400">{match}% Match</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease }}
                className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl text-balance"
              >
                {media.title}
              </motion.h1>

              {media.originalTitle && media.originalTitle !== media.title && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-1 text-sm italic text-dark-400"
                >
                  {media.originalTitle}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease }}
                className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-dark-300"
              >
                {media.imdbRating ? (
                  <span className="flex items-center gap-1 font-semibold text-yellow-400">
                    <Star className="h-4 w-4 fill-yellow-400" />{" "}
                    {media.imdbRating.toFixed(1)}{" "}
                    <span className="text-dark-500 font-normal">IMDb</span>
                  </span>
                ) : null}
                {year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {year}
                  </span>
                )}
                {media.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />{" "}
                    {formatRuntime(media.runtime)}
                  </span>
                )}
                {media.numberOfSeasons ? (
                  <span>
                    {media.numberOfSeasons} Season
                    {media.numberOfSeasons > 1 ? "s" : ""}
                  </span>
                ) : null}
                {media.viewCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />{" "}
                    {formatNumber(media.viewCount)}
                  </span>
                )}
              </motion.div>

              {media.genres?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {media.genres.map((g) => (
                    <Chip
                      key={g.id}
                      className="cursor-default transition-colors hover:border-white/25 hover:text-white"
                    >
                      {g.name}
                    </Chip>
                  ))}
                </motion.div>
              )}

              {media.shortDescription && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.48 }}
                  className="mt-4 text-sm italic leading-relaxed text-dark-400"
                >
                  {media.shortDescription}
                </motion.p>
              )}

              {media.overview && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6, ease }}
                  className="mt-4 max-w-3xl text-sm leading-relaxed text-dark-100/90 sm:text-base"
                >
                  {media.overview}
                </motion.p>
              )}

              {/* Action bar */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.6, ease }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                {media.watchUrl && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/watch/${media.id}`)}
                    className="inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3 text-sm font-bold text-black shadow-[0_8px_40px_rgba(255,255,255,0.25)] transition-all hover:scale-[1.03]"
                  >
                    <Play className="h-5 w-5 fill-black" /> Watch Now
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleWatchlist}
                  disabled={
                    addToWatchlist.isPending || removeFromWatchlist.isPending
                  }
                  className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur-xl transition-all disabled:opacity-50 ${
                    inWatchlist
                      ? "border-primary-500/40 bg-primary-600/15 text-primary-400"
                      : "border-white/20 bg-white/[0.08] text-white hover:bg-white/[0.16]"
                  }`}
                >
                  {addToWatchlist.isPending || removeFromWatchlist.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : inWatchlist ? (
                    <HeartOff className="h-4 w-4" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                  {inWatchlist ? "Remove" : "My List"}
                </motion.button>
                {trailerUrl && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowTrailer(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/[0.16]"
                  >
                    <Film className="h-4 w-4" /> Trailer
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/[0.16]"
                >
                  <Share2 className="h-4 w-4" /> Share
                </motion.button>
                <AnimatePresence>
                  {showShareToast && (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Link copied!
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Meta grid */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6, ease }}
                className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-white/[0.08] bg-dark-900/70 p-6 text-sm shadow-card sm:grid-cols-3 lg:grid-cols-4"
              >
                {media.countries?.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Country
                    </p>
                    <p className="font-medium text-white/80">
                      {media.countries.map((c) => c.name).join(", ")}
                    </p>
                  </div>
                )}
                {media.languages?.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Language
                    </p>
                    <p className="font-medium text-white/80">
                      {media.languages.map((l) => l.name).join(", ")}
                    </p>
                  </div>
                )}
                {media.productionYear && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Year
                    </p>
                    <p className="font-medium text-white/80">
                      {media.productionYear}
                    </p>
                  </div>
                )}
                {media.runtime && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Runtime
                    </p>
                    <p className="font-medium text-white/80">
                      {formatRuntime(media.runtime)}
                    </p>
                  </div>
                )}
                {media.imdbRating && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      IMDb Rating
                    </p>
                    <p className="flex items-center gap-1 font-medium text-yellow-400">
                      <Star className="h-3.5 w-3.5 fill-yellow-400" />{" "}
                      {media.imdbRating.toFixed(1)}/10
                    </p>
                  </div>
                )}
                {media.popularity > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Popularity
                    </p>
                    <p className="font-medium text-white/80">
                      {media.popularity.toFixed(1)}
                    </p>
                  </div>
                )}
                {media.quality && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Quality
                    </p>
                    <p className="font-medium text-white/80">{media.quality}</p>
                  </div>
                )}
                {media.status && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Status
                    </p>
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        media.status === "RELEASED"
                          ? "bg-green-500/15 text-green-400"
                          : media.status === "ONGOING"
                            ? "bg-blue-500/15 text-blue-400"
                            : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {media.status === "RELEASED"
                        ? "Released"
                        : media.status === "ONGOING"
                          ? "Ongoing"
                          : "Upcoming"}
                    </span>
                  </div>
                )}
                {media.numberOfSeasons ? (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Seasons
                    </p>
                    <p className="font-medium text-white/80">
                      {media.numberOfSeasons}
                    </p>
                  </div>
                ) : null}
                {media.numberOfEpisodes ? (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Episodes
                    </p>
                    <p className="font-medium text-white/80">
                      {media.numberOfEpisodes}
                    </p>
                  </div>
                ) : null}
                {media.viewCount > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Views
                    </p>
                    <p className="font-medium text-white/80">
                      {formatNumber(media.viewCount)}
                    </p>
                  </div>
                )}
                {media._count?.ratings != null && media._count.ratings > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Ratings
                    </p>
                    <p className="font-medium text-white/80">
                      {formatNumber(media._count.ratings)}
                    </p>
                  </div>
                )}
                {media.type !== "MOVIE" && media.lastAirDate && (
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                      Last Air Date
                    </p>
                    <p className="font-medium text-white/80">
                      {new Date(media.lastAirDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

<div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-14">
         <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            {/* Rating bar */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex w-fit flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-white/[0.08] bg-dark-900/70 px-5 py-3 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white/60">
                  Rate this:
                </span>
                {isAuthenticated ? (
                  <StarRating
                    value={userRating ?? 0}
                    maxRating={10}
                    size="sm"
                    onChange={(v) => {
                      rateMedia.mutate(
                        { mediaId: media.id, value: v },
                        {
                          onSuccess: () => toast.success("Rating saved"),
                          onError: () => toast.error("Failed to save rating"),
                        },
                      );
                    }}
                    onDelete={() => {
                      deleteRating.mutate(media.id, {
                        onSuccess: () => toast.success("Rating removed"),
                        onError: () => toast.error("Failed to remove rating"),
                      });
                    }}
                  />
                ) : (
                  <span className="text-xs text-dark-400">Sign in to rate</span>
                )}
              </div>
              {ratingStats && ratingStats.count > 0 && (
                <div className="flex items-center gap-3 border-l border-white/[0.08] pl-5">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold text-white">
                      {ratingStats.average.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-dark-400">
                    ({ratingStats.count} rating
                    {ratingStats.count !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
              {rateMedia.isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-primary-400" />
              )}
            </motion.section>

            {/* Directors */}
            {media.directors && media.directors.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="py-8"
              >
                <h2 className="mb-5 text-xl font-bold tracking-tight">
                  {media.directors.length > 1 ? "Directors" : "Director"}
                </h2>
                <div className="flex flex-wrap gap-4">
                  {media.directors.map((d, i) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      whileHover={{ y: -4 }}
                      className="flex min-w-[200px] items-center gap-3 rounded-2xl border border-white/[0.08] bg-dark-900/70 px-4 py-3 shadow-card transition-colors hover:border-white/[0.16]"
                    >
                      <PersonAvatar
                        src={d.person.profilePath}
                        name={d.person.name}
                        ringClass="ring-2 ring-primary-500/30"
                        className="h-11 w-11 text-base"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {d.person.name}
                        </p>
                        <p className="text-xs text-dark-400">Director</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Episodes */}
            {media.type === "TV_SHOW" && media.seasons?.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="py-8"
              >
                <h2 className="mb-5 text-xl font-bold tracking-tight">
                  Episodes
                </h2>
                <EpisodeSelector
                  seasons={media.seasons}
                  mediaId={media.id}
                  onSelectEpisode={(watchUrl, episodeNumber, seasonNumber) => {
                    navigate(
                      `/watch/${media.id}?season=${seasonNumber}&episode=${episodeNumber}`,
                    );
                  }}
                />
              </motion.section>
            )}

            {/* Cast */}
            {media.cast?.length > 0 && (
              <div className="py-8">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-dark-300">Cast</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => scrollCast('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-dark-900/80 text-white/50 hover:bg-dark-800/90 hover:text-white transition-colors"
                    aria-label="Scroll cast left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCast('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-dark-900/80 text-white/50 hover:bg-dark-800/90 hover:text-white transition-colors"
                    aria-label="Scroll cast right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div
                    ref={castRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-3"
                  >
                    {media.cast.slice(0, 20).map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-col items-center text-center shrink-0 w-20 group cursor-pointer"
                      >
                        <div className="relative mb-3 h-18 w-18 overflow-hidden rounded-full border border-white/[0.08] shadow-soft transition-all duration-300 group-hover:border-white/[0.16] group-hover:shadow-glow-red">
                          <PersonAvatar
                            src={c.person.profilePath}
                            name={c.person.name}
                            ringClass="ring-2 ring-dark-700"
                            className="h-18 w-18 text-sm"
                          />
                        </div>
                        <p
                          className="text-[11px] font-semibold text-white line-clamp-1 w-full transition-colors group-hover:text-primary-400"
                          title={c.person.name}
                        >
                          {c.person.name}
                        </p>
                        {c.character && (
                          <p
                            className="mt-0.5 truncate text-[9px] text-dark-400 line-clamp-1 w-full transition-colors group-hover:text-dark-200"
                            title={c.character}
                          >
                            as {c.character}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-dark-950 via-dark-950/80 to-transparent pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-28 space-y-6">
              {media.keywords && media.keywords.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/70 p-5 shadow-card">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-dark-500">
                    Keywords
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {media.keywords.map((kw) => (
                      <li key={kw.id}>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-dark-300 transition-colors hover:border-white/20 hover:text-white">
                          {kw.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== More Like This ===== */}
      {similarItems.length > 0 && (
        <div className="pt-6">
          <MediaCarousel
            title="More Like This"
            eyebrow="Because you like this title"
            icon={<Sparkles className="h-4 w-4" />}
            items={similarItems.slice(0, 20)}
            reasons={similarReasons}
            onItemClick={(m) => navigate(`/media/${m.slug}`)}
            onPlay={(m) => navigate(`/watch/${m.id}`)}
            onAddToList={handleAddToList}
            onLike={(m) => toast.success('Added to your likes')}
          />
        </div>
      )}

      {/* Keywords on mobile (sidebar hidden) */}
      {media.keywords && media.keywords.length > 0 && (
        <div className="px-6 pt-2 sm:px-10 lg:hidden lg:px-14">
          <ul className="flex flex-wrap gap-2">
            {media.keywords.map((kw) => (
              <li key={kw.id}>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-dark-300">
                  {kw.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trailer modal */}
      <AnimatePresence>
        {showTrailer && trailerUrl && (
          <TrailerModal
            url={trailerUrl}
            onClose={() => setShowTrailer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
