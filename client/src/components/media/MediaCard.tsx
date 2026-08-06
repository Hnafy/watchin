import { motion } from "framer-motion";
import { Play, Plus, ThumbsUp, ChevronDown } from "lucide-react";
import { Media } from "../../types";
import { LazyImage } from "../ui/LazyImage";
import { Chip } from "../ui/Chip";

interface MediaCardProps {
  media: Media;
  index?: number;
  onClick?: () => void;
  variant?: "default" | "wide" | "compact" | "banner";
  progress?: number;
  reason?: string;
  onPlay?: () => void;
  onAddToList?: () => void;
  onLike?: () => void;
  fill?: boolean;
}

function matchPercent(media: Media): number {
  if (media.imdbRating) return Math.min(99, Math.max(40, Math.round(media.imdbRating * 10)));
  if (media.popularity) return Math.min(99, Math.max(40, Math.round(media.popularity)));
  return 97;
}

function yearOf(media: Media): number | null {
  const d = media.releaseDate || media.firstAirDate;
  return d ? new Date(d).getFullYear() : null;
}

export function MediaCard({
  media,
  onClick,
  variant = "default",
  progress,
  reason,
  onPlay,
  onAddToList,
  onLike,
  fill,
}: MediaCardProps) {
  const isBanner = variant === "banner";
  const widthClass = fill
    ? "w-full"
    : isBanner
      ? "w-[320px] sm:w-[400px]"
      : variant === "wide"
        ? "w-[310px] sm:w-[380px]"
        : variant === "compact"
          ? "w-[160px] sm:w-[180px]"
          : "w-[190px] sm:w-[220px]";
  const aspectClass = variant === "wide" || isBanner ? "aspect-video" : "aspect-[2/3]";
  const imgUrl = isBanner ? media.backdropUrl : media.posterUrl;
  const match = matchPercent(media);
  const year = yearOf(media);

  return (
    <motion.div
      onClick={onClick}
      className={`relative flex-shrink-0 ${widthClass} cursor-pointer group`}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      <div className={`relative overflow-hidden ${aspectClass} rounded-xl bg-black/20 border border-white/[0.06] shadow-card transition-all duration-300 group-hover:border-white/[0.12]`}>
        {imgUrl ? (
          <LazyImage src={imgUrl} alt={media.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
            <Play className="h-10 w-10 text-dark-600" />
          </div>
        )}

        {/* Type badge */}
        {media.type !== "MOVIE" && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <Chip tone="primary" className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary-600/90 text-white border-primary-500/40">
              {media.type === "ANIME" ? "Anime" : "Series"}
            </Chip>
          </div>
        )}

        {/* Rating badge */}
        {(media.imdbRating ?? 0) > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
              ★ {media.imdbRating!.toFixed(1)}
            </span>
          </div>
        )}

        {/* Featured chip */}
        {media.featured && (
          <div className="absolute bottom-14 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/90 to-primary-600/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-lg">
              ★ Featured
            </span>
          </div>
        )}

        {/* Progress bar */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-10">
            <div className="h-full rounded-r-full bg-gradient-to-r from-primary-600 to-primary-400" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        )}

        {/* Hover info panel */}
        <div className="absolute inset-x-0 bottom-0 p-3 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPlay?.(); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-200 ease-out-expo hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-400/60"
              aria-label="Play"
            >
              <Play className="h-4 w-4 fill-white" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddToList?.(); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all duration-200 ease-out-expo hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Add to list"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onLike?.(); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all duration-200 ease-out-expo hover:bg-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
              aria-label="Like"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <span className="ml-auto">
              <ChevronDown className="h-4 w-4 text-white/50" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium">
            <span className="font-bold text-green-400">{match}% Match</span>
            {year && <span className="text-white/90">{year}</span>}
            <span className="rounded-[3px] border border-white/40 px-0.5 text-[9px] leading-tight text-white/90">
              {media.type === "MOVIE" ? media.quality || "HD" : media.type === "ANIME" ? "ANIME" : "TV"}
            </span>
            {media.runtime && (
              <span className="text-white/60">{Math.floor(media.runtime / 60)}h {media.runtime % 60}m</span>
            )}
          </div>
          {reason && (
            <p className="mt-1.5 text-[10px] leading-snug text-primary-300/90 line-clamp-1">{reason}</p>
          )}
          <p className="mt-0.5 text-xs font-bold text-white line-clamp-1 drop-shadow">{media.title}</p>
        </div>
      </div>
    </motion.div>
  );
}