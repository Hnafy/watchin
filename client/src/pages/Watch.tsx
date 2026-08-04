import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mediaApi } from '../services/api';
import { watchHistoryApi } from '../services/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useUpdateProgress } from '../hooks/useMedia';
import { VideoPlayer } from '../components/media/VideoPlayer';
import { EpisodeSelector } from '../components/media/EpisodeSelector';

export function Watch() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const updateProgress = useUpdateProgress();

  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');

  const { data: media, isLoading } = useQuery({
    queryKey: ['media', id],
    queryFn: () => mediaApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
    staleTime: 600_000,
  });

  const saveTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Resolve watch URL: episode-specific or media-level
  const resolvedSrc = (() => {
    if (!media) return '';
    if (seasonParam && episodeParam && media.seasons) {
      const season = media.seasons.find((s: any) => s.seasonNumber === Number(seasonParam));
      if (season) {
        const ep = season.episodes.find((e: any) => e.episodeNumber === Number(episodeParam));
        if (ep?.watchUrl) return ep.watchUrl;
      }
    }
    return media.watchUrl || '';
  })();

  const currentSeasonNum = seasonParam ? Number(seasonParam) : 0;
  const currentEpisodeNum = episodeParam ? Number(episodeParam) : 0;

  // Fetch saved progress for this media/episode on mount
  const { data: savedProgress = 0 } = useQuery({
    queryKey: ['watch-progress', id, seasonParam, episodeParam],
    queryFn: async () => {
      if (!id || !isAuthenticated) return 0;
      const r = await watchHistoryApi.getHistory(1, 50);
      const items = r.data.data || [];
      const match = items.find((h: any) =>
        h.mediaId === id &&
        !h.completed &&
        (currentEpisodeNum ? h.episodeNumber === currentEpisodeNum : true)
      );
      return match?.progress || 0;
    },
    enabled: !!id && isAuthenticated,
    staleTime: 60_000,
  });

  // Auto-save progress every 10 seconds
  const handleProgress = useCallback((currentTime: number, duration: number) => {
    if (!id || !isAuthenticated || !resolvedSrc) return;
    updateProgress.mutate({
      mediaId: id,
      progress: Math.floor(currentTime),
      duration: Math.floor(duration),
      seasonNumber: currentSeasonNum || undefined,
      episodeNumber: currentEpisodeNum || undefined,
    });
  }, [id, isAuthenticated, resolvedSrc, updateProgress, currentSeasonNum, currentEpisodeNum]);

  // Save progress on page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (id && isAuthenticated) {
        const blob = new Blob([JSON.stringify({
          mediaId: id,
          progress: 0,
          duration: 0,
          seasonNumber: currentSeasonNum || undefined,
          episodeNumber: currentEpisodeNum || undefined,
        })], { type: 'application/json' });
        navigator.sendBeacon('/api/history', blob);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [id, isAuthenticated, currentSeasonNum, currentEpisodeNum]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4 pt-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full"
        />
        <p className="text-dark-400 text-sm">Loading player...</p>
      </div>
    );
  }

  if (!media || !resolvedSrc) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center text-white pt-16">
        <div className="text-center">
          <p className="text-lg mb-2">Video not available</p>
          <p className="text-dark-400 text-sm">
            {media?.type === 'TV_SHOW' && !resolvedSrc
              ? 'Select an episode to watch'
              : 'No video source found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      {/* Player section */}
      <div className="bg-black pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-all"
          >
            <ArrowLeft className="h-5 w-5" /> Back
          </motion.button>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative bg-black rounded-xl overflow-hidden shadow-2xl mx-auto"
            style={{ maxWidth: '1280px' }}
          >
            <VideoPlayer
              src={resolvedSrc}
              title={media.title}
              poster={media.backdropUrl || undefined}
              initialProgress={savedProgress}
              onProgress={handleProgress}
            />
          </motion.div>

          {/* Episode title */}
          {currentEpisodeNum > 0 && (
            <div className="mt-3 text-center">
              <p className="text-sm text-white/60">
                {media.title} — Season {currentSeasonNum}, Episode {currentEpisodeNum}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info & episode selector */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h1 className="text-2xl font-semibold">{media.title}</h1>

          {media.type === 'TV_SHOW' && media.seasons?.length > 0 && (
            <div className="max-w-2xl">
              <EpisodeSelector
                seasons={media.seasons}
                mediaId={media.id}
                defaultSeason={currentSeasonNum}
                onSelectEpisode={(watchUrl, epNum, snNum) => {
                  navigate(`/watch/${media.id}?season=${snNum}&episode=${epNum}`, { replace: true });
                }}
              />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
