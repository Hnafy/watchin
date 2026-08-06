import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../services/api';
import { Avatar } from '../components/ui/Avatar';
import { User, Users, UserPlus, X } from 'lucide-react';
import { useI18n } from '../i18n/LanguageProvider';

interface Friend {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  createdAt: string;
}

export function ProfileFriends() {
  const { username, tab } = useParams<{ username: string; tab: string }>();
  const { t } = useI18n();
  const mode = tab === 'following' ? 'following' : tab === 'followers' ? 'followers' : 'friends';

  const { data: friends } = useQuery({
    queryKey: ['profile', username, 'friends', mode],
    queryFn: () => userApi.getUserFriends(username, mode).then((r) => r.data.data as Friend[]),
    enabled: !!username,
    staleTime: 60_000,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => userApi.getProfile(username).then((r) => r.data.data),
    enabled: !!username,
    staleTime: 60_000,
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

  if (!profile) return null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Avatar src={profile.avatar} name={profile.username} size="xl" ring />
          <div>
            <h1 className="text-2xl font-black text-white">{profile.username}</h1>
            <p className="text-dark-400 text-sm mt-1">{getModeTitle()}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-black text-white">{(friends || []).length}</div>
            <div className="text-xs text-dark-400 uppercase tracking-wider mt-1">
              {mode === 'friends' ? t('profile.friends') : mode === 'following' ? t('profile.following') : t('profile.followers')}
            </div>
          </div>
        </div>

        {/* List */}
        {friends && friends.length > 0 ? (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.id} className="glass-card p-4 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar src={friend.avatar} name={friend.username} size="md" />
                  <div className="flex-1">
                    <p className="font-medium text-white">{friend.username}</p>
                    <p className="text-xs text-dark-400 mt-0.5">
                      {friend.role === 'ADMIN' ? t('profile.admin') : friend.role === 'MODERATOR' ? t('profile.moderator') : t('profile.user')}
                    </p>
                  </div>
                  <button className="p-2 rounded-full text-dark-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-dark-800 mx-auto mb-4">
              {(getModeIcon())({ className: "h-8 w-8 text-dark-600" })}
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