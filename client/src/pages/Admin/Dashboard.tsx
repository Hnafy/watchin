import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Film, Users, Clock, TrendingUp, Plus, Eye, BarChart3, ChevronLeft, ChevronRight,
  Star, Heart, Trash2, Edit, Search, ArrowUpRight, ArrowDownRight, Activity, Radio,
  MessageSquare, BadgeCheck, BadgeX, EyeOff, Settings, Ban, AlertTriangle,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n/LanguageProvider';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'content' | 'users' | 'comments';

const iconBg: Record<string, string> = {
  blue: 'from-blue-500/30 to-blue-500/0 text-blue-400 ring-blue-400/20',
  green: 'from-green-500/30 to-green-500/0 text-green-400 ring-green-400/20',
  purple: 'from-purple-500/30 to-purple-500/0 text-purple-400 ring-purple-400/20',
  red: 'from-red-500/30 to-red-500/0 text-red-400 ring-red-400/20',
  indigo: 'from-indigo-500/30 to-indigo-500/0 text-indigo-400 ring-indigo-400/20',
  teal: 'from-teal-500/30 to-teal-500/0 text-teal-400 ring-teal-400/20',
  amber: 'from-amber-500/30 to-amber-500/0 text-amber-400 ring-amber-400/20',
  pink: 'from-pink-500/30 to-pink-500/0 text-pink-400 ring-pink-400/20',
};

