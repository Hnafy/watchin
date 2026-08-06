import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '../../services/api';
import { Comment } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { MessageSquare, Send, Trash2, Loader2, CornerDownRight, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return <img src={src} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />;
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-purple-600 text-xs font-bold text-white ring-1 ring-white/10">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function TimeAgo({ date }: { date: string }) {
  return <>{formatDistanceToNow(new Date(date), { addSuffix: true })}</>;
}

function CommentBody({
  comment,
  isAuthenticated,
  isModerator,
  onReply,
  onDelete,
  deleting,
}: {
  comment: Comment;
  isAuthenticated: boolean;
  isModerator: boolean;
  onReply: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex gap-3">
      <Avatar name={comment.user.username} src={comment.user.avatar} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-white">{comment.user.username}</span>
          {(comment.user.role === 'ADMIN' || comment.user.role === 'MODERATOR') && (
            <span className="rounded bg-primary-600/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
              {comment.user.role === 'ADMIN' ? 'Admin' : 'Mod'}
            </span>
          )}
          <span className="text-[11px] text-dark-500">
            <TimeAgo date={comment.createdAt} />
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-dark-200">
          {comment.content}
        </p>
        <div className="mt-1.5 flex items-center gap-4 text-xs">
          {isAuthenticated && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-dark-400 transition-colors hover:text-primary-400"
            >
              <CornerDownRight className="h-3.5 w-3.5" /> Reply
            </button>
          )}
          {isModerator && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-dark-400 transition-colors hover:text-red-400 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentsSection({ mediaId }: { mediaId: string }) {
  const qc = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const [text, setText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; username: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['comments', mediaId],
    queryFn: async () => {
      const r = await commentApi.getByMedia(mediaId);
      return r.data as { data: Comment[]; pagination: { total: number } };
    },
    enabled: !!mediaId,
  });

  const comments = data?.data ?? [];
  const total = data?.pagination?.total ?? comments.length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['comments', mediaId] });

  const addMutation = useMutation({
    mutationFn: (content: string) => commentApi.add(mediaId, content),
    onSuccess: () => {
      setText('');
      toast.success('Comment posted');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to post comment'),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => commentApi.reply(replyTarget!.id, content),
    onSuccess: () => {
      setReplyTarget(null);
      setReplyText('');
      toast.success('Reply posted');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to post reply'),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => commentApi.remove(commentId),
    onMutate: (commentId) => setDeletingId(commentId),
    onSuccess: () => {
      toast.success('Comment deleted');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete comment'),
    onSettled: () => setDeletingId(null),
  });

  const isModerator = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const canModerate = (c: Comment) => isModerator || c.user.id === user?.id;

  const submitAdd = () => {
    if (!text.trim()) return;
    addMutation.mutate(text.trim());
  };

  const submitReply = () => {
    if (!replyText.trim() || !replyTarget) return;
    replyMutation.mutate(replyText.trim());
  };

  return (
    <section className="glass rounded-2xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <MessageSquare className="h-4 w-4 text-primary-400" />
        Comments
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-dark-300">{total}</span>
      </h2>

      {/* composer */}
      {isAuthenticated ? (
        <div className="mt-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Share your thoughts..."
            className="w-full resize-none rounded-xl border border-dark-600 bg-dark-800 px-3.5 py-2.5 text-sm text-dark-100 placeholder:text-dark-500 focus:border-primary-500/60 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-dark-500">{text.trim().length}/2000</span>
            <button
              onClick={submitAdd}
              disabled={!text.trim() || addMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-500 disabled:opacity-40"
            >
              {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Post comment
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-dark-400">
          <LogIn className="h-4 w-4 text-primary-400" />
          <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300">
            Log in
          </Link>
          to join the discussion.
        </div>
      )}

      {/* list */}
      <div className="mt-5 space-y-5">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
          </div>
        )}

        {!isLoading && comments.length === 0 && (
          <p className="py-4 text-center text-sm text-dark-500">No comments yet. Be the first!</p>
        )}

        <AnimatePresence initial={false}>
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <CommentBody
                comment={c}
                isAuthenticated={isAuthenticated}
                isModerator={canModerate(c)}
                onReply={() => setReplyTarget({ id: c.id, username: c.user.username })}
                onDelete={() => deleteMutation.mutate(c.id)}
                deleting={deletingId === c.id}
              />

              {c.replies && c.replies.length > 0 && (
                <div className="ml-12 space-y-3 border-l border-white/10 pl-4">
                  {c.replies.map((r) => (
                    <CommentBody
                      key={r.id}
                      comment={r}
                      isAuthenticated={isAuthenticated}
                      isModerator={canModerate(r)}
                      onReply={() => setReplyTarget({ id: c.id, username: c.user.username })}
                      onDelete={() => deleteMutation.mutate(r.id)}
                      deleting={deletingId === r.id}
                    />
                  ))}
                </div>
              )}

              {replyTarget?.id === c.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="ml-12 flex gap-3"
                >
                  <Avatar name={user?.username || '?'} src={user?.avatar} />
                  <div className="flex-1">
                    <p className="mb-1 text-xs text-dark-400">
                      Replying to <span className="font-semibold text-primary-400">{replyTarget.username}</span>
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitReply();
                          if (e.key === 'Escape') setReplyTarget(null);
                        }}
                        placeholder="Write a reply..."
                        className="flex-1 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-dark-100 placeholder:text-dark-500 focus:border-primary-500/60 focus:outline-none"
                      />
                      <button
                        onClick={submitReply}
                        disabled={!replyText.trim() || replyMutation.isPending}
                        className="rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-500 disabled:opacity-40"
                      >
                        {replyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reply'}
                      </button>
                      <button
                        onClick={() => setReplyTarget(null)}
                        className="rounded-lg border border-white/15 px-2.5 py-2 text-xs text-dark-300 transition-colors hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
