import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, setTokens, clearTokens } from '../services/api';
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
    onSuccess: (r) => {
      setTokens(r.data.accessToken, r.data.refreshToken);
      useAuthStore.getState().setUser(r.data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { email: string; username: string; password: string; code: string }) => authApi.register(data),
    onSuccess: (r) => {
      setTokens(r.data.accessToken, r.data.refreshToken);
      useAuthStore.getState().setUser(r.data.user);
    },
  });

  const googleMutation = useMutation({
    mutationFn: (idToken: string) => authApi.googleLogin(idToken),
    onSuccess: (r) => {
      setTokens(r.data.accessToken, r.data.refreshToken);
      useAuthStore.getState().setUser(r.data.user);
    },
  });

  const sendVerificationMutation = useMutation({
    mutationFn: (email: string) => authApi.sendVerification(email),
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearTokens();
      useAuthStore.getState().logout();
      qc.invalidateQueries();
    },
  });

  return {
    user: user || null, isAuthenticated, isLoading, setUser,
    login: loginMutation.mutateAsync, register: registerMutation.mutateAsync,
    googleLogin: googleMutation.mutateAsync,
    sendVerificationCode: sendVerificationMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending, isRegistering: registerMutation.isPending,
    isGoogleLoggingIn: googleMutation.isPending,
    isSendingCode: sendVerificationMutation.isPending,
  };
};
