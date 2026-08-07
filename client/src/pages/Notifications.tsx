import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Loader2, Calendar, User, Music } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../services/api';
import { useI18n } from '../i18n/LanguageProvider';
import { SEOPage } from '../components/SEO';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  relatedId?: string;
  relatedUserId?: string;
  createdAt: string;
}

interface NotificationsResult {
  items: Notification[];
  unread: number;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationApi.getList(50);
      return res.data.data as NotificationsResult;
    },
    staleTime: 60_000,
  });

  const notifications = data?.items ?? [];

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationApi.markRead(notificationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    },
  });

  const clearReadMutation = useMutation({
    mutationFn: () => notificationApi.deleteAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('notifications.cleared'));
    },
    onError: () => {
      toast.error('Failed to clear notifications');
    },
  });

  const filteredNotifications = notifications.filter((n) => 
    filter === 'all' || !n.read
  );

  const unreadCount = notifications.filter((n) => !n.read).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'FRIEND_REQUEST':
        return <User className="h-4 w-4 text-blue-400" />;
      case 'FOLLOW':
        return <User className="h-4 w-4 text-green-400" />;
      case 'PLAYLIST':
        return <Music className="h-4 w-4 text-purple-400" />;
      case 'LIKE':
        return <Music className="h-4 w-4 text-red-400" />;
      default:
        return <Bell className="h-4 w-4 text-primary-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'FRIEND_REQUEST':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'FOLLOW':
        return 'bg-green-500/10 border-green-500/30';
      case 'PLAYLIST':
        return 'bg-purple-500/10 border-purple-500/30';
      case 'LIKE':
        return 'bg-red-500/10 border-red-500/30';
      default:
        return 'bg-primary-500/10 border-primary-500/30';
    }
  };

  return (
    <>
      <SEOPage
        title="Notifications — Watchin"
        description="View your notifications for new episodes, recommendations, and activity."
        canonical="/notifications"
        noindex={true}
      />
      <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary-500/20 to-primary-600/5 shadow-[0_8px_30px_rgba(124,58,237,0.2)]">
              <Bell className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="mt-1 inline-block text-sm font-medium text-dark-400">
                  {unreadCount} {unreadCount === 1 ? t('notifications.unread') : t('notifications.unreadCount', { count: unreadCount })}
                </span>
              )}
            </div>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(t('notifications.clearAllConfirm'))) {
                  clearReadMutation.mutate();
                }
              }}
              disabled={clearReadMutation.isPending}
              className="btn btn-glass flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:text-red-400 disabled:opacity-50"
            >
              {clearReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t('notifications.clearAll')}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'text-dark-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            {t('notifications.all')}
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary-600 text-white'
                : 'text-dark-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            {t('notifications.unread')} ({unreadCount})
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full"
            />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-dark-800 mx-auto mb-4">
              <Bell className="h-10 w-10 text-dark-600" />
            </div>
            <p className="text-dark-400 text-lg mb-2">{t('notifications.empty')}</p>
            <p className="text-dark-500 text-sm max-w-sm mx-auto">
              {t('notifications.emptySubtitle')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`glass-card p-5 flex items-start gap-4 hover:bg-white/[0.03] transition-all ${
                    !notification.read ? 'border-l-4' : ''
                  }`}
                  style={{ borderColor: !notification.read ? 'var(--color-primary-500)' : undefined }}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`font-medium ${!notification.read ? 'text-white' : 'text-dark-300'}`}>{notification.title}</p>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-dark-400 mt-0.5">{notification.body}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-dark-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {!notification.read && (
                    <button
                      onClick={() => markReadMutation.mutate(notification.id)}
                      disabled={markReadMutation.isPending}
                      className="h-8 w-8 rounded-full text-dark-400 hover:text-white hover:bg-primary-500/20 transition-colors flex items-center justify-center"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  </>
  );
}