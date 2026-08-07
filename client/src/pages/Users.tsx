import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';
import { Search, Users, UserPlus, Check, X, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserResult {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  createdAt: string;
  followerCount: number;
  isFollowing: boolean;
  friendStatus: 'sent' | 'received' | null;
}

function BouncingLoader() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-8">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-primary-500"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export function UsersPage() {
  const { user, isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const { data: apiData, isLoading, isFetching } = useQuery({
    queryKey: ['users', debounced],
    queryFn: async () => {
      const res = await userApi.searchUsers(debounced, 1, 50);
      return res.data as { data: UserResult[] };
    },
    enabled: debounced.length > 0,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const followMutation = useMutation({
    mutationFn: (id: string) => userApi.toggleFollow(id),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update follow'),
  });

  const friendMutation = useMutation({
    mutationFn: async (u: UserResult) => {
      if (u.friendStatus === 'received') {
        const res = await userApi.searchUsers(u.username, 1, 1);
        const full = res.data.data[0];
        // use requestId — not returned here; fall back to re-querying profile relation
        const prof = await userApi.getProfile(u.username);
        const rel = prof.data.data.relationship;
        if (rel.requestId) {
          await userApi.respondFriendRequest(rel.requestId, 'accept');
          return;
        }
        throw new Error('Request not found');
      } else if (u.friendStatus === 'sent') {
        const prof = await userApi.getProfile(u.username);
        const rel = prof.data.data.relationship;
        if (rel.requestId) await userApi.cancelFriendRequest(rel.requestId);
        return;
      } else {
        await userApi.sendFriendRequest(u.id);
      }
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to update friend request'),
  });

  const results = apiData?.data || [];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-24 pb-16">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 font-display text-4xl font-bold tracking-tight text-white">
          <Sparkles className="h-8 w-8 text-primary-400" /> People
        </h1>
        <p className="mt-2 text-dark-400">Find users, follow friends, and share your watchlists.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username..."
          className="input w-full pl-12 py-3 text-base"
          autoFocus
        />
      </div>

      {!debounced ? (
        <div className="glass-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-dark-800">
            <Users className="h-8 w-8 text-dark-600" />
          </div>
          <p className="text-dark-400">Type a username to find people.</p>
        </div>
      ) : isLoading && isFetching ? (
        <BouncingLoader />
      ) : results.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-dark-400">No users found for “{debounced}”.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((u) => {
            const isSelf = user?.id === u.id;
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.03]"
              >
                <Link to={`/user/${u.username}`}>
                  <Avatar src={u.avatar} name={u.username} size="lg" />
                </Link>
                <Link to={`/user/${u.username}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-white">{u.username}</p>
                    <Chip tone={u.role === 'ADMIN' ? 'primary' : u.role === 'MODERATOR' ? 'gold' : 'default'}
                      className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                      {u.role.toLowerCase()}
                    </Chip>
                  </div>
                  <p className="mt-0.5 text-xs text-dark-400">
                    {u.followerCount} {u.followerCount === 1 ? 'follower' : 'followers'} • Joined {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </Link>

                {!isSelf && isAuthenticated && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => followMutation.mutate(u.id)}
                      disabled={followMutation.isPending}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        u.isFollowing
                          ? 'bg-white/[0.06] text-dark-200 hover:bg-white/[0.1]'
                          : 'bg-primary-600 text-white hover:bg-primary-500'
                      }`}
                    >
                      {followMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )}
                      {u.isFollowing ? 'Following' : 'Follow'}
                    </button>

                    <button
                      onClick={() => friendMutation.mutate(u)}
                      disabled={friendMutation.isPending}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                          u.friendStatus === 'received'
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : u.friendStatus === 'sent'
                              ? 'bg-white/[0.06] text-dark-200 hover:bg-white/[0.1]'
                              : 'bg-white/[0.06] text-dark-200 hover:bg-white/[0.1]'
                        }`}
                      >
                        {friendMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : u.friendStatus === 'received' ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : u.friendStatus === 'sent' ? (
                          <X className="h-3.5 w-3.5" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        {u.friendStatus === 'received' ? 'Accept' : u.friendStatus === 'sent' ? 'Sent' : 'Add friend'}
                      </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
