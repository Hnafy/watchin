import { useState } from 'react';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface Episode {
  id: string;
  episodeNumber: number;
  name: string;
  overview?: string | null;
  stillUrl?: string | null;
  runtime?: number | null;
  hasWatchSource?: boolean;
}

interface Season {
  id: string;
  seasonNumber: number;
  name?: string | null;
  episodeCount: number;
  episodes: Episode[];
}

interface EpisodeSelectorProps {
  seasons: Season[];
  mediaId: string;
  onSelectEpisode: (episodeNumber: number, seasonNumber: number) => void;
  defaultSeason?: number;
}

export function EpisodeSelector({ seasons, mediaId, onSelectEpisode, defaultSeason = 0 }: EpisodeSelectorProps) {
  const [selectedSeason, setSelectedSeason] = useState(
    defaultSeason > 0 ? defaultSeason : (seasons[0]?.seasonNumber ?? 0)
  );

  const currentSeason = seasons.find((s) => s.seasonNumber === selectedSeason);
  const episodes = currentSeason?.episodes || [];

  return (
    <div className="space-y-4">
      {/* Season selector */}
      {seasons.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-white/50 font-medium whitespace-nowrap">Season:</label>
          <div className="flex flex-wrap gap-1.5">
            {seasons.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSeason(s.seasonNumber)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  s.seasonNumber === selectedSeason
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700 border border-dark-600'
                }`}
              >
                {s.name || `Season ${s.seasonNumber}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Season info */}
      {currentSeason && currentSeason.name && (
        <p className="text-xs text-dark-400">{currentSeason.name}</p>
      )}

      {/* Episode list */}
      {episodes.length === 0 ? (
        <p className="text-sm text-dark-400 py-4">No episodes available for this season.</p>
      ) : (
        <div className="space-y-1.5">
          {episodes.map((ep, ei) => {
            const watchable = !!ep.hasWatchSource;
            return (
              <motion.button
                key={ep.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: ei * 0.03 }}
                whileHover={watchable ? { x: 4 } : undefined}
                onClick={() => {
                  if (watchable) {
                    onSelectEpisode(ep.episodeNumber, selectedSeason);
                  }
                }}
                disabled={!watchable}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  watchable
                    ? 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-primary-500/30 cursor-pointer'
                    : 'bg-dark-900/50 border border-dark-800 opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Episode number badge */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  watchable
                    ? 'bg-primary-600/15 text-primary-400'
                    : 'bg-dark-700 text-dark-500'
                }`}>
                  <span className="text-sm font-bold">{ep.episodeNumber}</span>
                </div>

                {/* Thumbnail */}
                {ep.stillUrl && (
                  <img
                    src={ep.stillUrl}
                    alt=""
                    className="h-14 w-24 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${watchable ? 'text-white/90' : 'text-dark-400'}`}>
                    {ep.name || `Episode ${ep.episodeNumber}`}
                  </p>
                  {ep.overview && (
                    <p className="text-xs text-dark-400 line-clamp-1 mt-0.5">{ep.overview}</p>
                  )}
                </div>

                {/* Runtime */}
                {ep.runtime && (
                  <span className="text-xs text-dark-500 flex-shrink-0">{ep.runtime}m</span>
                )}

                {/* Watch button */}
                {watchable && (
                  <div className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors flex items-center gap-1">
                    <Play className="h-3 w-3 fill-current" /> Watch
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
