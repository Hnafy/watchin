import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { playlistApi, mediaApi } from '../../services/api';
import { Media } from '../../types';
import {
  Film, Save, X, Trash2, Search, Plus, Check, Globe, Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

export function CreatePlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  const isEditing = !!playlistId;

  const { data: existingPlaylist } = useQuery({
    queryKey: ['playlist-edit', playlistId],
    queryFn: async () => {
      const res = await playlistApi.getById(playlistId!);
      return res.data.data;
    },
    enabled: isEditing,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['media-search', searchQuery],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: 1, limit: 10 };
      if (searchQuery) params.search = searchQuery;
      const res = await mediaApi.getList(params);
      return res.data;
    },
    enabled: !!searchQuery,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (existingPlaylist) {
      setTitle(existingPlaylist.title);
      setDescription(existingPlaylist.description || '');
      setVisibility(existingPlaylist.visibility);
      setSelectedMediaIds(existingPlaylist.items?.map((item: any) => item.mediaId._id || item.mediaId) || []);
    }
  }, [existingPlaylist]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        return playlistApi.update(playlistId!, { title, description, visibility, items: selectedMediaIds.map(id => ({ mediaId: id })) });
      } else {
        return playlistApi.create({ title, description, visibility });
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Playlist updated' : 'Playlist created');
      navigate(`/playlists/${playlistId || ''}`);
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to save playlist');
    },
  });

  const addMedia = (mediaId: string) => {
    if (!selectedMediaIds.includes(mediaId)) {
      setSelectedMediaIds([...selectedMediaIds, mediaId]);
    }
  };

  const removeMedia = (mediaId: string) => {
    setSelectedMediaIds(selectedMediaIds.filter(id => id !== mediaId));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (selectedMediaIds.length === 0 && !isEditing) {
      toast.error('Add at least one item to the playlist');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-24">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-white">
          {isEditing ? 'Edit Playlist' : 'Create New Playlist'}
        </h1>
        <button
          onClick={() => navigate('/playlists')}
          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter playlist title..."
              className="input w-full text-lg"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this playlist about?"
              className="input w-full resize-none"
              rows={3}
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-2">Visibility</label>
            <div className="flex gap-3">
              <button
                onClick={() => setVisibility('PUBLIC')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                  visibility === 'PUBLIC'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-dark-600 text-dark-400 hover:border-dark-500'
                }`}
              >
                <Globe className="h-4 w-4" /> Public
              </button>
              <button
                onClick={() => setVisibility('PRIVATE')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                  visibility === 'PRIVATE'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-dark-600 text-dark-400 hover:border-dark-500'
                }`}
              >
                <Lock className="h-4 w-4" /> Private
              </button>
            </div>
            <p className="text-xs text-dark-500 mt-2">
              {visibility === 'PUBLIC'
                ? 'Anyone can discover and follow this playlist.'
                : 'Only you can see this playlist.'}
            </p>
          </div>
        </div>

        {isEditing && selectedMediaIds.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Selected Items</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {selectedMediaIds.map((id) => (
                <div key={id} className="relative group">
                  <div className="aspect-[2/3] rounded-lg bg-dark-700 overflow-hidden">
                    <Film className="h-full w-full p-6 text-dark-400" />
                  </div>
                  <button
                    onClick={() => removeMedia(id)}
                    className="absolute top-1 right-1 rounded-full bg-red-500/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Add Media</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for movies or shows..."
                className="input pl-10"
              />
            </div>

            {searchQuery && (
              <div className="space-y-2">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-1.5 py-6">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-2.5 w-2.5 rounded-full bg-primary-500"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                ) : searchResults?.data.length === 0 ? (
                  <div className="text-center py-6 text-dark-400">No results found</div>
                ) : (
                  searchResults?.data.slice(0, 6).map((media: Media) => (
                    <div
                      key={media.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-dark-700 hover:bg-dark-800 transition-colors cursor-pointer"
                      onClick={() => addMedia(media.id)}
                    >
                      {media.posterUrl ? (
                        <img src={media.posterUrl} alt={media.title} className="h-12 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-12 w-8 rounded bg-dark-700 flex items-center justify-center">
                          <Film className="h-4 w-4 text-dark-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm text-white">{media.title}</p>
                        <p className="text-xs text-dark-500">{media.type.replace('_', ' ')}</p>
                      </div>
                      {!selectedMediaIds.includes(media.id) && (
                        <Plus className="h-4 w-4 text-primary-400" />
                      )}
                      {selectedMediaIds.includes(media.id) && (
                        <Check className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-dark-700">
          <button
            onClick={() => navigate('/playlists')}
            className="btn btn-glass"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saveMutation.isPending || !title.trim()}
            className="btn btn-primary"
          >
            {saveMutation.isPending ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditing ? 'Update Playlist' : 'Create Playlist'}
          </button>
        </div>
      </div>
    </div>
  );
}