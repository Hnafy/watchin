import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_URL = "https://watchin-4crs.vercel.app/api";
// export const API_URL = "/api";

const ACCESS_TOKEN_KEY = 'watchin_accessToken';
const REFRESH_TOKEN_KEY = 'watchin_refreshToken';

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (r: unknown) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        setTokens(data.accessToken, data.refreshToken);
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        processQueue(refreshError as Error);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: { email: string; username: string; password: string; code: string }) => api.post('/auth/register', data),
  sendVerification: (email: string) => api.post('/auth/send-verification', { email }),
  googleLogin: (idToken: string) => api.post('/auth/google', { idToken }),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout', { refreshToken: getRefreshToken() }),
  getMe: () => api.get('/auth/me'),
};

export const mediaApi = {
  getList: (params: Record<string, unknown>) => api.get('/media', { params }),
  getById: (id: string) => api.get(`/media/${id}`),
  getBySlug: (slug: string) => api.get(`/media/slug/${slug}`),
  getWatchSource: (id: string, episodeId?: string) =>
    api.get(`/media/source/${id}`, { params: episodeId ? { episodeId } : undefined }),
  getTrending: (params: Record<string, unknown>) => api.get('/media/trending', { params }),
  getTopRated: (params: Record<string, unknown>) => api.get('/media/top-rated', { params }),
  getLatest: (params: Record<string, unknown>) => api.get('/media/latest', { params }),
  getUpcoming: (params: Record<string, unknown>) => api.get('/media/upcoming', { params }),
  getPopular: (params: Record<string, unknown>) => api.get('/media/popular', { params }),
  getByGenre: (genreSlug: string, params: Record<string, unknown>) => api.get(`/media/genre/${genreSlug}`, { params }),
  getRecommended: (params: Record<string, unknown>) => api.get('/media/recommended', { params }),
  getRecentlyWatched: (params: Record<string, unknown>) => api.get('/media/recently-watched', { params }),
  incrementView: (id: string) => api.post(`/media/${id}/view`),
  getGenres: () => api.get('/media/genres'),
  getCountries: () => api.get('/media/countries'),
  getLanguages: () => api.get('/media/languages'),
  getKeywords: () => api.get('/media/keywords'),
  searchAndFilter: (filters: Record<string, unknown>) => api.get('/media/browse', { params: filters }),
};

export const watchlistApi = {
  getList: (page = 1, limit = 20, folderId?: string) =>
    api.get('/watchlist', { params: { page, limit, folderId } }),
  add: (mediaId: string, folderId?: string | null) => api.post('/watchlist', { mediaId, folderId }),
  remove: (mediaId: string) => api.delete(`/watchlist/${mediaId}`),
  moveToFolder: (mediaId: string, folderId?: string | null) => api.patch(`/watchlist/${mediaId}/folder`, { folderId }),
  check: (mediaId: string) => api.get(`/watchlist/${mediaId}/check`),
  clearAll: () => api.delete('/watchlist'),
  getFolders: () => api.get('/watchlist/folders'),
  createFolder: (name: string, icon?: string | null) => api.post('/watchlist/folders', { name, icon }),
  renameFolder: (folderId: string, name: string, icon?: string | null) =>
    api.patch(`/watchlist/folders/${folderId}`, { name, icon }),
  deleteFolder: (folderId: string) => api.delete(`/watchlist/folders/${folderId}`),
};

export const ratingApi = {
  getMediaRatings: (mediaId: string, page = 1, limit = 20) => api.get(`/ratings/${mediaId}`, { params: { page, limit } }),
  getStats: (mediaId: string) => api.get(`/ratings/${mediaId}/stats`),
  getUserRating: (mediaId: string) => api.get(`/ratings/${mediaId}/user`),
  rate: (mediaId: string, value: number) => api.post('/ratings', { mediaId, value }),
  delete: (mediaId: string) => api.delete(`/ratings/${mediaId}`),
};

export const watchHistoryApi = {
  updateProgress: (data: Record<string, unknown>) => api.post('/history', data),
  getContinueWatching: (limit = 10) => api.get('/history/continue', { params: { limit } }),
  getHistory: (page = 1, limit = 20) => api.get('/history', { params: { page, limit } }),
  markCompleted: (mediaId: string) => api.post(`/history/${mediaId}/complete`),
  deleteItem: (historyId: string) => api.delete(`/history/${historyId}`),
  clearAll: () => api.delete('/history'),
};

