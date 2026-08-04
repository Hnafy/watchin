import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi, mediaApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Media, Person } from '../../types';
import toast from 'react-hot-toast';
import { StarRating } from '../../components/ui/StarRating';
import { SeasonEpisodeForm, SeasonDraft } from '../../components/admin/SeasonEpisodeForm';
import {
  ArrowLeft, Save, Film, Tag, Star, Users, Loader2, X, Plus, Search,
  Link as LinkIcon, Image as ImageIcon, Wand2, Calendar, Play, LayoutGrid, Check,
} from 'lucide-react';

interface MediaFormData {
  title: string;
  originalTitle: string;
  overview: string;
  shortDescription: string;
  type: 'MOVIE' | 'TV_SHOW' | 'ANIME';
  releaseDate: string;
  firstAirDate: string;
  productionYear: string;
  runtime: string;
  numberOfSeasons: string;
  numberOfEpisodes: string;
  imdbRating: string;
  quality: string;
  posterUrl: string;
  backdropUrl: string;
  logoUrl: string;
  trailerUrl: string;
  watchUrl: string;
  genres: string[];
  keywords: string[];
  countries: string[];
  languages: string[];
  seasons: SeasonDraft[];
  cast: Array<{ personId: string; name: string; character: string }>;
  directors: Array<{ personId: string; name: string }>;
  featured: boolean;
  isTrending: boolean;
  hidden: boolean;
}

const defaultForm: MediaFormData = {
  title: '', originalTitle: '', overview: '', shortDescription: '',
  type: 'MOVIE', releaseDate: '', firstAirDate: '', productionYear: '',
  runtime: '', numberOfSeasons: '', numberOfEpisodes: '',
  imdbRating: '', quality: '',
  posterUrl: '', backdropUrl: '', logoUrl: '', trailerUrl: '', watchUrl: '',
  genres: [], keywords: [], countries: [], languages: [],
  seasons: [], cast: [], directors: [], featured: false, isTrending: false, hidden: false,
};

const TYPE_OPTIONS = [
  { value: 'MOVIE' as const, label: 'Movie', icon: Film },
  { value: 'TV_SHOW' as const, label: 'Series', icon: Play },
  { value: 'ANIME' as const, label: 'Anime', icon: Wand2 },
];

const QUALITY_OPTIONS = ['HD', 'FHD', 'BluRay', 'WEB-DL', '4K'];

const URL_FIELDS: { key: keyof MediaFormData; label: string; placeholder: string; errorKey?: string }[] = [
  { key: 'posterUrl', label: 'Poster URL', placeholder: 'https://...', errorKey: 'posterUrl' },
  { key: 'backdropUrl', label: 'Backdrop URL', placeholder: 'https://...', errorKey: 'backdropUrl' },
  { key: 'logoUrl', label: 'Logo URL', placeholder: 'https://...' },
  { key: 'trailerUrl', label: 'Trailer URL', placeholder: 'https://youtube.com/...' },
  { key: 'watchUrl', label: 'Watch URL', placeholder: 'https://...' },
];

function extractPersonId(input: string): string | null {
  return input.match(/^[a-z0-9]{25,}$/i)?.[0] || null;
}

