import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';
import { Search, Sparkles, Users } from 'lucide-react';

interface UserResult {
  id: string;
  username: string;
  avatar?: string;
  role: string;
  createdAt: string;
}

export function UsersPage() {
  const { user, isAuthenticated } = useAuth();
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

  const results = apiData?.data || [];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-24 pb-16">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 font-display text-4xl font-bold tracking-tight text-white">
          <Sparkles className="h-8 w-8 text-primary-400" /> {isAuthenticated ? 'Users' : 'People'}
        </h1>
        <p className="mt-2 text-dark-400">Find users on Watchin.</p>
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
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}