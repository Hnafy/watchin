import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notificationApi } from '../services/api';
import { useEffect, useRef } from 'react';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsResult {
  items: AppNotification[];
  unread: number;
}

export function useNotifications(enabled = true) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<NotificationsResult>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationApi.getList(20);
      return res.data.data;
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: 120_000,
  });

  // Poll for the unread badge whenever the tab regains focus
  const focusRef = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        qc.invalidateQueries({ queryKey: ['notifications'] });
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !focusRef.current) {
        qc.invalidateQueries({ queryKey: ['notifications'] });
      }
    };
    focusRef.current = document.visibilityState === 'visible';
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, qc]);

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return {
    items: data?.items ?? [],
    unread: data?.unread ?? 0,
    isLoading,
    markRead,
    markAllRead,
  };
}