function StatCard({ label, value, icon: Icon, tone, change, delay = 0 }: {
  label: string; value: number | string; icon: any; tone: keyof typeof iconBg; change?: number; delay?: number;
}) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="glass-card relative overflow-hidden rounded-2xl p-6"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary-500/10 to-transparent blur-2xl" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-dark-400">{label}</p>
          <p className="mt-2 font-display text-4xl font-bold tracking-tight text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {t('admin.vsYesterday', { pct: Math.abs(change) })}
            </div>
          )}
        </div>
        <div className={`rounded-2xl bg-gradient-to-br p-3.5 ring-1 ring-inset ${iconBg[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
    </motion.div>
  );
}

function ViewsChart({ data }: { data: Array<{ date: string; views: number }> }) {
  const { t } = useI18n();
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.views), 1);
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
          <BarChart3 className="h-5 w-5 text-primary-400" /> {t('admin.viewsLast30')}
        </h3>
        <span className="rounded-full border border-dark-600/60 px-3 py-1 text-xs font-medium text-dark-400">{t('admin.daily')}</span>
      </div>
      <div className="flex items-end gap-1 h-44">
        {data.map((d, i) => (
          <div key={i} className="group relative flex-1">
            <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-dark-600/60 bg-dark-800/95 px-2.5 py-1 text-xs text-white opacity-0 shadow-xl backdrop-blur transition-opacity group-hover:opacity-100">
              {t('admin.viewsTooltip', { date: d.date, count: d.views.toLocaleString() })}
            </div>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.views / max) * 100}%` }}
              transition={{ delay: i * 0.02, duration: 0.45, ease: 'easeOut' }}
              className="min-h-[3px] w-full cursor-pointer rounded-t-md bg-gradient-to-t from-primary-600 to-primary-400 opacity-80 shadow-[0_0_14px_rgba(124,58,237,0.35)] transition-all group-hover:opacity-100"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-dark-500">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function LiveActivity({ todayUnique, weekTrend, activeUsers }: {
  todayUnique: number; weekTrend: number[]; activeUsers: number;
}) {
  const { t } = useI18n();
  const max = Math.max(...weekTrend, 1);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card relative overflow-hidden rounded-2xl p-6"
    >
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
          <Radio className="h-5 w-5 text-purple-400" /> {t('admin.liveActivity')}
        </h3>
        <span className="flex items-center gap-2 rounded-full border border-green-400/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>
          {t('admin.live')}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-dark-400">{t('admin.uniqueToday')}</p>
          <p className="mt-1 font-display text-3xl font-bold text-white">{todayUnique.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-dark-400">{t('admin.activeUsers7d')}</p>
          <p className="mt-1 font-display text-3xl font-bold text-white">{activeUsers.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-5 flex h-12 items-end gap-1">
        {weekTrend.map((v, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${(v / max) * 100}%` }}
            transition={{ delay: 0.5 + i * 0.04, duration: 0.4 }}
            className="flex-1 rounded-sm bg-gradient-to-t from-purple-600/70 to-purple-400/90"
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-dark-500">{t('admin.uniqueVisitorsDays', { count: weekTrend.length })}</p>
    </motion.div>
  );
}

function ContentTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'all-media', page, search, typeFilter],
    queryFn: () => adminApi.getAllMedia(page, 15, search, typeFilter),
    select: (r) => r.data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteMedia(id),
    onSuccess: () => {
      toast.success(t('admin.mediaDeleted'));
      qc.invalidateQueries({ queryKey: ['admin', 'all-media'] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const items = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin.searchMedia')} className="input pl-10" />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">{t('admin.allTypes')}</option>
          <option value="MOVIE">{t('admin.movies')}</option>
          <option value="TV_SHOW">{t('admin.tvShows')}</option>
          <option value="ANIME">Anime</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-950/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">{t('admin.media')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase hidden sm:table-cell">{t('admin.type')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase hidden md:table-cell">{t('admin.rating')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase hidden md:table-cell">{t('admin.views')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-dark-500">
                    <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                    {t('admin.loadingMedia')}
                  </div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-dark-500">
                  <Film className="h-12 w-12 mx-auto mb-3 text-dark-600" />
                  <p className="font-medium">{t('admin.noMedia')}</p>
                  <p className="text-sm mt-1">{t('admin.noMediaHint')}</p>
                </td></tr>
              ) : items.map((m: any) => (
                <tr key={m.id} className="hover:bg-dark-900/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {m.posterUrl ? <img src={m.posterUrl} alt="" className="h-10 w-7 rounded object-cover" /> :
                        <div className="h-10 w-7 rounded bg-dark-700 flex items-center justify-center">
                          <Film className="h-4 w-4 text-dark-400" />
                        </div>}
                      <div>
                        <p className="font-medium text-sm line-clamp-1 group-hover:text-primary-400 transition-colors">{m.title}</p>
                        <p className="text-xs text-dark-400">{m.type === 'MOVIE' ? t('admin.movie') : m.type === 'ANIME' ? 'Anime' : t('admin.tvShow')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`badge ${m.type === 'MOVIE' ? 'badge-primary' : m.type === 'ANIME' ? 'badge-info' : 'badge-success'}`}>
                      {m.type === 'MOVIE' ? t('admin.movie') : m.type === 'ANIME' ? 'Anime' : t('admin.tvShow')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-red-500 text-red-500" /> {m.imdbRating?.toFixed(1) || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm">{m.viewCount?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/media/${m.slug}`)} className="p-1.5 rounded-lg hover:bg-dark-800 transition-all hover:scale-110" title={t('admin.view')}>
                        <Eye className="h-4 w-4" />
                      </button>
                        <button onClick={() => navigate(`/admin/media/${m.id}/edit`)} className="p-1.5 rounded-lg hover:bg-primary-900/20 text-primary-600 transition-all hover:scale-110" title={t('admin.edit')}>
                        <Edit className="h-4 w-4" />
                      </button>
                        <button onClick={() => setDeleteId(m.id)} className="p-1.5 rounded-lg hover:bg-red-900/20 text-red-500 transition-all hover:scale-110" title={t('admin.delete')}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
           <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700">
            <span className="text-sm text-dark-500">{t('admin.items', { count: pagination.total })}</span>
            <div className="flex gap-2">
               <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                 className="p-1.5 rounded-lg hover:bg-dark-800 disabled:opacity-30 transition-all hover:scale-105"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm py-1 px-3">{page} / {pagination.totalPages}</span>
               <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                 className="p-1.5 rounded-lg hover:bg-dark-800 disabled:opacity-30 transition-all hover:scale-105"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('admin.deleteMedia')}
        message={t('admin.deleteMediaMsg')}
        confirmLabel={t('admin.delete')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function BlockedEmailsPanel() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const { data } = useQuery({
    queryKey: ['admin', 'blocked-emails'],
    queryFn: () => adminApi.getBlockedEmails(),
    select: (r) => r.data.data,
  });

  const addMutation = useMutation({
    mutationFn: ({ email, note }: { email: string; note?: string }) => adminApi.addBlockedEmail(email, note),
    onSuccess: () => {
      toast.success(t('admin.emailBlocked'));
      setEmail('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['admin', 'blocked-emails'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.removeBlockedEmail(id),
    onSuccess: () => {
      toast.success(t('admin.emailUnblocked'));
      qc.invalidateQueries({ queryKey: ['admin', 'blocked-emails'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const items = data || [];

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-white">
        <Ban className="h-4 w-4 text-red-400" /> {t('admin.blockedEmailsTitle')}
      </h3>
      <p className="mt-1 text-sm text-dark-400">{t('admin.blockedEmailsSubtitle')}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('admin.blockedEmailPlaceholder')}
          className="input flex-1"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('admin.blockNote')}
          className="input sm:max-w-xs"
        />
        <button
          onClick={() => addMutation.mutate({ email, note })}
          disabled={addMutation.isPending || !email.trim()}
          className="btn btn-danger"
        >
          <Plus className="h-4 w-4" /> {t('admin.addBlockedEmail')}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-dark-500">{t('admin.noBlockedEmails')}</p>
        ) : items.map((b: any) => (
          <div key={b._id || b.id} className="flex items-center justify-between gap-3 rounded-xl border border-dark-600/50 bg-dark-900/50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-red-300">{b.email}</p>
              {b.note && <p className="truncate text-xs text-dark-400">{b.note}</p>}
            </div>
            <button
              onClick={() => removeMutation.mutate(b._id || b.id)}
              disabled={removeMutation.isPending}
              className="rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-red-900/20 hover:text-red-400"
              title={t('admin.unblock')}
            >
              <Ban className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [blockEmail, setBlockEmail] = useState<string | null>(null);
  const [messageUser, setMessageUser] = useState<any>(null);
  const [messageText, setMessageText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminApi.getAllUsers(page, 15, search),
    select: (r) => r.data,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUserRole(id, role),
    onSuccess: () => { toast.success(t('admin.roleUpdated')); qc.invalidateQueries({ queryKey: ['admin', 'users'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, emailVerified }: { id: string; emailVerified: boolean }) =>
      adminApi.updateUserVerified(id, emailVerified),
    onSuccess: () => {
      toast.success(t('admin.verifiedUpdated'));
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const messageMutation = useMutation({
    mutationFn: ({ id, title, body }: { id: string; title?: string; body: string }) =>
      adminApi.sendUserMessage(id, { title, body }),
    onSuccess: (d: any) => {
      toast.success(t('admin.userMessaged', { username: d?.data?.recipient ?? d?.data?.username ?? 'user' }));
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setMessageUser(null);
      setMessageText('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const warnMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminApi.warnUser(id, reason),
    onSuccess: () => {
      toast.success(t('admin.userWarned'));
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { toast.success(t('admin.userDeleted')); qc.invalidateQueries({ queryKey: ['admin', 'users'] }); setDeleteId(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const blockEmailMutation = useMutation({
    mutationFn: (email: string) => adminApi.addBlockedEmail(email),
    onSuccess: () => {
      toast.success(t('admin.emailBlocked'));
      qc.invalidateQueries({ queryKey: ['admin', 'blocked-emails'] });
      setBlockEmail(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const items = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <BlockedEmailsPanel />
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
        <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('admin.searchUsers')} className="input pl-10" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-950/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">{t('admin.user')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase hidden sm:table-cell">{t('admin.role')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase hidden md:table-cell">Verified</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase hidden md:table-cell">{t('admin.joined')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase hidden md:table-cell">{t('admin.activity')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-dark-500">{t('admin.loading')}</td></tr>
              ) : items.map((u: any) => (
                <tr key={u.id} className="hover:bg-dark-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar ? <img src={u.avatar} alt="" className="h-8 w-8 rounded-full" /> :
                        <div className="h-8 w-8 rounded-full bg-primary-900/30 flex items-center justify-center text-primary-400 text-sm font-bold">{u.username[0].toUpperCase()}</div>}
                      <div>
                        <p className="font-medium text-sm">{u.username}</p>
                        <p className="text-xs text-dark-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <select value={u.role} onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                      className="text-xs font-medium px-2 py-1 rounded-lg border border-dark-600 bg-transparent">
                      <option value="USER">{t('admin.roleUser')}</option>
                      <option value="MODERATOR">{t('admin.roleModerator')}</option>
                      <option value="ADMIN">{t('admin.roleAdmin')}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <button
                      onClick={() => verifyMutation.mutate({ id: u.id, emailVerified: !u.emailVerified })}
                      disabled={u.role === 'ADMIN'}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-50 ${
                        u.emailVerified
                          ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-dark-700 text-dark-400 ring-1 ring-dark-600 hover:text-white'
                      }`}
                      title={t('admin.toggleVerified')}
                    >
                      {u.emailVerified ? <BadgeCheck className="h-3.5 w-3.5" /> : <BadgeX className="h-3.5 w-3.5" />}
                      {u.emailVerified ? t('admin.verified') : t('admin.unverified')}
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-dark-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex gap-3 text-xs text-dark-400">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {u._count?.watchHistory || 0}</span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {u._count?.ratings || 0}</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {u._count?.watchlistItems || 0}</span>
                    </div>
                  </td>
                   <td className="px-4 py-3 text-right">
                     <button onClick={() => setBlockEmail(u.email)} className="p-1.5 rounded-lg hover:bg-amber-900/20 text-amber-500 transition-colors" title={t('admin.blockEmail')}>
                       <Ban className="h-4 w-4" />
                     </button>
                     <button onClick={() => setMessageUser(u)} className="p-1.5 rounded-lg hover:bg-sky-900/20 text-sky-500 transition-colors" title={t('admin.messageUser')}>
                       <MessageSquare className="h-4 w-4" />
                     </button>
                     <button
                       onClick={() => warnMutation.mutate({ id: u.id })}
                       className="p-1.5 rounded-lg hover:bg-orange-900/20 text-orange-500 transition-colors"
                       title={t('admin.warnUser')}
                       disabled={u.role === 'ADMIN'}
                     >
                       <AlertTriangle className="h-4 w-4" />
                     </button>
                     <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded-lg hover:bg-red-900/20 text-red-500 transition-colors">
                       <Trash2 className="h-4 w-4" />
                     </button>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700">
            <span className="text-sm text-dark-400">{t('admin.usersCount', { count: pagination.total })}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-dark-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm py-1 px-3">{page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-dark-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('admin.deleteUser')}
        message={t('admin.deleteUserMsg')}
        confirmLabel={t('admin.deleteUserBtn')}
        loading={deleteMutation.isPending}
      />

      <ConfirmModal
        open={!!blockEmail}
        onClose={() => setBlockEmail(null)}
        onConfirm={() => blockEmail && blockEmailMutation.mutate(blockEmail)}
        title={t('admin.blockEmail')}
        message={t('admin.blockEmailConfirm', { email: blockEmail || '' })}
        confirmLabel={t('admin.block')}
        loading={blockEmailMutation.isPending}
      />

      {/* Send Message to User */}
      {messageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-900 p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-white">
              {t('admin.messageUser')} — {messageUser.username}
            </h3>
            <p className="mt-1 text-sm text-dark-400">{messageUser.email}</p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t('admin.messagePlaceholder')}
              rows={5}
              className="mt-4 w-full resize-y rounded-xl border border-dark-700 bg-dark-950 px-3.5 py-2.5 text-sm text-white placeholder:text-dark-500 focus:border-primary-500/60 focus:outline-none"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setMessageUser(null)}
                className="px-4 py-2 text-sm font-medium text-dark-300 hover:text-white"
              >
                {t('common.close')}
              </button>
              <button
                onClick={() => {
                  if (!messageText.trim()) return toast.error(t('admin.messageRequired'));
                  messageMutation.mutate({ id: messageUser.id, body: messageText });
                }}
                disabled={messageMutation.isPending || !messageText.trim()}
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {messageMutation.isPending ? t('admin.sending') : t('admin.send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentSettingsPanel() {
  const qc = useQueryClient();
  const { t } = useI18n();

  const { data } = useQuery({
    queryKey: ['admin', 'comment-settings'],
    queryFn: () => adminApi.getCommentSettings(),
    select: (r) => r.data.data,
  });

  const settingsMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      adminApi.updateCommentSettings(key, value),
    onSuccess: () => {
      toast.success(t('admin.settingsSaved'));
      qc.invalidateQueries({ queryKey: ['admin', 'comment-settings'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const toggles: Array<{ key: string; label: string; value: boolean }> = data
    ? [
        { key: 'enabled', label: 'Comments enabled', value: !!data.enabled },
        { key: 'requireVerifiedEmail', label: 'Require verified email to comment', value: !!data.requireVerifiedEmail },
        { key: 'profanityFilter', label: 'Profanity filter', value: !!data.profanityFilter },
        { key: 'aiModeration', label: 'AI moderation', value: !!data.aiModeration },
      ]
    : [];

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold text-white">
        <Settings className="h-4 w-4 text-primary-400" /> {t('admin.commentSettings')}
      </h3>
      <div className="mt-4 space-y-3">
        {toggles.map((tg) => (
          <div key={tg.key} className="flex items-center justify-between gap-4">
            <span className="text-sm text-dark-200">{tg.label}</span>
            <button
              onClick={() => settingsMutation.mutate({ key: tg.key, value: !tg.value })}
              disabled={settingsMutation.isPending}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                tg.value ? 'bg-primary-600' : 'bg-dark-600'
              } disabled:opacity-50`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${tg.value ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
        {data && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-dark-200">{t('admin.reportThreshold')}</span>
            <input
              type="number"
              min={1}
              max={20}
              defaultValue={data.reportThreshold}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 1 && v !== data.reportThreshold) {
                  settingsMutation.mutate({ key: 'reportThreshold', value: v });
                }
              }}
              className="input w-20 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CommentsTab() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'comments', page, search, filter],
    queryFn: () => adminApi.getAllComments(page, 15, search, filter),
    select: (r) => r.data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteComment(id),
    onSuccess: () => {
      toast.success(t('admin.commentDeleted'));
      qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const hideMutation = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      adminApi.setCommentHidden(id, hidden),
    onSuccess: () => {
      toast.success(t('admin.commentUpdated'));
      qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const warnReportersMutation = useMutation({
    mutationFn: (id: string) => adminApi.warnCommentReporters(id),
    onSuccess: () => {
      toast.success(t('admin.reportersWarned'));
      qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('admin.failed')),
  });

  const items = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <CommentSettingsPanel />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-fit rounded-xl border border-dark-600/50 bg-dark-800/40 p-1">
          {[
            { key: 'all', label: t('admin.allComments') },
            { key: 'reported', label: t('admin.reportedComments') },
            { key: 'mentions-admins', label: t('admin.mentionsComments') },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                filter === f.key ? 'bg-primary-600 text-white shadow' : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin.searchComments')} className="input pl-10" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-950/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">{t('admin.author')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">{t('admin.comment')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase hidden md:table-cell">{t('admin.onMedia')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase hidden sm:table-cell">{t('admin.date')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-dark-500">{t('admin.loading')}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-dark-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-dark-600" />
                  <p className="font-medium">{t('admin.noComments')}</p>
                </td></tr>
              ) : items.map((c: any) => {
                const hidden = !!c.hidden || c.moderationStatus === 'REJECTED';
                return (
                <tr key={c._id || c.id} className="hover:bg-dark-900/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.user?.avatar ? <img src={c.user.avatar} alt="" className="h-8 w-8 rounded-full" /> :
                        <div className="h-8 w-8 rounded-full bg-primary-900/30 flex items-center justify-center text-primary-400 text-sm font-bold">
                          {(c.user?.username?.[0] || '?').toUpperCase()}
                        </div>}
                      <div>
                        <p className="font-medium text-sm">{c.user?.username || t('admin.unknownUser')}</p>
                        <p className="text-xs text-dark-400">{c.user?.role?.toLowerCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`text-sm max-w-xs line-clamp-2 text-dark-200 ${hidden ? 'opacity-40 line-through' : ''}`}>{c.content}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {c.parentId && <p className="text-[10px] uppercase tracking-wider text-dark-500">{t('admin.reply')}</p>}
                      {hidden && (
                        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">Hidden</span>
                      )}
                      {c.reportCount > 0 && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          {c.reportCount} report{c.reportCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {c.mediaId ? (
                      <Link to={`/media/${c.mediaId.slug}`} className="text-sm text-primary-400 hover:underline">
                        {c.mediaId.title}
                      </Link>
                    ) : <span className="text-sm text-dark-500">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm text-dark-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                   <td className="px-4 py-3 text-right">
                     <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                       {c.reportCount > 0 && (
                         <button
                           onClick={() => warnReportersMutation.mutate(c._id || c.id)}
                           className="p-1.5 rounded-lg hover:bg-orange-900/20 text-orange-500 transition-colors"
                           title={t('admin.warnReporters')}
                         >
                           <AlertTriangle className="h-4 w-4" />
                         </button>
                       )}
                       <button
                         onClick={() => hideMutation.mutate({ id: c._id || c.id, hidden: !hidden })}
                         className="p-1.5 rounded-lg hover:bg-dark-800 transition-colors"
                         title={hidden ? t('admin.unhide') : t('admin.hide')}
                       >
                         {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                       </button>
                       <button onClick={() => setDeleteId(c._id || c.id)} className="p-1.5 rounded-lg hover:bg-red-900/20 text-red-500 transition-colors" title={t('admin.delete')}>
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                   </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700">
            <span className="text-sm text-dark-400">{t('admin.commentsCount', { count: pagination.total })}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-dark-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm py-1 px-3">{page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-dark-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('admin.deleteComment')}
        message={t('admin.deleteCommentMsg')}
        confirmLabel={t('admin.delete')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

export function AdminDashboard() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    select: (r) => r.data.data,
    refetchInterval: 30_000,
  });

  const { data: viewsData } = useQuery({
    queryKey: ['admin', 'views-chart'],
    queryFn: () => adminApi.getViewsChart(30),
    select: (r) => r.data.data,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn: () => adminApi.getPendingMedia(1, 10),
    select: (r) => r.data.data,
  });

  const qc = useQueryClient();
  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveMedia(id),
    onSuccess: () => { toast.success(t('admin.approved')); qc.invalidateQueries({ queryKey: ['admin', 'pending'] }); qc.invalidateQueries({ queryKey: ['admin', 'stats'] }); },
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectMedia(id),
    onSuccess: () => { toast.success(t('admin.rejected')); qc.invalidateQueries({ queryKey: ['admin', 'pending'] }); },
  });

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: t('admin.overview'), icon: BarChart3 },
    { key: 'content', label: t('admin.content'), icon: Film },
    { key: 'users', label: t('admin.users'), icon: Users },
    { key: 'comments', label: t('admin.comments'), icon: MessageSquare },
  ];

  const viewChange = stats?.todayViews && stats?.yesterdayViews
    ? Math.round(((stats.todayViews - stats.yesterdayViews) / (stats.yesterdayViews || 1)) * 100)
    : undefined;

  const weekTrend = useMemo(() => viewsData?.slice(-7).map((d: any) => d.uniqueViews ?? 0) ?? [], [viewsData]);
  const todayUnique = viewsData?.length ? (viewsData[viewsData.length - 1]?.uniqueViews ?? 0) : 0;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(124,58,237,0.14),transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-400">{t('admin.controlCenter')}</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">{t('admin.dashboardTitle')}</h1>
            <p className="mt-2 text-dark-400">{t('admin.dashboardSubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/admin/tmdb-import" className="btn btn-glass"><Search className="h-4 w-4" /> {t('admin.tmdbImport')}</Link>
            <Link to="/admin/media/new" className="btn btn-primary"><Plus className="h-4 w-4" /> {t('admin.addMedia')}</Link>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-8 w-fit rounded-2xl border border-dark-600/50 bg-dark-800/40 p-1.5 backdrop-blur-xl">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                activeTab === t.key ? 'text-white' : 'text-dark-400 hover:text-dark-200'
              }`}>
              {activeTab === t.key && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-b from-dark-600/80 to-dark-700/60 shadow-lg ring-1 ring-white/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2"><t.icon className="h-4 w-4" /> {t.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t('admin.totalMedia')} value={stats?.totalMedia ?? 0} icon={Film} tone="blue" delay={0} />
              <StatCard label={t('admin.totalUsers')} value={stats?.totalUsers ?? 0} icon={Users} tone="green" delay={0.05} />
              <StatCard label={t('admin.todaysViews')} value={stats?.todayViews ?? 0} icon={Eye} tone="purple" change={viewChange} delay={0.1} />
              <StatCard label={t('admin.pendingReview')} value={stats?.pendingMedia ?? 0} icon={Clock} tone="red" delay={0.15} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label={t('admin.totalViews')} value={stats?.totalViews ?? 0} icon={TrendingUp} tone="indigo" delay={0.2} />
              <StatCard label={t('admin.totalRatings')} value={stats?.totalRatings ?? 0} icon={Star} tone="amber" delay={0.25} />
              <StatCard label={t('admin.active7d')} value={stats?.activeUsers ?? 0} icon={Activity} tone="teal" delay={0.3} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">{viewsData && <ViewsChart data={viewsData} />}</div>
              <LiveActivity todayUnique={todayUnique} weekTrend={weekTrend} activeUsers={stats?.activeUsers ?? 0} />
            </div>

            {/* Pending Review */}
            <div className="glass-card overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-dark-600/40 px-6 py-4">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-white">
                  <Clock className="h-5 w-5 text-amber-400" /> {t('admin.pendingReview')}
                </h2>
                <span className="rounded-full border border-dark-600/60 bg-dark-800/60 px-3 py-1 text-xs font-medium text-dark-400">
                  {t('admin.waiting', { count: stats?.pendingMedia ?? 0 })}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-950/50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase">{t('admin.media')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase hidden sm:table-cell">{t('admin.submitted')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-dark-500 uppercase">{t('admin.actions')}</th>
                    </tr>
                  </thead>
                   <tbody className="divide-y divide-dark-700">
                    {!pendingData?.length ? (
                      <tr><td colSpan={3} className="px-6 py-12 text-center text-dark-500">{t('admin.noPending')}</td></tr>
                    ) : pendingData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-dark-900/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{item.title}</td>
                        <td className="px-6 py-4 text-sm text-dark-500 hidden sm:table-cell">{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => approveMutation.mutate(item.id)} className="text-green-600 hover:text-green-700 text-sm font-medium mr-3">{t('admin.approve')}</button>
                          <button onClick={() => rejectMutation.mutate(item.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">{t('admin.reject')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'comments' && <CommentsTab />}
      </div>
    </div>
  );
}