export const userApi = {
  updateProfile: (data: { username?: string; email?: string }) => api.patch('/user/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.patch('/user/password', data),
  getStats: () => api.get('/user/stats'),
  updateAvatar: (image: string) => api.post('/user/avatar', { image }),
  getSettings: () => api.get('/user/settings'),
  updateSettings: (data: Record<string, unknown>) => api.patch('/user/settings', data),
  deleteAccount: () => api.delete('/user/account'),
  getProfile: (username: string) => api.get(`/user/profile/${username}`),
  searchUsers: (q: string, page = 1, limit = 20) =>
    api.get('/user/users/search', { params: { q, page, limit } }),
};

export const notificationApi = {
  getList: (limit = 20) => api.get('/notifications', { params: { limit } }),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  deleteAllRead: () => api.delete('/notifications/read-all'),
};

export const searchApi = {
  suggest: (q: string, limit = 6) => api.get('/media/suggest', { params: { q, limit } }),
  trendingSearches: () => api.get('/media/trending-searches'),
  track: (query: string) => api.post('/media/search/track', { query }).catch(() => null),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getViewsChart: (days = 30) => api.get('/admin/analytics/views', { params: { days } }),
  getAllMedia: (page = 1, limit = 20, search?: string, type?: string) =>
    api.get('/admin/media/all', { params: { page, limit, search, type } }),
  getMediaAnalytics: (id: string) => api.get(`/admin/media/${id}/analytics`),
  deleteMedia: (id: string) => api.delete(`/admin/media/${id}`),
  getMediaForEdit: (id: string) => api.get(`/admin/media-edit/${id}`),
  updateMediaRecord: (id: string, data: Record<string, unknown>) => api.put(`/admin/media-edit/${id}`, data),
  getPendingMedia: (page = 1, limit = 20) => api.get('/admin/media/pending', { params: { page, limit } }),
  getMediaDetail: (id: string) => api.get(`/admin/media/${id}`),
  createMedia: (data: Record<string, unknown>) => api.post('/admin/media', data),
  updateMedia: (id: string, data: Record<string, unknown>) => api.patch(`/admin/media/${id}`, data),
  approveMedia: (id: string) => api.post(`/admin/media/${id}/approve`),
  rejectMedia: (id: string) => api.post(`/admin/media/${id}/reject`),
  getAllUsers: (page = 1, limit = 20, search?: string) =>
    api.get('/admin/users', { params: { page, limit, search } }),
  updateUserRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getAllComments: (page = 1, limit = 20, search?: string, filter = 'all') =>
    api.get('/admin/comments', { params: { page, limit, search, filter } }),
  getBlockedEmails: () => api.get('/admin/blocked-emails'),
  addBlockedEmail: (email: string, note?: string) => api.post('/admin/blocked-emails', { email, note }),
  removeBlockedEmail: (id: string) => api.delete(`/admin/blocked-emails/${id}`),
  deleteComment: (id: string) => api.delete(`/admin/comments/${id}`),
  getCommentSettings: () => api.get('/admin/comments/settings'),
  updateCommentSettings: (key: string, value: unknown) => api.put('/admin/comments/settings', { key, value }),
  setCommentHidden: (id: string, hidden: boolean) => api.patch(`/admin/comments/${id}/hidden`, { hidden }),
  updateUserVerified: (id: string, emailVerified: boolean) =>
    api.patch(`/admin/users/${id}/verify`, { emailVerified }),
  sendUserMessage: (id: string, data: { title?: string; body: string }) =>
    api.post(`/admin/users/${id}/message`, data),
  warnUser: (id: string, reason?: string) => api.post(`/admin/users/${id}/warn`, { reason }),
  warnCommentReporters: (commentId: string) => api.post(`/admin/comments/${commentId}/warn-reporters`),
  getSettings: (group?: string) => api.get('/admin/settings', { params: { group } }),
  updateSetting: (key: string, value: any, label?: string, group?: string) =>
    api.put('/admin/settings', { key, value, label, group }),
  createSeries: (data: Record<string, unknown>) => api.post('/admin/series', data),
};

export const recommendationApi = {
  getAiRecommendations: (params: Record<string, unknown> = {}) => api.get('/recommendations/ai', { params }),
  getSimilarMedia: (mediaId: string) => api.get(`/recommendations/similar/${mediaId}`),
};

export const tmdbApi = {
  search: (q: string, type?: string) => api.get('/tmdb/search', { params: { q, type } }),
  getDetails: (tmdbId: number, type: string) => api.get(`/tmdb/details/${tmdbId}`, { params: { type } }),
  getImages: (tmdbId: number, type: string) => api.get(`/tmdb/images/${tmdbId}`, { params: { type } }),
  importMedia: (tmdbId: number, type: string) => api.post('/tmdb/import', { tmdbId, type }),
};

export const mixdropApi = {
  upload: (file: File, onProgress?: (pct: number) => void) =>
    api.post('/mixdrop/upload', file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Filename': encodeURIComponent(file.name),
      },
      timeout: 0,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }),
};

export const commentApi = {
  getByMedia: (mediaId: string, page = 1, limit = 20) =>
    api.get(`/comments/media/${mediaId}`, { params: { page, limit } }),
  getConfig: () => api.get('/comments/config'),
  add: (mediaId: string, content: string) => api.post(`/comments/media/${mediaId}`, { content }),
  reply: (commentId: string, content: string) => api.post(`/comments/${commentId}/reply`, { content }),
  report: (commentId: string, reason: string) => api.post(`/comments/${commentId}/report`, { reason }),
  remove: (commentId: string) => api.delete(`/comments/${commentId}`),
};

export const supportApi = {
  contact: (data: { message: string; subject?: string; pageUrl?: string }) =>
    api.post('/support/contact', data),
};
