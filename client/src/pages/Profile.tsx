import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { userApi, watchHistoryApi } from '../services/api';
import { Mail, Calendar, Settings, Film, PlayCircle } from 'lucide-react';
import { formatRelativeTime } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/LanguageProvider';
import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data: history } = useQuery({
    queryKey: ['history', 'profile'],
    queryFn: () => watchHistoryApi.getHistory(1, 100).then((r) => r.data.data as any[]),
    staleTime: 60_000,
  });

  if (!user) return null;

  return (
     <div className="min-h-screen">
       {/* Top accent — matches Settings background (plain dark) */}
       <div className="relative h-20 sm:h-24">
         <div className="absolute inset-0 bg-dark-950" />
         <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
       </div>

       <div className="relative z-10 mx-auto -mt-16 max-w-5xl px-6 pb-16 sm:px-10 lg:px-14">
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