import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { playlistApi } from '../../services/api';
import { Playlist } from '../../types';
import {
  Heart, Bookmark, Share2, Send, Trash2, Plus, Film, User as UserIcon,
  Eye, Calendar, Lock, Globe, MoreHorizontal, Copy, ExternalLink, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return <img src={src} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-purple-600 text-xs font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function MediaCard({ media }: { media: any }) {
  return (
    <Link to={`/media/${media.slug}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-dark-700 bg-dark-800">
        {media.posterUrl ? (
          <img src={media.posterUrl} alt={media.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film className="h-8 w-8 text-dark-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-xs font-medium text-white line-clamp-1 group-hover:text-primary-300 transition-colors">
            {media.title}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function PlaylistPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { playlistId } = useParams<{ playlistId: string }>();
  const [showMenu, setShowMenu] = useState(false);

  const { data: playlist, isLoading } = useQuery<Playlist>({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      const res = await playlistApi.getById(playlistId!);
      return res.data.data as Playlist;
    },
    enabled: !!playlistId,
  });

  const likeMutation = useMutation({
    mutationFn: () => playlistApi.like(playlistId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlist', playlistId] });
      qc.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => playlistApi.save(playlistId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlist', playlistId] });
    },
  });

  const forkMutation = useMutation({
    mutationFn: () => playlistApi.fork(playlistId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists', 'mine'] });
      toast.success('Playlist forked! Open your library to view it.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => playlistApi.remove(playlistId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted');
      navigate('/playlists');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (mediaId: string) => playlistApi.removeItem(playlistId!, mediaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlist', playlistId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Playlist not found</h2>
        <p className="text-dark-400">This playlist may have been deleted or made private.</p>
      </div>
    );
  }

  const isOwner = user?.id === playlist.userId;
  const canEdit = isOwner;
  const isLiked = playlist.likes?.includes(user?.id || '') ?? false;
  const isSaved = playlist.saves?.includes(user?.id || '') ?? false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-24">
      <div className="flex gap-6 sm:gap-8 flex-col sm:flex-row">
        <div className="relative w-full max-w-xs sm:max-w-48 flex-shrink-0">
          {playlist.coverImage ? (
            <img src={playlist.coverImage} alt={playlist.title} className="w-full rounded-xl object-cover shadow-2xl" />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary-600/30 to-purple-600/20">
              <Film className="h-16 w-16 text-dark-400" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-white">{playlist.title}</h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-dark-400">
                <span className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" /> {playlist.user?.username || 'Unknown'}
                </span>
                <span className="w-1 h-1 rounded-full bg-dark-600" />
                <span className="flex items-center gap-1">
                  <Film className="h-4 w-4" /> {playlist.items?.length || 0} items
                </span>
                <span className="w-1 h-1 rounded-full bg-dark-600" />
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> {formatDistanceToNow(new Date(playlist.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {playlist.visibility === 'PUBLIC' ? (
                  <Globe className="h-4 w-4 text-green-400" />
                ) : (
                  <Lock className="h-4 w-4 text-dark-400" />
                )}
                <span className="text-xs text-dark-500">
                  {playlist.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                </span>
              </div>
            </div>

            {canEdit && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 rounded-xl border border-dark-700 bg-dark-800 shadow-xl"
                    >
                      <Link
                        to={`/playlists/${playlist.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark-300 hover:text-white hover:bg-dark-700 transition-colors first:rounded-t-xl"
                      >
                        <Share2 className="h-4 w-4" /> Edit
                      </Link>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this playlist?')) {
                            deleteMutation.mutate();
                          }
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {playlist.description && (
            <p className="mt-4 text-dark-300">{playlist.description}</p>
          )}

          <div className="mt-4 flex items-center gap-4">
            {isAuthenticated && (
              <button
                onClick={() => likeMutation.mutate()}
                disabled={likeMutation.isPending}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isLiked
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-white/5 text-dark-300 hover:bg-white/10'
                }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                {playlist.likeCount} {playlist.likeCount === 1 ? 'like' : 'likes'}
              </button>
            )}

            {playlist.visibility === 'PUBLIC' && isAuthenticated && (
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isSaved
                    ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                    : 'bg-white/5 text-dark-300 hover:bg-white/10'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-primary-500 text-primary-500' : ''}`} />
                {isSaved ? 'Saved' : 'Save to library'}
              </button>
            )}

            {playlist.visibility === 'PUBLIC' && isOwner && (
              <button
                onClick={() => forkMutation.mutate()}
                disabled={forkMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-dark-300 hover:bg-white/10 transition-all"
              >
                <Copy className="h-4 w-4" /> Fork
              </button>
            )}

            {playlist.forkCount > 0 && (
              <span className="text-sm text-dark-500">
                Forked {playlist.forkCount} {playlist.forkCount === 1 ? 'time' : 'times'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl font-bold text-white mb-4">Items</h2>
        {playlist.items?.length === 0 ? (
          <div className="py-12 text-center text-dark-400">
            <Film className="h-12 w-12 mx-auto mb-3 text-dark-600" />
            <p>This playlist is empty.</p>
            {canEdit && (
              <Link
                to="/media"
                className="mt-2 inline-flex items-center gap-1 text-primary-400 hover:text-primary-300"
              >
                <Plus className="h-4 w-4" /> Browse media to add
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {playlist.items?.map((item: any) => (
              <div key={item.id || item.mediaId} className="relative group">
                <MediaCard media={item.mediaId} />
                {canEdit && (
                  <button
                    onClick={() => removeItemMutation.mutate(item.mediaId.id || item.mediaId)}
                    className="absolute top-2 right-2 rounded-full bg-red-500/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from playlist"
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}