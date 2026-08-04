import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { User } from '../types';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, logout } = useAuthStore();
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
    select: (r) => r.data.data as User,
    retry: false,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
    if (meQuery.isError) logout();
    if (!isAuthenticated && !meQuery.isFetching) {
      useAuthStore.getState().setLoading(false);
    }
  }, [meQuery.data, meQuery.isError, meQuery.isFetching, isAuthenticated]);

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => authApi.login(data),
    onSuccess: (r) => { useAuthStore.getState().setUser(r.data.user); },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { email: string; username: string; password: string }) => authApi.register(data),
    onSuccess: (r) => { useAuthStore.getState().setUser(r.data.user); },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => { useAuthStore.getState().logout(); qc.invalidateQueries(); },
  });

  return {
    user: user || null, isAuthenticated, isLoading, setUser,
    login: loginMutation.mutateAsync, register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending, isRegistering: registerMutation.isPending,
  };
};
