import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistApi } from '../../services/api';
import { Playlist, PaginatedPlaylists } from '../../types';
import {
  Film, Search, Filter, Heart, Bookmark, Plus, Grid, List, Copy, Send, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type ViewMode = 'grid' | 'list';
type SortBy = 'trending' | 'latest' | 'mostLiked' | 'mostSaved';

export function PlaylistCard({ playlist, isList = false }: { playlist: Playlist; isList?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => playlistApi.like(playlist.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => playlistApi.save(playlist.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const isLiked = playlist.likes?.includes(user?.id || '') ?? false;
  const isSaved = playlist.saves?.includes(user?.id || '') ?? false;

  if (isList) {
    return (
      <div className="glass-card p-4 flex items-center gap-4 transition-all hover:bg-white/[0.03]">
        {playlist.coverImage ? (
          <img src={playlist.coverImage} alt={playlist.title} className="h-16 w-12 rounded object-cover" />
        ) : (
          <div className="h-16 w-12 rounded bg-dark-700 flex items-center justify-center">
            <Film className="h-6 w-6 text-dark-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{playlist.title}</h3>
          <p className="text-xs text-dark-500 mt-0.5">
            {playlist.items?.length || 0} items • {playlist.likeCount} likes • {playlist.saveCount} saves
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-dark-400">
          {isAuthenticated && (
            <button
              onClick={() => likeMutation.mutate()}
              className="p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          )}
          <Link to={`/playlists/${playlist.id}`} className="p-1.5 rounded-lg hover:bg-dark-800 transition-colors text-primary-400" title="View">
            <Send className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden rounded-xl transition-all hover:transform hover:scale-[1.02]"
    >
      <Link to={`/playlists/${playlist.id}`} className="block">
        {playlist.coverImage ? (
          <img src={playlist.coverImage} alt={playlist.title} className="w-full aspect-[2/3] object-cover" />
        ) : (
          <div className="w-full aspect-[2/3] flex items-center justify-center bg-gradient-to-br from-primary-600/20 to-purple-600/10">
            <Film className="h-12 w-12 text-dark-400" />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-lg text-white line-clamp-1">{playlist.title}</h3>
          <p className="mt-1 text-sm text-dark-400 line-clamp-2">{playlist.description}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-3.5 w-3.5 text-dark-500" />
              <span className="text-xs text-dark-500">{playlist.items?.length || 0}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-dark-500">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> {playlist.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <Bookmark className="h-3 w-3" /> {playlist.saveCount}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {isAuthenticated && (
        <div className="flex items-center justify-between p-4 pt-0">
          <button
            onClick={() => likeMutation.mutate()}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all ${
              isLiked
                ? 'bg-red-500/20 text-red-400'
                : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
          >
            <Heart className={`h-3 w-3 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            Like
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all ${
              isSaved
                ? 'bg-primary-500/20 text-primary-400'
                : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
          >
            <Bookmark className={`h-3 w-3 ${isSaved ? 'fill-primary-500 text-primary-500' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function PlaylistsListPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('trending');

  const { data: apiData, isLoading } = useQuery<PaginatedPlaylists>({
    queryKey: ['playlists', page, search, sortBy],
    queryFn: async () => {
      const res = await playlistApi.list(page, 20, search, sortBy);
      return res.data as PaginatedPlaylists;
    },
  });

  const { data: trendingData } = useQuery({
    queryKey: ['playlists-trending'],
    queryFn: async () => {
      const res = await playlistApi.trending(10);
      return res.data.data as import('../../types').Playlist[];
    },
  });

  const playlists = apiData?.data || [];
  const pagination = apiData?.pagination;

  return (
    <div className="mx-auto max-w-7xl px-4 py-24">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">Playlists</h1>
          <p className="mt-2 text-dark-400">Discover and share curated playlists from the community</p>
        </div>
        {isAuthenticated && (
          <Link
            to="/playlists/new"
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create Playlist
          </Link>
        )}
      </div>

      {trendingData && trendingData.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-xl font-semibold text-white">Trending Playlists</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {trendingData.slice(0, 5).map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search playlists..."
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="input w-auto text-sm"
          >
            <option value="trending">Trending</option>
            <option value="latest">Latest</option>
            <option value="mostLiked">Most Liked</option>
            <option value="mostSaved">Most Saved</option>
          </select>
          <div className="flex border border-dark-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-dark-400'}`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-dark-400'}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-3'}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={viewMode === 'grid' ? 'aspect-[2/3] rounded-xl bg-dark-700/50 animate-pulse' : 'glass-card p-4 animate-pulse'} />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="py-16 text-center text-dark-400">
          <Film className="h-16 w-16 mx-auto mb-4 text-dark-600" />
          <h3 className="font-medium text-lg text-white mb-2">No playlists found</h3>
          <p>Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-3'}>
          <AnimatePresence>
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} isList={viewMode === 'list'} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm text-dark-400">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="px-4 py-2 rounded-lg hover:bg-dark-800 disabled:opacity-30 transition-all"
          >
            Previous
          </button>
          <span>Page {page} of {pagination.totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages || isLoading}
            className="px-4 py-2 rounded-lg hover:bg-dark-800 disabled:opacity-30 transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}