import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';
import { PlaylistCard } from './Playlists/PlaylistsListPage';
import {
  UserPlus, Check, X, Heart, Film, Calendar, Loader2, Mail, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PublicPlaylist {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  likeCount: number;
  saveCount: number;
  items: Array<{ mediaId: { title?: string; slug?: string; posterUrl?: string } }>;
}

interface UserProfileData {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  createdAt: string;
  stats: { followers: number; following: number; friends: number; likes: number };
  publicPlaylists: PublicPlaylist[];
  relationship: {
    isFollowing: boolean;
    isFriend: boolean;
    hasLiked: boolean;
    requestStatus: 'sent' | 'received' | null;
    requestId: string | null;
  };
}

export function UserProfile() {
  const { username = '' } = useParams<{ username: string }>();
  const { user, isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery<UserProfileData>({
    queryKey: ['profile', username],
    queryFn: async () => {
      const res = await userApi.getProfile(username);
      return res.data.data as UserProfileData;
    },
    enabled: !!username,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['profile', username] });

  const followMutation = useMutation({
    mutationFn: () => userApi.toggleFollow(profile!.id),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update follow'),
  });

  const likeMutation = useMutation({
    mutationFn: () => userApi.likeProfile(profile!.id),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update like'),
  });

  const friendMutation = useMutation({
    mutationFn: async () => {
      if (profile!.relationship.requestStatus === 'received' && profile!.relationship.requestId) {
        await userApi.respondFriendRequest(profile!.relationship.requestId, 'accept');
      } else if (profile!.relationship.requestStatus === 'sent' && profile!.relationship.requestId) {
        await userApi.cancelFriendRequest(profile!.relationship.requestId);
      } else {
        await userApi.sendFriendRequest(profile!.id);
      }
    },
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update friend request'),
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
  const { relationship, stats } = profile;

  const statCards = [
    { label: 'Followers', value: stats.followers },
    { label: 'Following', value: stats.following },
    { label: 'Friends', value: stats.friends },
    { label: 'Likes', value: stats.likes },
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

              {!isSelf && isAuthenticated && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                    className={`btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${
                      relationship.isFollowing
                        ? 'border border-white/10 bg-white/[0.06] text-dark-200 hover:bg-white/[0.1]'
                        : 'btn-primary'
                    }`}
                  >
                    {followMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    {relationship.isFollowing ? 'Following' : 'Follow'}
                  </button>

                  {!relationship.isFriend && (
                    <button
                      onClick={() => friendMutation.mutate()}
                      disabled={friendMutation.isPending}
                      className={`btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${
                        relationship.requestStatus === 'received'
                          ? 'border border-green-500/40 bg-green-500/15 text-green-400 hover:bg-green-500/25'
                          : 'btn-glass'
                      }`}
                    >
                      {friendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : relationship.requestStatus === 'sent' ? (
                        <X className="h-4 w-4" />
                      ) : relationship.requestStatus === 'received' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      {relationship.requestStatus === 'sent'
                        ? 'Request sent'
                        : relationship.requestStatus === 'received'
                          ? 'Accept request'
                          : 'Add friend'}
                    </button>
                  )}

                  <button
                    onClick={() => likeMutation.mutate()}
                    disabled={likeMutation.isPending}
                    className={`btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${
                      relationship.hasLiked
                        ? 'border border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25'
                        : 'btn-glass'
                    }`}
                  >
                    {likeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${relationship.hasLiked ? 'fill-red-500' : ''}`} />}
                    {relationship.hasLiked ? 'Liked' : 'Like'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                <p className="text-2xl font-black">{s.value.toLocaleString()}</p>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-dark-400">{s.label}</p>
              </div>
            ))}
          </div>

          {!isSelf && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm sm:justify-start">
              <Link to={`/user/${profile.username}/friends`} className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                View friends & followers
              </Link>
            </div>
          )}
        </motion.div>

        {/* Public playlists */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
              <Sparkles className="h-5 w-5 text-primary-400" /> Public Playlists
            </h2>
            <span className="text-sm text-dark-400">{profile.publicPlaylists.length} total</span>
          </div>

          {profile.publicPlaylists.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-dark-800">
                <Film className="h-8 w-8 text-dark-600" />
              </div>
              <p className="text-dark-400">{isSelf ? 'You have no public playlists yet.' : `${profile.username} has no public playlists yet.`}</p>
              {isSelf && (
                <Link to="/playlists/new" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
                  <UserPlus className="h-4 w-4" /> Create a playlist
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {profile.publicPlaylists.map((p) => (
                <PlaylistCard key={p.id} playlist={p as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
