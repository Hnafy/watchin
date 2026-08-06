import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tmdbApi } from '../../services/api';
import { Search, Film, Monitor, Loader2, AlertCircle, CheckCircle, Star, ArrowLeft } from 'lucide-react';

interface TMDBResult {
  tmdbId: number;
  type: 'MOVIE' | 'TV_SHOW';
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  genreIds: number[];
}

export default function TMDBSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const res = await tmdbApi.search(query, typeFilter === 'all' ? undefined : typeFilter);
        setResults(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err: any) {
        const message = err?.response?.data?.message;
        setError(
          message ||
            (err?.response?.status === 401
              ? 'Invalid or missing TMDB API key. Add TMDB_API_KEY to server/.env.'
              : 'Search failed. Please try again.'),
        );
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, typeFilter]);

  const handleImport = async (tmdbId: number, type: string) => {
    setImporting(tmdbId);
    setError('');
    setSuccess('');
    try {
      const res = await tmdbApi.importMedia(tmdbId, type);
      const media = res.data?.data;
      if (!media) {
        setError('Import failed: no media returned.');
        return;
      }
      setSuccess(`"${media.title}" imported successfully!`);
      setTimeout(() => navigate(`/admin/media/${media.id}/edit`), 1500);
    } catch (err: any) {
      setError(String(err?.response?.data?.message || 'Import failed'));
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="group mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-xl transition-all hover:-translate-x-0.5 hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" /> Back
          </button>
          <h1 className="text-2xl font-bold text-white">Import from TMDB</h1>
          <p className="mt-1 text-sm text-dark-400">Search movies and TV shows from The Movie Database and import them into your library.</p>
        </div>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search TMDB..."
              className="w-full rounded-lg bg-dark-800 border border-dark-700 pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex rounded-lg border border-dark-700 overflow-hidden">
            {(['all', 'movie', 'tv'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-800 text-dark-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'All' : t === 'movie' ? 'Movies' : 'TV Shows'}
              </button>
            ))}
          </div>
        </div>

        {/* Status messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-900/20 border border-red-800/30 px-4 py-3 text-red-300 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-900/20 border border-green-800/30 px-4 py-3 text-green-300 text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Loading (only when nothing to show yet) */}
        {loading && results.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        )}

        {loading && results.length > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-dark-400">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
            Updating results...
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((item) => (
              <div
                key={`${item.type}-${item.tmdbId}`}
                className="group flex gap-4 rounded-xl border border-white/[0.08] bg-dark-900/70 p-4 shadow-card transition-all hover:border-white/[0.16] hover:-translate-y-0.5"
              >
                <div className="flex-shrink-0 w-20">
                  {item.posterPath ? (
                    <img
                      src={item.posterPath}
                      alt={item.title}
                      loading="lazy"
                      className="w-full rounded-lg object-cover aspect-[2/3]"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-lg bg-dark-800 flex items-center justify-center">
                      {item.type === 'MOVIE' ? <Film className="h-6 w-6 text-dark-500" /> : <Monitor className="h-6 w-6 text-dark-500" />}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold truncate group-hover:text-primary-400 transition-colors">{item.title}</h3>
                      {item.originalTitle && item.originalTitle !== item.title && (
                        <p className="text-xs text-dark-500 truncate">{item.originalTitle}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded ${
                      item.type === 'MOVIE' ? 'bg-primary-900/30 text-primary-300' : 'bg-green-900/30 text-green-300'
                    }`}>
                      {item.type === 'MOVIE' ? 'Movie' : 'TV'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-dark-400">
                    {item.releaseDate && <span>{item.releaseDate.slice(0, 4)}</span>}
                    {item.voteAverage > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {item.voteAverage.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {item.overview && (
                    <p className="mt-2 text-xs text-dark-500 line-clamp-2">{item.overview}</p>
                  )}

                  <button
                    onClick={() => handleImport(item.tmdbId, item.type)}
                    disabled={importing === item.tmdbId}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    {importing === item.tmdbId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    {importing === item.tmdbId ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="text-center py-16 text-dark-500">
            <Film className="mx-auto h-12 w-12 mb-3" />
            <p>No results found for "{query}"</p>
          </div>
        )}

        {query.length < 2 && (
          <div className="text-center py-16 text-dark-500">
            <Search className="mx-auto h-12 w-12 mb-3" />
            <p>Type at least 2 characters to search TMDB</p>
          </div>
        )}
      </div>
    </div>
  );
}
