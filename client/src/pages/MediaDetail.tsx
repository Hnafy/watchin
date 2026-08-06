import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { mediaApi, tmdbApi } from "../services/api";
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
  Images,
} from "lucide-react";
import { formatRuntime, formatNumber } from "../utils/formatters";
import { getEmbedInfo, withAutoplay } from "../utils/embeds";
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
import toast from "react-hot-toast";

const ease = [0.16, 1, 0.3, 1] as const;

interface GalleryItem {
  kind: "backdrop" | "poster" | "video";
  url: string;
  embedUrl?: string;
  label: string;
}

function useHorizontalScroll(selector: string, fallbackWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [check]);

  const scrollBy = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    const amount = (el.querySelector<HTMLElement>(selector)?.offsetWidth || fallbackWidth) + 16;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return { ref, canLeft, canRight, scrollBy };
}

function GalleryLightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const total = items.length;
  const item = items[index];
  const prev = (index - 1 + total) % total;
  const next = (index + 1) % total;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate(prev);
      if (e.key === "ArrowRight") onNavigate(next);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onNavigate, prev, next]);

  if (!item) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 px-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close gallery"
        className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10"
      >
        <X className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(prev);
        }}
        aria-label="Previous"
        className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 sm:left-5"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(next);
        }}
        aria-label="Next"
        className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 sm:right-5"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease }}
        className="relative flex w-full max-w-5xl flex-col items-center"
      >
        {item.kind === "video" ? (
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
            <iframe
              src={withAutoplay(item.embedUrl!, true)}
              title={item.label}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <img
            src={item.url}
            alt={item.label}
            className="max-h-[82vh] w-auto max-w-full rounded-2xl border border-white/10 object-contain shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
          />
        )}
        <div className="mt-4 flex w-full items-center justify-between gap-4">
          <p className="truncate text-sm font-semibold text-white">{item.label}</p>
          <p className="shrink-0 text-sm text-dark-400">
            {index + 1} / {total}
          </p>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

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
  const embed = getEmbedInfo(url);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        onClick={onClose}
      />
      <button
        onClick={onClose}
        aria-label="Close trailer"
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10"
      >
        <X className="h-5 w-5" />
      </button>
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative w-full max-w-5xl aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
      >
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : embed ? (
          <iframe
            src={withAutoplay(embed.src, true)}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            scrolling="no"
            frameBorder={0}
            referrerPolicy="origin"
          />
        ) : (
          <video src={url} controls autoPlay className="h-full w-full" />
        )}
      </motion.div>
    </motion.div>,
    document.body,
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
  const [canScrollCastLeft, setCanScrollCastLeft] = useState(false);
  const [canScrollCastRight, setCanScrollCastRight] = useState(true);

  const checkCastScroll = useCallback(() => {
    const el = castRef.current;
    if (!el) return;
    setCanScrollCastLeft(el.scrollLeft > 8);
    setCanScrollCastRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = castRef.current;
    if (!el) return;
    checkCastScroll();
    const ro = new ResizeObserver(checkCastScroll);
    ro.observe(el);
    el.addEventListener("scroll", checkCastScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", checkCastScroll);
    };
  }, [checkCastScroll]);

  const scrollCast = (dir: 'left' | 'right') => {
    const el = castRef.current;
    if (!el) return;
    const amount = (el.querySelector<HTMLElement>('[data-cast-card]')?.offsetWidth || 80) + 16;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // Photos & Videos gallery
  const photosScroll = useHorizontalScroll("[data-photo-card]", 288);
  const videosScroll = useHorizontalScroll("[data-video-card]", 288);
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [videos, setVideos] = useState<GalleryItem[]>([]);
  const [galleryOpen, setGalleryOpen] = useState<{ items: GalleryItem[]; index: number } | null>(null);

  useEffect(() => {
    const tmdbId = media?.tmdbId;
    if (!tmdbId) return;
    let cancelled = false;
    tmdbApi
      .getImages(tmdbId, media.type)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        setPhotos([
          ...(data?.backdrops || []).map((b: any, i: number) => ({
            kind: 'backdrop' as const,
            url: b.url,
            label: `Backdrop ${i + 1}`,
          })),
          ...(data?.posters || []).map((p: any, i: number) => ({
            kind: 'poster' as const,
            url: p.url,
            label: `Poster ${i + 1}`,
          })),
        ]);
        setVideos(
          (data?.videos || []).map((v: any) => ({
            kind: 'video' as const,
            url: v.thumbnailUrl || v.embedUrl,
            embedUrl: v.embedUrl,
            label: v.name,
          })),
        );
      })
      .catch(() => { /* hide gallery when TMDB unavailable */ });
    return () => {
      cancelled = true;
    };
  }, [media?.tmdbId, media?.type]);
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

        <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-4 sm:px-10 sm:pt-6 lg:px-14">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="group mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-xl transition-all hover:-translate-x-0.5 hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" /> Back
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
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3, ease }}
                >
                  <div className="absolute -inset-5 rounded-[28px] bg-gradient-to-br from-primary-600/25 via-purple-500/10 to-sky-500/25 blur-3xl" />
                  <div className="relative overflow-hidden rounded-2xl bg-dark-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
                    <img
                      src={media.posterUrl}
                      alt={media.title}
                      className="w-full aspect-[2/3] object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6, ease }}
                  className="flex aspect-[2/3] w-full max-w-[300px] items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-dark-800 to-dark-900 shadow-card"
                >
                  <Film className="h-12 w-12 text-dark-500" />
                </motion.div>
              )}
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

            {/* Episodes */}
            {media.type === "TV_SHOW" && media.seasons?.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="py-8"
              >
                <div className="mb-5 flex items-center gap-3">
                  <motion.span
                    initial={{ scaleY: 0, opacity: 0 }}
                    whileInView={{ scaleY: 1, opacity: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ originY: 0 }}
                    className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary-400 to-primary-600"
                    aria-hidden="true"
                  />
                  <h2 className="text-lg font-bold uppercase tracking-widest text-white">
                    Episodes
                  </h2>
                </div>
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

            {/* Cast & Crew */}
            {((media.cast?.length || 0) > 0 || (media.directors?.length || 0) > 0) && (
              <section className="py-8">
                <div className="group/team mb-5 flex items-end justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <motion.span
                    initial={{ scaleY: 0, opacity: 0 }}
                    whileInView={{ scaleY: 1, opacity: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ originY: 0 }}
                    className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary-400 to-primary-600"
                    aria-hidden="true"
                  />
                    <h2 className="text-lg font-bold uppercase tracking-widest text-white">Cast &amp; Crew</h2>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover/team:opacity-100">
                    <button
                      type="button"
                      onClick={() => scrollCast("left")}
                      aria-label="Scroll left"
                      className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 ${canScrollCastLeft ? "" : "opacity-40 pointer-events-none"}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCast("right")}
                      aria-label="Scroll right"
                      className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 ${canScrollCastRight ? "" : "opacity-40 pointer-events-none"}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/70 p-5 shadow-card">
                  <div className="relative">
                    <div
                      ref={castRef}
                      className="flex gap-4 overflow-x-auto scrollbar-hide px-1 pb-2"
                    >
                      {(media.directors || []).map((d) => (
                        <div
                          key={d.id}
                          data-cast-card
                          className="group flex w-20 shrink-0 cursor-pointer flex-col items-center text-center"
                        >
                          <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full border border-primary-500/30 shadow-soft group-hover:border-primary-500/60">
                            <PersonAvatar
                              src={d.person.profilePath}
                              name={d.person.name}
                              ringClass="ring-2 ring-primary-500/30"
                              className="h-20 w-20 text-lg"
                            />
                          </div>
                          <p
                            className="w-full truncate text-[11px] font-semibold text-white line-clamp-1 transition-colors group-hover:text-primary-400"
                            title={d.person.name}
                          >
                            {d.person.name}
                          </p>
                          <p className="mt-0.5 w-full truncate text-[9px] text-primary-300/90">
                            Director
                          </p>
                        </div>
                      ))}
                      {(media.cast || []).slice(0, 24).map((c) => (
                        <div
                          key={c.id}
                          data-cast-card
                          className="group flex w-20 shrink-0 cursor-pointer flex-col items-center text-center"
                        >
                          <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full border border-white/[0.08] shadow-soft group-hover:border-white/[0.16]">
                            <PersonAvatar
                              src={c.person.profilePath}
                              name={c.person.name}
                              ringClass="ring-2 ring-dark-700"
                              className="h-20 w-20 text-lg"
                            />
                          </div>
                          <p
                            className="w-full truncate text-[11px] font-semibold text-white line-clamp-1 transition-colors group-hover:text-primary-400"
                            title={c.person.name}
                          >
                            {c.person.name}
                          </p>
                          {c.character && (
                            <p
                              className="mt-0.5 w-full truncate text-[9px] text-dark-400 line-clamp-1 transition-colors group-hover:text-dark-200"
                              title={c.character}
                            >
                              as {c.character}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div
                      className={`pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-dark-900 via-dark-900/80 to-transparent transition-opacity duration-300 ${canScrollCastRight ? "opacity-100" : "opacity-0"}`}
                    />
                    <div
                      className={`pointer-events-none absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-dark-900 via-dark-900/80 to-transparent transition-opacity duration-300 ${canScrollCastLeft ? "opacity-100" : "opacity-0"}`}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <section className="py-8">
                <div className="group/photos mb-5 flex items-end justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <motion.span
                    initial={{ scaleY: 0, opacity: 0 }}
                    whileInView={{ scaleY: 1, opacity: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ originY: 0 }}
                    className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary-400 to-primary-600"
                    aria-hidden="true"
                  />
                    <h2 className="text-lg font-bold uppercase tracking-widest text-white">Photos</h2>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover/photos:opacity-100">
                    <button
                      type="button"
                      onClick={() => photosScroll.scrollBy("left")}
                      aria-label="Scroll photos left"
                      className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 ${photosScroll.canLeft ? "" : "opacity-40 pointer-events-none"}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => photosScroll.scrollBy("right")}
                      aria-label="Scroll photos right"
                      className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 ${photosScroll.canRight ? "" : "opacity-40 pointer-events-none"}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/70 p-5 shadow-card">
                  <div className="relative">
                    <div
                      ref={photosScroll.ref}
                      className="flex gap-4 overflow-x-auto scrollbar-hide px-1 pb-2"
                    >
                      {photos.map((p, i) => (
                        <button
                          key={p.url}
                          type="button"
                          data-photo-card
                          onClick={() => setGalleryOpen({ items: photos, index: i })}
                          className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-dark-800 shadow-soft hover:border-white/[0.16] ${
                            p.kind === "poster" ? "w-36" : "w-72"
                          }`}
                        >
                          <img
                            src={p.url}
                            alt={p.label}
                            loading="lazy"
                            className={`w-full object-cover ${
                              p.kind === "poster" ? "aspect-[2/3]" : "aspect-video"
                            }`}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <div className="absolute inset-x-0 bottom-0 translate-y-2 p-2 text-left opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            <p className="truncate text-[10px] font-semibold text-white">{p.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div
                      className={`pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-dark-900 via-dark-900/80 to-transparent transition-opacity duration-300 ${photosScroll.canRight ? "opacity-100" : "opacity-0"}`}
                    />
                    <div
                      className={`pointer-events-none absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-dark-900 via-dark-900/80 to-transparent transition-opacity duration-300 ${photosScroll.canLeft ? "opacity-100" : "opacity-0"}`}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <section className="py-8">
                <div className="group/videos mb-5 flex items-end justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <motion.span
                    initial={{ scaleY: 0, opacity: 0 }}
                    whileInView={{ scaleY: 1, opacity: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ originY: 0 }}
                    className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary-400 to-primary-600"
                    aria-hidden="true"
                  />
                    <h2 className="text-lg font-bold uppercase tracking-widest text-white">Videos</h2>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover/videos:opacity-100">
                    <button
                      type="button"
                      onClick={() => videosScroll.scrollBy("left")}
                      aria-label="Scroll videos left"
                      className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 ${videosScroll.canLeft ? "" : "opacity-40 pointer-events-none"}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => videosScroll.scrollBy("right")}
                      aria-label="Scroll videos right"
                      className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-all hover:border-white/30 hover:bg-white/10 ${videosScroll.canRight ? "" : "opacity-40 pointer-events-none"}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-dark-900/70 p-5 shadow-card">
                  <div className="relative">
                    <div
                      ref={videosScroll.ref}
                      className="flex gap-4 overflow-x-auto scrollbar-hide px-1 pb-2"
                    >
                      {videos.map((v, i) => (
                        <button
                          key={v.url}
                          type="button"
                          data-video-card
                          onClick={() => setGalleryOpen({ items: videos, index: i })}
                          className="group relative w-72 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-dark-800 shadow-soft hover:border-white/[0.16]"
                        >
                          <img
                            src={v.url}
                            alt={v.label}
                            loading="lazy"
                            className="aspect-video w-full object-cover"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-600/90 shadow-glow-red">
                              <Play className="h-4 w-4 fill-white text-white" />
                            </span>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 translate-y-2 p-2 text-left opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            <p className="truncate text-[10px] font-semibold text-white">{v.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div
                      className={`pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-dark-900 via-dark-900/80 to-transparent transition-opacity duration-300 ${videosScroll.canRight ? "opacity-100" : "opacity-0"}`}
                    />
                    <div
                      className={`pointer-events-none absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-dark-900 via-dark-900/80 to-transparent transition-opacity duration-300 ${videosScroll.canLeft ? "opacity-100" : "opacity-0"}`}
                    />
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="mt-40 mb-10 hidden lg:block">
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

      {/* Gallery lightbox */}
      <AnimatePresence>
        {galleryOpen && (
          <GalleryLightbox
            items={galleryOpen.items}
            index={galleryOpen.index}
            onClose={() => setGalleryOpen(null)}
            onNavigate={(i) =>
              setGalleryOpen((prev) => (prev ? { ...prev, index: i } : prev))
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