function FieldLabel({ icon: Icon, children }: { icon?: typeof Film; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-dark-300 mb-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-primary-500" />}
      {children}
    </label>
  );
}

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export function AdminMediaForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<MediaFormData>({ ...defaultForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [castSearch, setCastSearch] = useState('');
  const [directorSearch, setDirectorSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [imgBroken, setImgBroken] = useState<Record<string, boolean>>({});

  const { data: existingMedia, isLoading: loadingExisting } = useQuery({
    queryKey: ['admin', 'media-edit', id],
    queryFn: async () => {
      if (!id) return null;
      const r = await adminApi.getMediaForEdit(id);
      return r.data.data as Media;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingMedia) {
      setForm({
        title: existingMedia.title || '',
        originalTitle: existingMedia.originalTitle || '',
        overview: existingMedia.overview || '',
        shortDescription: existingMedia.shortDescription || '',
        type: existingMedia.type || 'MOVIE',
        releaseDate: existingMedia.releaseDate?.split('T')[0] || '',
        firstAirDate: existingMedia.firstAirDate?.split('T')[0] || '',
        productionYear: existingMedia.productionYear?.toString() || '',
        runtime: existingMedia.runtime?.toString() || '',
        numberOfSeasons: existingMedia.numberOfSeasons?.toString() || '',
        numberOfEpisodes: existingMedia.numberOfEpisodes?.toString() || '',
        imdbRating: existingMedia.imdbRating?.toString() || '',
        quality: existingMedia.quality || '',
        posterUrl: existingMedia.posterUrl || '',
        backdropUrl: existingMedia.backdropUrl || '',
        logoUrl: existingMedia.logoUrl || '',
        trailerUrl: existingMedia.trailerUrl || '',
        watchUrl: existingMedia.watchUrl || '',
        genres: existingMedia.genres.map(g => g.name),
        keywords: existingMedia.keywords?.map(k => k.name) || [],
        countries: existingMedia.countries.map(c => c.code),
        languages: existingMedia.languages.map(l => l.code),
        seasons: (existingMedia as any).seasons?.map((s: any) => ({
          seasonNumber: s.seasonNumber,
          name: s.name || '',
          episodes: (s.episodes || []).map((ep: any) => ({
            episodeNumber: ep.episodeNumber,
            title: ep.name,
            watchUrl: ep.watchUrl || '',
          })),
        })) || [],
        cast: existingMedia.cast?.map(c => ({ personId: c.person.id, name: c.person.name, character: c.character || '' })) || [],
        directors: existingMedia.directors?.map(d => ({ personId: d.person.id, name: d.person.name })) || [],
        featured: existingMedia.featured || false,
        isTrending: existingMedia.isTrending || false,
        hidden: existingMedia.hidden || false,
      });
    }
  }, [existingMedia]);

  const update = useCallback((key: keyof MediaFormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, [errors]);

  const handleChange = useCallback((key: keyof MediaFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(key, e.target.value), [update]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.type) e.type = 'Type is required';
    if (form.imdbRating && (isNaN(Number(form.imdbRating)) || Number(form.imdbRating) < 0 || Number(form.imdbRating) > 10))
      e.imdbRating = 'Must be 0-10';
    if (form.posterUrl && !form.posterUrl.startsWith('http')) e.posterUrl = 'Must be a valid URL';
    if (form.backdropUrl && !form.backdropUrl.startsWith('http')) e.backdropUrl = 'Must be a valid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: MediaFormData) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        originalTitle: data.originalTitle || null,
        overview: data.overview || null,
        shortDescription: data.shortDescription || null,
        type: data.type,
        releaseDate: data.releaseDate || null,
        firstAirDate: data.firstAirDate || null,
        productionYear: data.productionYear ? Number(data.productionYear) : null,
        runtime: data.runtime ? Number(data.runtime) : null,
        numberOfSeasons: data.numberOfSeasons ? Number(data.numberOfSeasons) : null,
        numberOfEpisodes: data.numberOfEpisodes ? Number(data.numberOfEpisodes) : null,
        imdbRating: data.imdbRating ? Number(data.imdbRating) : null,
        quality: data.quality || null,
        posterUrl: data.posterUrl || null,
        backdropUrl: data.backdropUrl || null,
        logoUrl: data.logoUrl || null,
        trailerUrl: data.trailerUrl || null,
        watchUrl: data.watchUrl || null,
        genres: data.genres,
        keywords: data.keywords,
        countries: data.countries,
        languages: data.languages,
        seasons: data.type === 'TV_SHOW' ? data.seasons : undefined,
        featured: data.featured,
        isTrending: data.isTrending,
        hidden: data.hidden,
      };
      if (isEdit) {
        await adminApi.updateMediaRecord(id!, payload);
      } else {
        payload.cast = data.cast.map(c => ({ personId: c.personId, character: c.character, order: 0 }));
        payload.directors = data.directors.map(d => ({ personId: d.personId, order: 0 }));
        await adminApi.createMedia(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Media updated' : 'Media submitted for review');
      qc.invalidateQueries({ queryKey: ['admin'] });
      navigate('/admin');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Save failed'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) saveMutation.mutate(form);
  };

  const addArrayItem = (key: 'genres' | 'keywords' | 'countries' | 'languages', value: string) => {
    if (!value.trim()) return;
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(value.trim()) ? prev[key] : [...prev[key], value.trim()],
    }));
  };

  const removeArrayItem = (key: 'genres' | 'keywords' | 'countries' | 'languages', value: string) => {
    setForm(prev => ({ ...prev, [key]: prev[key].filter(v => v !== value) }));
  };

  const searchPersonFn = async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await mediaApi.searchPeople(q);
      setSearchResults(res.data.data?.map((p: any) => ({ id: p.id, name: p.name })) || []);
    } catch { setSearchResults([]); }
  };

  useEffect(() => {
    const t = setTimeout(() => searchPersonFn(castSearch || directorSearch), 300);
    return () => clearTimeout(t);
  }, [castSearch, directorSearch]);

  const addCast = (person: Person) => {
    if (!form.cast.some(c => c.personId === person.id)) {
      update('cast', [...form.cast, { personId: person.id, name: person.name, character: '' }]);
    }
    setCastSearch('');
    setSearchResults([]);
  };

  const addDirector = (person: Person) => {
    if (!form.directors.some(d => d.personId === person.id)) {
      update('directors', [...form.directors, { personId: person.id, name: person.name }]);
    }
    setDirectorSearch('');
    setSearchResults([]);
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const previewPosterOk = form.posterUrl && form.posterUrl.startsWith('http') && !imgBroken.poster;
  const previewBackdropOk = form.backdropUrl && form.backdropUrl.startsWith('http') && !imgBroken.backdrop;
  const completedSections = [
    !!form.title.trim(),
    !!form.overview.trim(),
    !!form.posterUrl,
    form.genres.length > 0,
    !!form.productionYear,
  ].filter(Boolean).length;
  const progressPct = Math.round((completedSections / 5) * 100);

  const tagInput = (key: 'genres' | 'keywords' | 'countries' | 'languages', placeholder: string, hint: string) => (
    <div>
      <FieldLabel>{placeholder.split(' ')[0]}s</FieldLabel>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {form[key].map(item => (
          <AnimatePresence key={item}>
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-600/15 text-primary-300 text-xs font-medium ring-1 ring-primary-600/30"
            >
              {item}
              <button type="button" onClick={() => removeArrayItem(key, item)} className="hover:text-white transition-colors">
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          </AnimatePresence>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text" placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-md bg-dark-800 border border-dark-600 text-sm text-dark-200 placeholder:text-dark-500 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addArrayItem(key, (e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
        />
      </div>
      <p className="text-[11px] text-dark-500 mt-1">{hint}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 pb-28">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/admin')}
            className="p-2.5 rounded-lg bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div>
            <div className="flex items-center gap-2 text-sm text-dark-400">
              <span>Admin</span><span>/</span>
              <span className="text-dark-300">{isEdit ? 'Edit' : 'Add'} Media</span>
            </div>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-500/20 bg-primary-600/15 text-primary-400">
                <LayoutGrid className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold text-white">
                {isEdit ? 'Edit Media' : 'Add New Media'}
              </h1>
            </div>
          </div>
          <div className="flex-1" />
          {/* Completion */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-dark-400">
            <span>Completion</span>
            <div className="w-24 h-1.5 rounded-full bg-dark-800 overflow-hidden">
              <motion.div className="h-full bg-primary-600 rounded-full" animate={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-primary-400 font-semibold">{progressPct}%</span>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:space-y-0">
          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            initial="hidden" animate="show"
            className="space-y-6"
          >
            {/* ===================== BASIC INFORMATION ===================== */}
            <motion.section variants={sectionVariants} className="glass rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold flex items-center gap-2.5 text-white">
                <span className="w-7 h-7 rounded-lg bg-primary-600/15 flex items-center justify-center">
                  <Film className="h-4 w-4 text-primary-500" />
                </span>
                Basic Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel icon={Film}>Title *</FieldLabel>
                  <Input value={form.title} onChange={handleChange('title')} error={errors.title} placeholder="e.g. Interstellar" required />
                </div>
                <div>
                  <FieldLabel>Original Title</FieldLabel>
                  <Input value={form.originalTitle} onChange={handleChange('originalTitle')} placeholder="e.g. Interstellar" />
                </div>
              </div>
              <div>
                <FieldLabel icon={ImageIcon}>Description</FieldLabel>
                <Textarea value={form.overview} onChange={handleChange('overview')} rows={3} placeholder="A short synopsis of the title..." />
              </div>
              <div>
                <FieldLabel>Short Description</FieldLabel>
                <Textarea value={form.shortDescription} onChange={handleChange('shortDescription')} rows={2} placeholder="One-liner for cards" />
              </div>

              {/* URL fields */}
              <div className="space-y-3.5 pt-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-dark-500 flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" /> Media Links
                </p>
                {URL_FIELDS.map(f => (
                  <div key={f.key}>
                    <FieldLabel icon={LinkIcon}>{f.label}</FieldLabel>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                      <input
                        type="url"
                        value={form[f.key] as string}
                        onChange={handleChange(f.key)}
                        placeholder={f.placeholder}
                        className={`w-full rounded-md border bg-dark-800 pl-9 pr-3 py-2.5 text-sm text-dark-50 placeholder:text-dark-500 focus:outline-none focus:ring-1 transition-all ${
                          f.errorKey && errors[f.errorKey]
                            ? 'border-red-500 focus:ring-red-500/30'
                            : 'border-dark-600 focus:border-primary-500/60 focus:ring-primary-500/20'
                        }`}
                      />
                    </div>
                    {f.errorKey && errors[f.errorKey] && <p className="mt-1 text-xs text-red-400">{errors[f.errorKey]}</p>}
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ===================== CLASSIFICATION ===================== */}
            <motion.section variants={sectionVariants} className="glass rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold flex items-center gap-2.5 text-white">
                <span className="w-7 h-7 rounded-lg bg-primary-600/15 flex items-center justify-center">
                  <Tag className="h-4 w-4 text-primary-500" />
                </span>
                Classification
              </h2>
              <div>
                <FieldLabel icon={Film}>Type</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map(opt => (
                    <motion.button
                      key={opt.value} type="button" whileTap={{ scale: 0.95 }}
                      onClick={() => update('type', opt.value)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        form.type === opt.value
                          ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/25'
                          : 'bg-dark-800 text-dark-300 border-dark-600 hover:border-dark-500 hover:text-white'
                      }`}
                    >
                      <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                    </motion.button>
                  ))}
                </div>
                {errors.type && <p className="text-red-400 text-xs mt-1">{errors.type}</p>}
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel icon={Calendar}>Release Year</FieldLabel>
                  <Input type="number" value={form.productionYear} onChange={handleChange('productionYear')} placeholder="2024" />
                </div>
                <div>
                  <FieldLabel>Release Date</FieldLabel>
                  <Input type="date" value={form.releaseDate} onChange={handleChange('releaseDate')} />
                </div>
                <div>
                  <FieldLabel>First Air Date</FieldLabel>
                  <Input type="date" value={form.firstAirDate} onChange={handleChange('firstAirDate')} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {tagInput('genres', 'Add genre', 'e.g. action, drama, sci-fi')}
                {tagInput('countries', 'Add country code', 'e.g. us, gb, jp')}
              </div>
              {tagInput('languages', 'Add language code', 'e.g. en, ar, fr')}
            </motion.section>

            {/* ===================== MEDIA INFORMATION ===================== */}
            <motion.section variants={sectionVariants} className="glass rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold flex items-center gap-2.5 text-white">
                <span className="w-7 h-7 rounded-lg bg-primary-600/15 flex items-center justify-center">
                  <Star className="h-4 w-4 text-primary-500" />
                </span>
                Media Information
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel>Runtime (min)</FieldLabel>
                  <Input type="number" value={form.runtime} onChange={handleChange('runtime')} placeholder="148" />
                </div>
                <div>
                  <FieldLabel>Seasons</FieldLabel>
                  <Input type="number" value={form.numberOfSeasons} onChange={handleChange('numberOfSeasons')} placeholder="1" />
                </div>
                <div>
                  <FieldLabel>Episodes</FieldLabel>
                  <Input type="number" value={form.numberOfEpisodes} onChange={handleChange('numberOfEpisodes')} placeholder="12" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Quality</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {QUALITY_OPTIONS.map(opt => (
                      <motion.button
                        key={opt} type="button" whileTap={{ scale: 0.95 }}
                        onClick={() => update('quality', form.quality === opt ? '' : opt)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                          form.quality === opt
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-dark-800 text-dark-300 border-dark-600 hover:border-dark-500 hover:text-white'
                        }`}
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel icon={Star}>IMDb Rating</FieldLabel>
                  <div className="bg-dark-800 border border-dark-600 rounded-md px-3 py-2">
                    <StarRating value={Number(form.imdbRating) || 0} onChange={v => update('imdbRating', v.toString())} maxRating={10} size="md" />
                  </div>
                  {errors.imdbRating && <p className="text-red-400 text-xs mt-1">{errors.imdbRating}</p>}
                </div>
              </div>
            </motion.section>

            {/* ===================== SEASONS ===================== */}
            {form.type === 'TV_SHOW' && (
              <motion.section variants={sectionVariants}>
                <SeasonEpisodeForm seasons={form.seasons} onChange={(seasons) => update('seasons', seasons)} />
              </motion.section>
            )}

            {/* ===================== PEOPLE ===================== */}
            <motion.section variants={sectionVariants} className="glass rounded-xl p-6 space-y-6">
              <h2 className="text-base font-semibold flex items-center gap-2.5 text-white">
                <span className="w-7 h-7 rounded-lg bg-primary-600/15 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary-500" />
                </span>
                People
              </h2>

              {/* Cast */}
              <div>
                <FieldLabel>Cast</FieldLabel>
                <div className="space-y-2 mb-2">
                  {form.cast.map((c, i) => (
                    <motion.div key={`${c.personId}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 bg-dark-800/60 rounded-lg border border-dark-700 px-3 py-2">
                      <div className="w-7 h-7 rounded-md bg-primary-600/15 flex items-center justify-center text-primary-400 text-xs font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-white font-medium min-w-[100px] truncate">{c.name}</span>
                      <input
                        type="text" value={c.character} onChange={e => {
                          const n = [...form.cast];
                          n[i] = { ...n[i], character: e.target.value };
                          update('cast', n);
                        }}
                        placeholder="Character"
                        className="flex-1 px-3 py-1 rounded-md bg-dark-800 border border-dark-600 text-xs text-dark-200 placeholder:text-dark-500 focus:outline-none focus:border-primary-500/50 min-w-0"
                      />
                      <button type="button" onClick={() => update('cast', form.cast.filter((_, j) => j !== i))}
                        className="p-1 rounded text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
                <PersonSearchInput
                  value={castSearch} onChange={setCastSearch} results={searchResults}
                  placeholder="Search person to add to cast..."
                  onPick={addCast}
                />
              </div>

              {/* Directors */}
              <div>
                <FieldLabel>Directors</FieldLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.directors.map((d, i) => (
                    <motion.span key={`${d.personId}-${i}`} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-dark-800 border border-dark-700 text-sm text-white">
                      <span className="text-primary-400">•</span> {d.name}
                      <button type="button" onClick={() => update('directors', form.directors.filter((_, j) => j !== i))}
                        className="text-dark-500 hover:text-red-400 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.span>
                  ))}
                </div>
                <PersonSearchInput
                  value={directorSearch} onChange={setDirectorSearch} results={searchResults}
                  placeholder="Search person to add as director..."
                  onPick={addDirector}
                />
              </div>
            </motion.section>

            {/* ===================== ADDITIONAL ===================== */}
            <motion.section variants={sectionVariants} className="glass rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold flex items-center gap-2.5 text-white">
                <span className="w-7 h-7 rounded-lg bg-primary-600/15 flex items-center justify-center">
                  <Tag className="h-4 w-4 text-primary-500" />
                </span>
                Additional
              </h2>
              {tagInput('keywords', 'Add keyword', 'e.g. time-travel, heist')}
              <div className="flex flex-wrap gap-4 pt-1">
                {[
                  ['featured', 'Featured'] as const,
                  ['isTrending', 'Trending'] as const,
                  ['hidden', 'Hidden'] as const,
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={(form as any)[key]} onChange={e => update(key, e.target.checked)}
                      className="h-4 w-4 rounded border-dark-500 bg-dark-800 text-primary-600 focus:ring-primary-500/30" />
                    <span className="text-sm text-dark-300 group-hover:text-white transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </motion.section>
          </motion.div>

          {/* ===================== LIVE PREVIEW (sticky) ===================== */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hidden lg:block">
            <div className="sticky top-24">
              <div className="glass rounded-xl overflow-hidden">
                <div className="relative aspect-video bg-dark-800 overflow-hidden">
                  {previewBackdropOk ? (
                    <img src={form.backdropUrl} alt="" onError={() => setImgBroken(b => ({ ...b, backdrop: true }))}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
                      <ImageIcon className="h-10 w-10 text-dark-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent" />
                  {previewPosterOk && (
                    <img src={form.posterUrl} alt="" onError={() => setImgBroken(b => ({ ...b, poster: true }))}
                      className="absolute -bottom-5 left-4 w-28 aspect-[2/3] object-cover rounded-lg shadow-2xl shadow-black/60 ring-1 ring-white/10" />
                  )}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded bg-primary-600 text-white text-[10px] font-bold uppercase">
                      {form.type.toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className={`p-4 ${previewPosterOk ? 'pt-8' : 'pt-4'}`}>
                  <h3 className="text-lg font-bold text-white leading-tight">{form.title || 'Untitled'}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                    {form.productionYear && <span className="text-dark-300">{form.productionYear}</span>}
                    {form.quality && <span className="px-1.5 rounded border border-white/30 text-white/90">{form.quality}</span>}
                    {form.imdbRating && <span className="text-yellow-400 font-semibold">★ {Number(form.imdbRating).toFixed(1)}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {form.genres.slice(0, 4).map(g => (
                      <span key={g} className="px-2 py-0.5 rounded bg-white/8 text-dark-200 text-[11px]">{g}</span>
                    ))}
                  </div>
                  {form.overview && (
                    <p className="mt-3 text-xs text-dark-400 line-clamp-3 leading-relaxed">{form.overview}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-dark-500">
                <Check className="h-3.5 w-3.5 text-green-500" />
                Preview updates live as you type.
              </div>
            </div>
          </motion.div>
        </form>

        {/* ===================== STICKY ACTION BAR ===================== */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-dark-950/90 backdrop-blur-xl border-t border-dark-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-3">
            <div className="flex-1 hidden sm:flex items-center gap-2">
              <div className="w-40 h-1.5 rounded-full bg-dark-800 overflow-hidden">
                <motion.div className="h-full bg-primary-600 rounded-full" animate={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-xs text-dark-400">{progressPct}% complete</span>
            </div>
            <Button type="button" variant="ghost" onClick={() => navigate('/admin')}>Cancel</Button>
            <Button type="submit" onClick={handleSubmit} disabled={saveMutation.isPending} className="min-w-[150px]">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Update Media' : 'Submit for Review'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PersonSearchInput({ value, onChange, results, placeholder, onPick }: {
  value: string;
  onChange: (v: string) => void;
  results: Person[];
  placeholder: string;
  onPick: (p: Person) => void;
}) {
  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-500" />
          <input
            type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 rounded-md bg-dark-800 border border-dark-600 text-sm text-dark-200 placeholder:text-dark-500 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all"
          />
        </div>
        <button type="button" onClick={() => {
          const person = results[0];
          if (person) onPick(person);
        }}
          className="px-3 py-2 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-500 transition-colors flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="mt-1.5 rounded-lg bg-dark-800 border border-dark-600 overflow-hidden shadow-xl">
            {results.slice(0, 6).map(p => (
              <button key={p.id} type="button" onClick={() => onPick(p)}
                className="w-full px-3.5 py-2.5 text-sm text-left text-dark-200 hover:bg-dark-700 hover:text-white transition-colors flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600/15 flex items-center justify-center text-primary-400 text-[10px] font-bold">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                {p.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
