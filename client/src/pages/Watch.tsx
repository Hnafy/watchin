import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi, watchHistoryApi, mixdropApi, adminApi, API_URL } from '../services/api';
import {
  ArrowLeft, Loader2, UploadCloud, Check, Save, RefreshCw, Clapperboard, HardDrive, X,
  Star, Clock, CalendarDays, Server as ServerIcon, Lock,
} from 'lucide-react';
import { useRef, useEffect, useCallback, useState, useMemo, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useUpdateProgress } from '../hooks/useMedia';
import { VideoPlayer } from '../components/media/VideoPlayer';
import { EpisodeSelector } from '../components/media/EpisodeSelector';
import { CommentsSection } from '../components/media/CommentsSection';
import { MediaSource, Media } from '../types';
import { useSettings } from '../hooks/useSettings';
import toast from 'react-hot-toast';

interface UploadResult {
  fileref: string;
  url: string;
  embedurl: string;
}

interface WatchSource {
  mediaId: string;
  episodeId?: string;
  title: string;
  watchUrl: string | null;
  sources: MediaSource[];
  hasWatchSource: boolean;
}

export function Watch() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const updateProgress = useUpdateProgress();

  const isAdmin = user?.role === 'ADMIN';

  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');

  const { data: media, isLoading } = useQuery({
    queryKey: ['media', id],
    queryFn: () => mediaApi.getById(id!).then((r) => r.data.data as Media),
    enabled: !!id,
    staleTime: 600_000,
  });

  // Selected episode (TV shows)
  const episode = (() => {
    if (!media || !seasonParam || !episodeParam || !media.seasons) return undefined;
    const season = media.seasons.find((s: any) => s.seasonNumber === Number(seasonParam));
    return season?.episodes.find((e: any) => e.episodeNumber === Number(episodeParam));
  })();

  // Real video URLs are only served to authenticated users.
  const episodeId = episode?.id;

  const { data: watchSource, isLoading: sourceLoading } = useQuery({
    queryKey: ['watch-source', id, episodeId],
    queryFn: () =>
      mediaApi.getWatchSource(id!, episodeId).then((r) => r.data.data as WatchSource),
    enabled: !!id && isAuthenticated && !!media,
    staleTime: 300_000,
  });

  const saveTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Session upload override (this page visit)
  const [playerSrc, setPlayerSrc] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);

  // Preferred source set comes from the protected watch-source response
  const sourceSet: MediaSource[] = watchSource?.sources || [];
  const directUrl = watchSource?.watchUrl || '';

  // Server + quality chosen by the viewer
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);

  // Reset selection when switching titles/episodes
  useEffect(() => {
    setSelectedServer(null);
    setSelectedQuality(null);
  }, [id, seasonParam, episodeParam]);

  const serverGroups = useMemo(() => {
    const map = new Map<string, MediaSource[]>();
    for (const s of sourceSet) {
      const key = s.server?.trim() || 'Default';
      const arr = map.get(key);
      if (arr) arr.push(s);
      else map.set(key, [s]);
    }
    return Array.from(map.entries());
  }, [sourceSet]);

  const activeGroup = selectedServer
    ? serverGroups.find(([name]) => name === selectedServer) || serverGroups[0]
    : serverGroups[0];

  const activeGroupSources = activeGroup?.[1] || [];

  const activeSource = activeGroupSources.length
    ? activeGroupSources.find((s) => selectedQuality !== null && s.label === selectedQuality) || activeGroupSources[0]
    : undefined;

  const resolvedSrc = (() => {
    if (!media) return '';
    if (playerSrc) return playerSrc;
    if (activeSource?.url) return activeSource.url;
    return directUrl;
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
        navigator.sendBeacon(`${API_URL}/history`, blob);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [id, isAuthenticated, currentSeasonNum, currentEpisodeNum]);

  // ----------------------- Upload state -----------------------
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file || uploading) return;
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mkv|mov|avi|m4v)$/i.test(file.name)) {
      toast.error('Please choose a video file');
      return;
    }
    setUploading(true);
    setProgress(0);
    setUploaded(null);
    try {
      const { data } = await mixdropApi.upload(file, setProgress);
      const result: UploadResult = data.data;
      setUploaded(result);
      setPlayerSrc(result.embedurl);
      setShowUpload(false);
      toast.success('Upload complete — playing your video');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const saveUploadedMutation = useMutation({
    mutationFn: (embedUrl: string) => adminApi.updateMediaRecord(id!, { watchUrl: embedUrl }),
    onSuccess: () => {
      toast.success('Saved as the watch source for this title');
      qc.invalidateQueries({ queryKey: ['media', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const resetToOriginal = () => {
    setPlayerSrc(null);
    setUploaded(null);
    setProgress(0);
    toast('Showing original source');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 pt-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full"
        />
        <p className="text-dark-400 text-sm">Loading player...</p>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white pt-16">
        <div className="text-center">
          <p className="text-lg mb-2">Video not available</p>
          <p className="text-dark-400 text-sm">No video source found</p>
        </div>
      </div>
    );
  }

  // Guests can't receive real video URLs — prompt them to log in.
  if (!isAuthenticated && media.hasWatchSource) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white pt-16 px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600/20 ring-1 ring-primary-500/30">
            <Lock className="h-6 w-6 text-primary-400" />
          </div>
          <h1 className="text-xl font-bold">{media.title}</h1>
          <p className="mt-2 text-sm text-dark-300">
            This title is available to watch, but you need to be signed in to access the video.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to={`/login?redirect=/watch/${media.id}${seasonParam ? `?season=${seasonParam}&episode=${episodeParam}` : ''}`}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-500"
            >
              Log in to watch
            </Link>
            <Link
              to={`/register?redirect=/watch/${media.id}${seasonParam ? `?season=${seasonParam}&episode=${episodeParam}` : ''}`}
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (sourceLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 pt-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full"
        />
        <p className="text-dark-400 text-sm">Loading video...</p>
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white pt-16">
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

  const playerLabel = uploaded
    ? `${media.title} — Uploaded video`
    : currentEpisodeNum > 0
      ? `${media.title} — Season ${currentSeasonNum}, Episode ${currentEpisodeNum}`
      : media.title;

  return (
    <div className="min-h-screen text-white">
      {/* Player section */}
      <div className="relative pt-16">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-xl transition-all hover:-translate-x-0.5 hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" /> Back
            </motion.button>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              {uploaded && (
                <button
                  onClick={resetToOriginal}
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Original
                </button>
              )}
              {media.quality && (
                <span className="rounded-md border border-primary-500/40 bg-primary-600/20 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-300">
                  {media.quality}
                </span>
              )}
              {isAdmin && !uploaded && (
                <button
                  onClick={() => setShowUpload(v => !v)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-primary-500 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-primary-600/30"
                >
                  <UploadCloud className="h-3.5 w-3.5" /> Upload video
                </button>
              )}
            </motion.div>
          </div>

          {/* Glass player frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto"
            style={{ maxWidth: '1280px' }}
          >
            {/* ambient glow */}
            <div className="pointer-events-none absolute -inset-4 rounded-[28px] bg-gradient-to-br from-primary-600/25 via-purple-500/10 to-sky-500/20 blur-2xl opacity-70" />

            {/* gradient border frame */}
            <div className="relative rounded-[24px] bg-gradient-to-br from-primary-500/70 via-white/15 to-sky-400/60 p-[1.5px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
              <div className="relative rounded-[22.5px] bg-dark-900/85 p-2.5 backdrop-blur-2xl sm:p-3">
              {/* upload panel */}
              <AnimatePresence>
                {showUpload && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mb-2.5 rounded-xl border border-dashed border-primary-500/40 bg-dark-900/40 p-3">
                      {uploading ? (
                        <div className="space-y-2 py-2">
                          <div className="flex items-center justify-between text-xs text-white/70">
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary-400" />
                              Uploading to Mixdrop...
                            </span>
                            <span className="font-mono text-primary-300">{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-primary-600 to-sky-500"
                              animate={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      ) : uploaded ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-1">
                          <div className="flex items-center gap-2 text-sm text-green-400">
                            <Check className="h-4 w-4" />
                            <span className="font-medium">{uploaded.url}</span>
                          </div>
                          <div className="flex items-center gap-2 sm:ml-auto">
                            <button
                              onClick={() => saveUploadedMutation.mutate(uploaded.embedurl)}
                              disabled={saveUploadedMutation.isPending}
                              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20 disabled:opacity-50"
                            >
                              {saveUploadedMutation.isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Save className="h-3.5 w-3.5" />}
                              Save as watch source
                            </button>
                            <button
                              onClick={resetToOriginal}
                              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
                            >
                              <X className="h-3.5 w-3.5" /> Discard
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={onDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-6 text-center transition-all ${
                            dragOver
                              ? 'border-primary-400 bg-primary-600/15'
                              : 'border-white/15 hover:border-primary-500/50 hover:bg-white/[0.03]'
                          }`}
                        >
                          <HardDrive className="h-8 w-8 text-primary-400" />
                          <p className="text-sm font-medium text-white/90">
                            Drop your video here or click to browse
                          </p>
                          <p className="text-[11px] text-dark-400">
                            Uploaded to Mixdrop and played instantly · up to 8GB
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*,.mkv,.avi,.mov"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(f);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* player */}
              <div className="relative overflow-hidden rounded-2xl bg-black ring-1 ring-white/5">
                <VideoPlayer
                  src={resolvedSrc}
                  title={playerLabel}
                  poster={media.backdropUrl || undefined}
                  initialProgress={savedProgress}
                  onProgress={handleProgress}
                />
              </div>
              </div>
            </div>
          </motion.div>

          {/* server + quality selector */}
          {!playerSrc && (serverGroups.length > 0 || activeGroupSources.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
              className="mt-5"
            >
              <div className="mx-auto flex max-w-fit flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 backdrop-blur-xl">
                {serverGroups.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="mr-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-sky-400">
                      <ServerIcon className="h-3.5 w-3.5" /> Server
                    </span>
                    {serverGroups.map(([name]) => (
                      <button
                        key={name}
                        onClick={() => {
                          setSelectedServer(name);
                          setSelectedQuality(null);
                        }}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                          activeGroup?.[0] === name
                            ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/30'
                            : 'bg-white/[0.04] text-dark-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}

                {serverGroups.length > 0 && activeGroupSources.length > 0 && (
                  <div className="hidden h-8 w-px bg-white/10 sm:block" />
                )}

                {activeGroupSources.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="mr-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-400">
                      <Clapperboard className="h-3.5 w-3.5" /> Quality
                    </span>
                    {activeGroupSources.map((s) => (
                      <button
                        key={`${s.label}-${s.url}`}
                        onClick={() => setSelectedQuality(s.label || null)}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                          activeSource === s
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                            : 'bg-white/[0.04] text-dark-300 ring-1 ring-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {s.label || 'Source'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {uploaded && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary-300/80"
            >
              <Clapperboard className="h-3.5 w-3.5" /> Watching uploaded video — fileref {uploaded.fileref}
            </motion.p>
          )}
        </div>
      </div>

      {/* Details & comments */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          {/* Title + meta */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{media.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-dark-300">
              {media.productionYear && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary-400" /> {media.productionYear}
                </span>
              )}
              {media.runtime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary-400" /> {media.runtime} min
                </span>
              )}
              {media.quality && (
                <span className="flex items-center gap-1.5">
                  <Clapperboard className="h-4 w-4 text-primary-400" /> {media.quality}
                </span>
              )}
              {media.imdbRating != null && (
                <span className="flex items-center gap-1.5 font-semibold text-yellow-400">
                  <Star className="h-4 w-4 fill-yellow-400" /> {Number(media.imdbRating).toFixed(1)}
                </span>
              )}
              {media.type === 'TV_SHOW' && media.numberOfSeasons != null && (
                <span>{media.numberOfSeasons} season{media.numberOfSeasons !== 1 ? 's' : ''}</span>
              )}
              {media.type === 'TV_SHOW' && media.numberOfEpisodes != null && (
                <span>{media.numberOfEpisodes} episode{media.numberOfEpisodes !== 1 ? 's' : ''}</span>
              )}
            </div>

            {media.overview && (
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-dark-200">{media.overview}</p>
            )}
          </div>

          {/* Episode selector */}
          {media.type === 'TV_SHOW' && media.seasons?.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
                <Clapperboard className="h-4 w-4 text-primary-400" /> Episodes
              </h2>
              <div className="max-w-2xl">
                <EpisodeSelector
                  seasons={media.seasons}
                  mediaId={media.id}
                  defaultSeason={currentSeasonNum}
                  onSelectEpisode={(epNum, snNum) => {
                    setPlayerSrc(null);
                    setUploaded(null);
                    navigate(`/watch/${media.id}?season=${snNum}&episode=${epNum}`, { replace: true });
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Comments */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
        <CommentsSection mediaId={media.id} />
      </div>
    </div>
  );
}
