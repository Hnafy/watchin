import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchHistoryApi } from '../services/api';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Film, Trash2, X, Loader2, ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { formatRelativeTime } from '../utils/formatters';
import toast from 'react-hot-toast';

interface HistoryItem {
  id: string;
  mediaId: string;
  watchedAt: string;
  progress: number;
  completed: boolean;
  media: { slug: string; title: string; posterUrl?: string };
}

export function HistoryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['history', 'all', page],
    queryFn: () => watchHistoryApi.getHistory(page, pageSize).then((r) => r.data),
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (historyId: string) => watchHistoryApi.deleteItem(historyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['user', 'stats'] });
      toast.success('History item removed');
    },
    onError: () => toast.error('Failed to remove item'),
  });

  const clearMutation = useMutation({
    mutationFn: () => watchHistoryApi.clearAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['user', 'stats'] });
      toast.success('Watch history cleared');
    },
    onError: () => toast.error('Failed to clear history'),
  });

  const items = (data?.data || []) as HistoryItem[];
  const pagination = data?.pagination || { page: 1, total: 0, totalPages: 1 };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8 flex items-end justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary-500/20 to-primary-600/5">
              <HistoryIcon className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-400">Your activity</p>
              <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-white">Watch History</h1>
              <span className="mt-1 inline-block text-sm font-medium text-dark-400">
                {pagination.total} {pagination.total === 1 ? 'title' : 'titles'} watched
              </span>
            </div>
          </div>
          {items.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all of your watch history?')) clearMutation.mutate();
              }}
              disabled={clearMutation.isPending}
              className="btn btn-glass flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:text-red-400 disabled:opacity-50"
            >
              {clearMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear All
            </button>
          )}
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full"
            />
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="glass-card mb-6 flex h-20 w-20 items-center justify-center rounded-full">
              <PlayCircle className="h-10 w-10 text-dark-600" />
            </div>
            <p className="text-2xl font-bold">No watch history yet</p>
            <p className="mt-2 max-w-sm text-dark-400">Titles you watch will show up here so you can pick up where you left off.</p>
            <button onClick={() => navigate('/')} className="btn-primary mt-8 px-6 py-3">
              <PlayCircle className="h-5 w-5" /> Start Watching
            </button>
          </motion.div>
        ) : (
          <>
            <div className="divide-y divide-white/[0.04] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  className="group relative flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:px-6"
                  onClick={() => navigate(`/media/${item.media?.slug}`)}
                >
                  {item.media?.posterUrl ? (
                    <img src={item.media.posterUrl} alt="" className="h-14 w-10 flex-shrink-0 rounded-lg object-cover ring-1 ring-white/[0.06]" />
                  ) : (
                    <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                      <Film className="h-4 w-4 text-dark-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.media?.title || 'Unknown title'}</p>
                    <p className="text-sm text-dark-400">{formatRelativeTime(item.watchedAt)}</p>
                  </div>
                  {item.progress > 0 && item.progress < 99 && (
                    <div className="hidden w-24 sm:block">
                      <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400" style={{ width: `${item.progress}%` }} />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-dark-500">{Math.round(item.progress)}%</p>
                    </div>
                  )}
                  {item.completed && (
                    <span className="hidden rounded-full border border-green-500/25 bg-green-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-green-400 sm:block">
                      Completed
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(item.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="rounded-full p-2 text-dark-500 opacity-0 transition-all hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100 disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn btn-glass px-4 py-2 text-sm disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="text-sm font-medium text-dark-400">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="btn btn-glass px-4 py-2 text-sm disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
