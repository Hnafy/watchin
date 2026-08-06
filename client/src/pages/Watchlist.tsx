import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi } from '../services/api';
import { MediaCard } from '../components/media/MediaCard';
import { Heart, Plus, X, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Media, WatchlistItem } from '../types';
import { useI18n } from '../i18n/LanguageProvider';
import { useAddToWatchlist, useRemoveFromWatchlist } from '../hooks/useMedia';
import toast from 'react-hot-toast';

export function Watchlist() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.getList(1, 50).then((r) => r.data),
    staleTime: 60_000,
  });

  const removeMutation = useMutation({
    mutationFn: (mediaId: string) => watchlistApi.remove(mediaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      toast.success(t('watchlist.removed'));
    },
    onError: () => toast.error('Failed to remove'),
  });

  const clearMutation = useMutation({
    mutationFn: () => watchlistApi.clearAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      toast.success(t('watchlist.cleared'));
    },
    onError: () => toast.error('Failed to clear watchlist'),
  });

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

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full"
      />
    </div>
  );

  const items = (data?.data || []) as WatchlistItem[];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-10 flex items-end justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary-500/20 to-primary-600/5 shadow-[0_8px_30px_rgba(124,58,237,0.2)]">
              <Heart className="h-6 w-6 text-primary-400 fill-primary-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-400">{t('watchlist.subtitle')}</p>
              <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-white">{t('watchlist.title')}</h1>
              {items.length > 0 && (
                <span className="mt-1 inline-block text-sm font-medium text-dark-400">
                  {items.length === 1 ? t('watchlist.savedTitle', { count: items.length }) : t('watchlist.savedTitles', { count: items.length })}
                </span>
              )}
            </div>
          </div>
          {items.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all items from your watchlist?')) {
                  clearMutation.mutate();
                }
              }}
              disabled={clearMutation.isPending}
              className="btn btn-glass flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:text-red-400 disabled:opacity-50"
            >
              {clearMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t('watchlist.clearAll')}
            </button>
          )}
          <div className="pointer-events-none absolute inset-x-0 -bottom-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </motion.div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="relative mb-8">
              <div className="pointer-events-none absolute -inset-6 rounded-full bg-primary-500/10 blur-2xl" />
              <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-b from-dark-800 to-dark-900 shadow-2xl">
                <Heart className="h-12 w-12 text-primary-500/60" />
              </div>
            </div>
            <p className="font-display text-3xl font-bold tracking-tight text-white">{t('watchlist.empty')}</p>
            <p className="mt-2 max-w-sm text-dark-400">{t('watchlist.emptySubtitle')}</p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary btn-shine mt-8 px-8 py-3.5 font-semibold"
            >
              <Plus className="h-5 w-5" /> {t('watchlist.browse')}
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative group/card"
              >
                <MediaCard media={item.media} index={i} fill onClick={() => navigate(`/media/${item.media.slug}`)} onPlay={() => handlePlay(item.media)} onAddToList={() => handleAddToList(item.media)} onLike={() => handleLike(item.media)} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMutation.mutate(item.mediaId);
                  }}
                  disabled={removeMutation.isPending}
                  className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/60 text-white/70 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover/card:opacity-100 transition-all disabled:opacity-30"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
