import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { userApi, watchHistoryApi } from '../services/api';
import { Mail, Calendar, Settings, PlayCircle, Film, Star, Flame, CalendarDays, Trophy, Sparkles } from 'lucide-react';
import { formatRelativeTime } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/LanguageProvider';
import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';

interface UserStats {
  totalWatches: number;
  watchlistCount: number;
  ratingCount: number;
  titlesWatched: number;
  streakDays: number;
  activityDays: number;
}

interface Badge {
  labelKey: string;
  icon: typeof Flame;
  tone: 'primary' | 'gold' | 'success' | 'default';
  earned: boolean;
}

function useUserStats() {
  return useQuery({
    queryKey: ['user', 'stats'],
    queryFn: () => userApi.getStats().then((r) => r.data.data as UserStats),
    staleTime: 60_000,
  });
}

/* Activity heatmap: last 70 days */
function Heatmap({ watchedDays }: { watchedDays: string[] }) {
  const cells = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of watchedDays) counts[d.slice(0, 10)] = (counts[d.slice(0, 10)] || 0) + 1;
    const out: { date: string; count: number }[] = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 69);
    for (let i = 0; i < 70; i++) {
      const key = cursor.toISOString().slice(0, 10);
      out.push({ date: key, count: counts[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [watchedDays]);

  const color = (count: number) => {
    if (count === 0) return 'bg-white/[0.05]';
    if (count === 1) return 'bg-primary-600/30';
    if (count === 2) return 'bg-primary-600/60';
    return 'bg-primary-500';
  };

  return (
    <div className="grid grid-cols-[repeat(10,1fr)] gap-[3px]">
      {cells.map((c, i) => (
        <div key={i} title={`${c.date} · ${c.count} watch${c.count !== 1 ? 'es' : ''}`}
          className={`aspect-square rounded-[3px] transition-transform hover:scale-125 ${color(c.count)}`} />
      ))}
    </div>
  );
}

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data: stats } = useUserStats();
  const { data: history } = useQuery({
    queryKey: ['history', 'profile'],
    queryFn: () => watchHistoryApi.getHistory(1, 100).then((r) => r.data.data as any[]),
    staleTime: 60_000,
  });

  const watchedDays = useMemo(() => (history || []).map((h) => h.watchedAt as string), [history]);

  const badges: Badge[] = useMemo(() => {
    const s = stats;
    return [
      { labelKey: s && s.titlesWatched >= 1 ? 'badge.viewer' : 'badge.newcomer', icon: PlayCircle, tone: 'default' as const, earned: !!s && s.titlesWatched >= 1 },
      { labelKey: 'badge.cinephile', icon: Trophy, tone: 'gold' as const, earned: !!s && s.titlesWatched >= 10 },
      { labelKey: 'badge.streakMaster', icon: Flame, tone: 'primary' as const, earned: !!s && s.streakDays >= 3 },
      { labelKey: 'badge.curator', icon: Star, tone: 'success' as const, earned: !!s && s.watchlistCount >= 5 },
    ];
  }, [stats]);

  if (!user) return null;

  const statsCards = [
    { key: 'watchEvents', label: t('profile.watchEvents'), value: stats?.totalWatches ?? '—', icon: PlayCircle },
    { key: 'titlesWatched', label: t('profile.titlesWatched'), value: stats?.titlesWatched ?? '—', icon: Film },
    { key: 'myList', label: t('profile.myList'), value: stats?.watchlistCount ?? '—', icon: Star },
    { key: 'ratings', label: t('profile.ratings'), value: stats?.ratingCount ?? '—', icon: Star },
    { key: 'dayStreak', label: t('profile.dayStreak'), value: stats?.streakDays ?? '—', icon: Flame },
    { key: 'activeDays', label: t('profile.activeDays'), value: stats?.activityDays ?? '—', icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-primary-950 via-dark-900 to-dark-950 sm:h-60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(229,9,20,0.2)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(124,58,237,0.12)_0%,transparent_55%)]" />
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 right-1/4 h-64 w-64 rounded-full bg-primary-600/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto -mt-20 max-w-5xl px-6 pb-16 sm:px-10 lg:px-14">
        {/* Identity card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card p-7 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <Avatar src={user.avatar} name={user.username} size="xl" ring />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <h1 className="text-3xl font-black tracking-tight">{user.username}</h1>
                <Chip tone={user.role === 'ADMIN' ? 'primary' : user.role === 'MODERATOR' ? 'gold' : 'default'}
                  className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest">
                  {user.role.toLowerCase()}
                </Chip>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-dark-400 sm:justify-start">
                <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {user.email}</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {t('profile.memberSince')} {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="btn-glass mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                <Settings className="h-4 w-4" /> {t('header.settings')}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statsCards.map((stat, i) => (
            <motion.div key={stat.key} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card p-4 text-center">
              <stat.icon className={`mx-auto mb-2 h-5 w-5 ${stat.key === 'dayStreak' ? 'text-orange-400' : 'text-primary-400'}`} />
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-dark-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Badges + heatmap */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-dark-400">
              <Sparkles className="h-4 w-4 text-primary-400" /> {t('profile.badges')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {badges.map((b) => (
                <div key={b.labelKey}
                  className={`rounded-xl border p-3 text-center transition-all ${b.earned ? 'border-white/[0.1] bg-white/[0.04]' : 'border-white/[0.04] bg-white/[0.01] opacity-35'}`}>
                  <b.icon className={`mx-auto mb-1.5 h-6 w-6 ${b.tone === 'gold' ? 'text-yellow-400' : b.tone === 'success' ? 'text-green-400' : b.tone === 'primary' ? 'text-primary-400' : 'text-dark-300'}`} />
                  <p className="text-xs font-bold">{t(b.labelKey)}</p>
                  <p className="text-[10px] text-dark-500">{b.earned ? t('profile.earned') : t('profile.locked')}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="glass-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-dark-400">
              <CalendarDays className="h-4 w-4 text-primary-400" /> {t('profile.heatmapLabel')}
            </h3>
            <Heatmap watchedDays={watchedDays} />
            <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] text-dark-500">
              Less
              <span className="h-2.5 w-2.5 rounded-[3px] bg-white/[0.05]" />
              <span className="h-2.5 w-2.5 rounded-[3px] bg-primary-600/30" />
              <span className="h-2.5 w-2.5 rounded-[3px] bg-primary-600/60" />
              <span className="h-2.5 w-2.5 rounded-[3px] bg-primary-500" />
              More
            </div>
          </motion.div>
        </div>

        {/* Watch history */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <PlayCircle className="h-5 w-5 text-primary-400" /> {t('profile.watchHistory')}
            </h3>
            <button onClick={() => navigate('/search')} className="text-sm font-semibold text-primary-400 transition-colors hover:text-primary-300">
              {t('common.browse')}
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {!history?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="glass-card mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                  <PlayCircle className="h-8 w-8 text-dark-600" />
                </div>
                <p className="mb-3 text-dark-400">{t('profile.emptyHistory')}</p>
                <button onClick={() => navigate('/')} className="btn-primary text-sm">
                  {t('common.browse')}
                </button>
              </div>
            ) : history.slice(0, 10).map((item: any, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex cursor-pointer items-center gap-4 px-6 py-3.5 transition-colors hover:bg-white/[0.03]"
                onClick={() => navigate(`/media/${item.media.slug}`)}
              >
                {item.media.posterUrl ? (
                  <img src={item.media.posterUrl} alt="" className="h-14 w-10 flex-shrink-0 rounded-lg object-cover ring-1 ring-white/[0.06]" />
                ) : (
                  <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                    <Film className="h-4 w-4 text-dark-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.media.title}</p>
                  <p className="text-sm text-dark-400">{formatRelativeTime(item.watchedAt)}</p>
                </div>
                {item.progress && item.progress > 0 && item.progress < 99 && (
                  <div className="hidden w-24 sm:block">
                    <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-dark-500">{Math.round(item.progress)}%</p>
                  </div>
                )}
                {item.completed && (
                  <span className="rounded-full border border-green-500/25 bg-green-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-green-400">
                    Completed
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
