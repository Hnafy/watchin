import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { userApi } from '../services/api';

export interface UserSettings {
  notifications: {
    emailUpdates: boolean;
    newReleases: boolean;
    watchlist: boolean;
    comments: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showWatchHistory: boolean;
    showStats: boolean;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  notifications: { emailUpdates: false, newReleases: true, watchlist: true, comments: true },
  privacy: { publicProfile: true, showWatchHistory: true, showStats: true },
};

function deepMerge<T>(base: T, patch: Partial<T>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && out[k] !== null) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export function useSettings() {
  const qc = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS } = useQuery({
    queryKey: ['user', 'settings'],
    queryFn: () => userApi.getSettings().then((r) => deepMerge(DEFAULT_SETTINGS, r.data.data)),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => userApi.updateSettings(patch),
    onSuccess: (r) => {
      qc.setQueryData(['user', 'settings'], deepMerge(DEFAULT_SETTINGS, r.data.data));
    },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: ['user', 'settings'] });
      toast.error(err.response?.data?.message || 'Failed to save settings');
    },
  });

  const update = (patch: Partial<UserSettings>) => {
    qc.setQueryData(['user', 'settings'], deepMerge(settings, patch));
    mutation.mutate(patch as unknown as Record<string, unknown>);
  };

  return { settings, update, isSaving: mutation.isPending };
}
