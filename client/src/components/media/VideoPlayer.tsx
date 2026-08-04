import { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  initialProgress?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
  autoPlay?: boolean;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getSourceType(url: string): 'youtube' | 'hls' | 'video' | 'unknown' {
  if (getYouTubeId(url)) return 'youtube';
  if (/\.m3u8/i.test(url)) return 'hls';
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.startsWith('blob:')) return 'video';
  return 'unknown';
}

function loadHlsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Hls) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@0.14.17/dist/hls.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load HLS.js'));
    document.head.appendChild(script);
  });
}

export function VideoPlayer({
  src, poster, title, initialProgress = 0,
  onProgress, onEnded, onTimeUpdate,
  className = '', autoPlay = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgress, setSavedProgress] = useState(initialProgress);
  const [hasRestored, setHasRestored] = useState(false);
  const [isHlsReady, setIsHlsReady] = useState(false);
  const [hlsError, setHlsError] = useState(false);

  const sourceType = getSourceType(src);
  const youtubeId = sourceType === 'youtube' ? getYouTubeId(src) : null;

  // Initialise HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || sourceType !== 'hls') return;

    let cancelled = false;

    const initHls = async () => {
      try {
        await loadHlsScript();
        if (cancelled) return;
        const Hls = (window as any).Hls;
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!cancelled) {
              setIsHlsReady(true);
              if (autoPlay) video.play().catch(() => {});
            }
          });
          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) {
              setHlsError(true);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS (Safari)
          video.src = src;
          setIsHlsReady(true);
        } else {
          setHlsError(true);
        }
      } catch {
        if (!cancelled) setHlsError(true);
      }
    };

    initHls();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, sourceType, autoPlay]);

  // Resume prompt
  useEffect(() => {
    if (savedProgress > 60 && sourceType !== 'youtube') {
      setShowResumePrompt(true);
    }
  }, [savedProgress, sourceType]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 1) return;

    if (!hasRestored && savedProgress > 0 && video.currentTime === 0) {
      video.currentTime = savedProgress;
      setHasRestored(true);
      setShowResumePrompt(false);
    }

    if (onProgress) {
      onProgress(video.currentTime, video.duration || 0);
    }
    if (onTimeUpdate) {
      onTimeUpdate(video.currentTime);
    }
  }, [savedProgress, hasRestored, onProgress, onTimeUpdate]);

  const restoreProgress = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = savedProgress;
      video.play();
      setShowResumePrompt(false);
      setHasRestored(true);
    }
  };

  const restartFromBeginning = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play();
      setShowResumePrompt(false);
      setHasRestored(true);
    }
  };

  if (!src) {
    return (
      <div className={`aspect-video flex items-center justify-center bg-black text-dark-400 ${className}`}>
        <p className="text-sm">No video source available</p>
      </div>
    );
  }

  if (sourceType === 'youtube' && youtubeId) {
    return (
      <div className={`aspect-video bg-black ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${autoPlay ? 1 : 0}&rel=0`}
          title={title || 'Video'}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (sourceType === 'unknown') {
    return (
      <div className={`aspect-video flex flex-col items-center justify-center gap-4 bg-black text-white/60 ${className}`}>
        <p className="text-sm">Unsupported video format</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm"
        >
          Open Link
        </a>
      </div>
    );
  }

  return (
    <div className={`aspect-video bg-black relative ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        controls
        autoPlay={autoPlay && !showResumePrompt}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          if (!video) return;
          if (savedProgress > 0 && !hasRestored && video.currentTime === 0) {
            video.currentTime = savedProgress;
            setHasRestored(true);
            setShowResumePrompt(false);
          }
        }}
        onEnded={onEnded}
        playsInline
      >
        <source src={src} type={sourceType === 'hls' ? 'application/x-mpegURL' : 'video/mp4'} />
        Your browser does not support the video tag.
      </video>

      {/* HLS loading spinner */}
      {sourceType === 'hls' && !isHlsReady && !hlsError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60 text-xs">Loading stream...</p>
          </div>
        </div>
      )}

      {/* HLS error */}
      {hlsError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <p className="text-red-400 text-sm font-medium mb-2">Stream unavailable</p>
            <p className="text-white/40 text-xs">Try a different source or check the URL</p>
          </div>
        </div>
      )}

      {/* Resume prompt overlay */}
      {showResumePrompt && isHlsReady && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={restartFromBeginning}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-500 transition-all shadow-xl shadow-primary-600/30"
            >
              <RotateCcw className="h-5 w-5" /> Restart
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={restoreProgress}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-all"
            >
              <Play className="h-5 w-5 fill-current" /> Resume ({Math.floor(savedProgress / 60)}:{String(Math.floor(savedProgress % 60)).padStart(2, '0')})
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
