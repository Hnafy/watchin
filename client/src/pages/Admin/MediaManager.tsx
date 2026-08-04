import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediaApi, adminApi } from '../../services/api';
import { Media } from '../../types';
import { Search, Edit, Trash2, Eye, Plus, Film } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export function AdminMediaManager() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'media-list', searchQuery, typeFilter],
    queryFn: () => {
      const params: Record<string, unknown> = { page: 1, limit: 50 };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.type = typeFilter;
      return mediaApi.getList(params);
    },
    select: (r) => r.data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteMedia(id),
    onSuccess: () => {
      toast.success('Media deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'media-list'] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  const items = data?.data || [];

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Media Manager</h1>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/admin/series/new')} variant="glass">
              <Plus className="h-4 w-4" /> Add Series
            </Button>
            <Button onClick={() => navigate('/admin/media/new')}>
              <Plus className="h-4 w-4" /> Add Media
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search media..." className="input pl-10" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-auto">
            <option value="">All Types</option>
            <option value="MOVIE">Movies</option>
            <option value="TV_SHOW">TV Shows</option>
          </select>
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700 bg-dark-950/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase">Views</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-dark-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-dark-500">
                      <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                      Loading media...
                    </div>
                  </td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center">
                    <Film className="h-12 w-12 mx-auto mb-3 text-dark-600" />
                    <p className="font-medium text-dark-500">No media found</p>
                    <p className="text-sm text-dark-400 mt-1">Try a different search or add new content.</p>
                  </td></tr>
                ) : items.map((m: Media) => (
                  <tr key={m.id} className="hover:bg-dark-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {m.posterUrl && <img src={m.posterUrl} alt="" className="h-10 w-7 rounded object-cover" />}
                        <span className="font-medium group-hover:text-primary-400 transition-colors">{m.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge variant={m.type === 'MOVIE' ? 'primary' : m.type === 'TV_SHOW' ? 'success' : 'default'}>{m.type === 'MOVIE' ? 'Movie' : m.type === 'TV_SHOW' ? 'Series' : 'Anime'}</Badge></td>
                    <td className="px-6 py-4"><Badge variant={m.status === 'RELEASED' ? 'success' : 'warning'}>{m.status}</Badge></td>
                    <td className="px-6 py-4 text-sm">{m.imdbRating?.toFixed(1) || '—'}</td>
                    <td className="px-6 py-4 text-sm">{m.viewCount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/media/${m.slug}`)} className="p-1.5 rounded hover:bg-dark-800 transition-all hover:scale-110" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => navigate(`/admin/media/${m.id}/edit`)} className="p-1.5 rounded hover:bg-primary-900/20 text-primary-600 transition-all hover:scale-110" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded hover:bg-red-900/20 text-red-500 transition-all hover:scale-110" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmModal
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          title="Delete Media"
          message="Are you sure you want to permanently delete this media? This action cannot be undone."
          confirmLabel="Delete"
          loading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}
