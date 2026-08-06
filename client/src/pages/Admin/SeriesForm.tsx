import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

interface EpisodeDraft {
  episodeNumber: number;
  title: string;
  watchUrl: string;
}

interface SeasonDraft {
  seasonNumber: number;
  name: string;
  episodes: EpisodeDraft[];
  expanded: boolean;
}

export function SeriesForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [seasons, setSeasons] = useState<SeasonDraft[]>([
    { seasonNumber: 1, name: '', episodes: [{ episodeNumber: 1, title: '', watchUrl: '' }], expanded: true },
  ]);

  const updateSeason = (si: number, field: keyof SeasonDraft, value: unknown) => {
    setSeasons((prev) => prev.map((s, i) => (i === si ? { ...s, [field]: value } : s)));
  };

  const addSeason = () => {
    setSeasons((prev) => [
      ...prev.map((s) => ({ ...s, expanded: false })),
      { seasonNumber: prev.length + 1, name: '', episodes: [{ episodeNumber: 1, title: '', watchUrl: '' }], expanded: true },
    ]);
  };

  const removeSeason = (si: number) => {
    setSeasons((prev) => prev.filter((_, i) => i !== si).map((s, i) => ({ ...s, seasonNumber: i + 1 })));
  };

  const addEpisode = (si: number) => {
    setSeasons((prev) =>
      prev.map((s, i) =>
        i === si
          ? { ...s, episodes: [...s.episodes, { episodeNumber: s.episodes.length + 1, title: '', watchUrl: '' }] }
          : s
      )
    );
  };

  const updateEpisode = (si: number, ei: number, field: keyof EpisodeDraft, value: string) => {
    setSeasons((prev) =>
      prev.map((s, i) =>
        i === si
          ? { ...s, episodes: s.episodes.map((ep, j) => (j === ei ? { ...ep, [field]: value } : ep)) }
          : s
      )
    );
  };

  const removeEpisode = (si: number, ei: number) => {
    setSeasons((prev) =>
      prev.map((s, i) =>
        i === si
          ? { ...s, episodes: s.episodes.filter((_, j) => j !== ei).map((ep, j) => ({ ...ep, episodeNumber: j + 1 })) }
          : s
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }

    setSaving(true);
    try {
      await adminApi.createSeries({
        title: title.trim(),
        description,
        posterUrl: posterUrl || undefined,
        seasons: seasons.map((s) => ({
          seasonNumber: s.seasonNumber,
          name: s.name || undefined,
          episodes: s.episodes.map((ep) => ({
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            watchUrl: ep.watchUrl || undefined,
          })),
        })),
      });
      toast.success('Series created');
      navigate('/admin/media');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create series');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">New Series</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metadata */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white/80">Series Info</h2>
            <div>
              <label className="label">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Stranger Things" className="input" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Series overview..." className="input" />
            </div>
            <div>
              <label className="label">Poster URL</label>
              <input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="https://..." className="input" />
            </div>
          </div>

          {/* Seasons */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white/80">Seasons & Episodes</h2>
              <button type="button" onClick={addSeason} className="btn-secondary text-sm">
                <Plus className="h-4 w-4" /> Add Season
              </button>
            </div>

            {seasons.map((season, si) => (
              <div key={si} className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-dark-800/80">
                  <div className="flex items-center gap-3 flex-1">
                    <button type="button" onClick={() => updateSeason(si, 'expanded', !season.expanded)} className="text-dark-400 hover:text-white transition-colors">
                      {season.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <span className="font-semibold text-sm text-white/70 min-w-[90px]">Season {season.seasonNumber}</span>
                    <input value={season.name} onChange={(e) => updateSeason(si, 'name', e.target.value)} placeholder="Season name (optional)" className="input flex-1 text-sm" />
                  </div>
                  <button type="button" onClick={() => removeSeason(si)} className="p-1.5 rounded hover:bg-red-900/20 text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {season.expanded && (
                  <div className="p-4 pt-2 space-y-2">
                    {season.episodes.map((ep, ei) => (
                      <div key={ei} className="flex items-center gap-2">
                        <span className="text-xs text-dark-400 w-6 text-center font-mono">{ep.episodeNumber}</span>
                        <input value={ep.title} onChange={(e) => updateEpisode(si, ei, 'title', e.target.value)} placeholder="Episode title" className="input flex-1 text-sm" />
                        <input value={ep.watchUrl} onChange={(e) => updateEpisode(si, ei, 'watchUrl', e.target.value)} placeholder="Video URL (optional)" className="input w-56 text-sm" />
                        <button type="button" onClick={() => removeEpisode(si, ei)} className="p-1.5 rounded hover:bg-red-900/20 text-red-500/70 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addEpisode(si)} className="btn-secondary text-xs mt-2">
                      <Plus className="h-3 w-3" /> Add Episode
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Create Series'}
            </button>
            <button type="button" onClick={() => navigate('/admin/media')} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}