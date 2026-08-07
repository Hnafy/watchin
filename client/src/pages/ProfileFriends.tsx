import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../services/api';
import { Avatar } from '../components/ui/Avatar';
import { User, Users, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n/LanguageProvider';
import toast from 'react-hot-toast';

interface Friend {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  createdAt: string;
}

export function ProfileFriends() {
  const { username = '', tab } = useParams<{ username?: string; tab?: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { t } = useI18n();
  const mode = tab === 'following' ? 'following' : tab === 'followers' ? 'followers' : 'friends';

  const { data: friends, isLoading } = useQuery<Friend[]>({
    queryKey: ['profile', username, 'friends', mode],
    queryFn: () => userApi.getUserFriends(username, mode).then((r) => r.data.data as Friend[]),
    enabled: !!username,
    staleTime: 60_000,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => (username ? userApi.getProfile(username).then((r) => r.data.data) : Promise.resolve(null)),
    enabled: !!username,
    staleTime: 60_000,
  });

  const followMutation = useMutation({
    mutationFn: (friendId: string) => userApi.toggleFollow(friendId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', username, 'friends'] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update follow'),
  });

  const getModeTitle = () => {
    switch (mode) {
      case 'friends': return t('profile.friends');
      case 'following': return t('profile.following');
      case 'followers': return t('profile.followers');
      default: return t('profile.friends');
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'friends': return User;
      case 'following': return UserPlus;
      case 'followers': return Users;
      default: return User;
    }
  };

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
        <p className="text-dark-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={profile.avatar} name={profile.username} size="xl" ring />
            <div>
              <h1 className="text-2xl font-black text-white">{profile.username}</h1>
              <p className="text-dark-400 text-sm mt-1">{getModeTitle()}</p>
            </div>
          </div>
          <Link to={`/user/${profile.username}`} className="btn btn-glass text-sm">
            View profile
          </Link>
        </div>

        <div className="mb-6 flex gap-2">
          {(['friends', 'following', 'followers'] as const).map((m) => (
            <Link
              key={m}
              to={`/user/${username}/friends/${m}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-primary-600 text-white'
                  : 'text-dark-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {m === 'friends' ? t('profile.friends') : m === 'following' ? t('profile.following') : t('profile.followers')}
            </Link>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-card p-4 animate-pulse" />
            ))}
          </div>
        ) : friends && friends.length > 0 ? (
          <div className="space-y-3">
            {friends.map((friend) => {
              const isSelf = user?.id === friend.id;
              return (
                <div key={friend.id} className="glass-card p-4 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-4">
                    <Link to={`/user/${friend.username}`}>
                      <Avatar src={friend.avatar} name={friend.username} size="md" />
                    </Link>
                    <Link to={`/user/${friend.username}`} className="flex-1">
                      <p className="font-medium text-white">{friend.username}</p>
                      <p className="text-xs text-dark-400 mt-0.5">
                        {friend.role === 'ADMIN' ? t('profile.admin') : friend.role === 'MODERATOR' ? t('profile.moderator') : t('profile.user')}
                      </p>
                    </Link>
                    {!isSelf && (
                      <button
                        onClick={() => followMutation.mutate(friend.id)}
                        disabled={followMutation.isPending}
                        className="p-2 rounded-full text-dark-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                        title={t('profile.follow')}
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-dark-800">
              {(() => { const Icon = getModeIcon(); return <Icon className="h-8 w-8 text-dark-600" />; })()}
            </div>
            <p className="text-dark-400">
              {mode === 'friends' && t('profile.noFriends')}
              {mode === 'following' && t('profile.noFollowing')}
              {mode === 'followers' && t('profile.noFollowers')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
