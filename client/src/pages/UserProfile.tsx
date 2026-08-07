import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';
import { Mail, Calendar, Settings, Film, Star } from 'lucide-react';
import { useI18n } from '../i18n/LanguageProvider';

interface UserStats {
  totalWatches: number;
  watchlistCount: number;
  ratingCount: number;
}

interface UserProfileData {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  stats: UserStats;
}

export function UserProfile() {
  const { username = '' } = useParams<{ username: string }>();
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();

  const { data: profile, isLoading } = useQuery<UserProfileData>({
    queryKey: ['profile', username],
    queryFn: async () => {
      const res = await userApi.getProfile(username);
      return res.data.data as UserProfileData;
    },
    enabled: !!username,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">User not found</h2>
        <p className="text-dark-400">This user may have changed their username or deleted their account.</p>
      </div>
    );
  }

  const isSelf = user?.id === profile.id;
  const { stats } = profile;

  const statCards = [
    { label: t('profile.titlesWatched'), value: stats.totalWatches, icon: Film },
    { label: t('profile.myList'), value: stats.watchlistCount, icon: Star },
    { label: t('profile.ratings'), value: stats.ratingCount, icon: Star },
  ];

  return (
    <div className="min-h-screen">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary-950 via-dark-900 to-dark-950 sm:h-56">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(229,9,20,0.18)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(124,58,237,0.12)_0%,transparent_55%)]" />
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 right-1/4 h-64 w-64 rounded-full bg-primary-600/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto -mt-16 max-w-5xl px-6 pb-16 sm:px-10 lg:px-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card p-7 sm:p-8"
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <Avatar src={profile.avatar} name={profile.username} size="xl" ring />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <h1 className="text-3xl font-black tracking-tight">{profile.username}</h1>
                <Chip tone={profile.role === 'ADMIN' ? 'primary' : profile.role === 'MODERATOR' ? 'gold' : 'default'}
                  className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest">
                  {profile.role.toLowerCase()}
                </Chip>
                {isSelf && (
                  <span className="rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-400">
                    This is you
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-dark-400 sm:justify-start">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Joined {new Date(profile.createdAt).toLocaleDateString()}
                </span>
                {isSelf && user?.email && (
                  <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {user.email}</span>
                )}
              </div>

              {isSelf && isAuthenticated && (
                <button
                  onClick={() => window.location.href = '/settings'}
                  className="btn-glass mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                >
                  <Settings className="h-4 w-4" /> {t('header.settings')}
                </button>
              )}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3 sm:grid-cols-3">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                <s.icon className="mx-auto mb-2 h-5 w-5 text-primary-400" />
                <p className="text-2xl font-black">{s.value.toLocaleString()}</p>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-dark-400">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}