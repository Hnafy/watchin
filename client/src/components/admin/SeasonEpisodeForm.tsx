import { Film, Plus, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

export interface EpisodeDraft {
  episodeNumber: number;
  title: string;
  watchUrl: string;
}

export interface SeasonDraft {
  seasonNumber: number;
  name: string;
  episodes: EpisodeDraft[];
  expanded?: boolean;
}

interface Props {
  seasons: SeasonDraft[];
  onChange: (seasons: SeasonDraft[]) => void;
}

function renumber(seasons: SeasonDraft[]): SeasonDraft[] {
  return seasons.map((s, si) => ({
    ...s,
    seasonNumber: si + 1,
    episodes: s.episodes.map((ep, ei) => ({ ...ep, episodeNumber: ei + 1 })),
  }));
}

export function SeasonEpisodeForm({ seasons, onChange }: Props) {
  const addSeason = () => {
    onChange(renumber([
      ...seasons.map((s) => ({ ...s, expanded: false })),
      { seasonNumber: seasons.length + 1, name: '', episodes: [{ episodeNumber: 1, title: '', watchUrl: '' }], expanded: true },
    ]));
  };

  const removeSeason = (si: number) => {
    onChange(renumber(seasons.filter((_, i) => i !== si)));
  };

  const toggleSeason = (si: number) => {
    onChange(seasons.map((s, i) => i === si ? { ...s, expanded: !s.expanded } : s));
  };

  const updateSeasonField = (si: number, field: 'name', value: string) => {
    onChange(seasons.map((s, i) => i === si ? { ...s, [field]: value } : s));
  };

  const addEpisode = (si: number) => {
    onChange(renumber(seasons.map((s, i) => {
      if (i !== si) return s;
      return { ...s, episodes: [...s.episodes, { episodeNumber: s.episodes.length + 1, title: '', watchUrl: '' }] };
    })));
  };

  const updateEpisodeField = (si: number, ei: number, field: 'title' | 'watchUrl', value: string) => {
    onChange(seasons.map((s, i) => {
      if (i !== si) return s;
      return { ...s, episodes: s.episodes.map((ep, j) => j === ei ? { ...ep, [field]: value } : ep) };
    }));
  };

  const removeEpisode = (si: number, ei: number) => {
    onChange(renumber(seasons.map((s, i) => {
      if (i !== si) return s;
      return { ...s, episodes: s.episodes.filter((_, j) => j !== ei) };
    })));
  };

  return (
    <div className="card p-6 space-y-6 glass">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Film className="h-5 w-5" /> Seasons & Episodes
        </h2>
        <button type="button" onClick={addSeason}
          className="btn-primary text-sm px-3 py-1.5 rounded-lg flex items-center gap-1">
          <Plus className="h-4 w-4" /> Add Season
        </button>
      </div>

      {seasons.length === 0 && (
        <p className="text-dark-400 text-sm">No seasons added yet.</p>
      )}

      {seasons.map((season, si) => (
        <div key={si} className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
          {/* Season header */}
          <div className="flex items-center justify-between p-4 bg-dark-800/80">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button type="button" onClick={() => toggleSeason(si)}
                className="text-dark-400 hover:text-white transition-colors shrink-0">
                {season.expanded ?? true ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <span className="font-semibold text-sm text-primary-300 min-w-[80px] shrink-0">
                S{season.seasonNumber}
              </span>
              <input
                value={season.name}
                onChange={(e) => updateSeasonField(si, 'name', e.target.value)}
                placeholder="Season name (optional)"
                className="flex-1 bg-dark-700 text-sm rounded px-2 py-1 text-dark-100 min-w-0"
              />
            </div>
            <button type="button" onClick={() => removeSeason(si)}
              className="p-1.5 rounded hover:bg-red-900/20 text-red-500 transition-colors shrink-0 ml-2">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Episode list */}
          {(season.expanded ?? true) && (
            <div className="p-4 pt-2 space-y-2">
              {season.episodes.map((ep, ei) => (
                <div key={ei} className="flex items-center gap-2 bg-dark-800 rounded-lg p-2">
                  <span className="text-xs text-dark-400 w-8 text-center font-mono shrink-0">
                    {ep.episodeNumber}
                  </span>
                  <input
                    value={ep.title}
                    onChange={(e) => updateEpisodeField(si, ei, 'title', e.target.value)}
                    placeholder="Episode title"
                    className="flex-1 bg-dark-700 text-sm rounded px-2 py-1 text-dark-100 min-w-0"
                  />
                  <input
                    value={ep.watchUrl}
                    onChange={(e) => updateEpisodeField(si, ei, 'watchUrl', e.target.value)}
                    placeholder="Video URL"
                    className="w-36 lg:w-56 bg-dark-700 text-sm rounded px-2 py-1 text-dark-100 hidden sm:block"
                  />
                  <button type="button" onClick={() => removeEpisode(si, ei)}
                    className="p-1 rounded hover:bg-red-900/20 text-red-500/70 hover:text-red-500 transition-colors shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addEpisode(si)}
                className="btn-secondary text-xs mt-2 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add Episode
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
