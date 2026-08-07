import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi, adminApi, userApi } from '../../services/api';
import { Comment, CommentConfig } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n/LanguageProvider';
import { useSupport } from '../providers/SupportProvider';
import {
  MessageSquare, Send, Trash2, Loader2, CornerDownRight, LogIn,
  Flag, EyeOff, Eye, ShieldAlert, AtSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';

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

/** Renders a comment body with @mentions highlighted as chips. */
function MentionText({ text }: { text: string }) {
  const { t } = useI18n();
  const parts = text.split(/(@[a-zA-Z0-9_]{1,30})/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@') && /^@[a-zA-Z0-9_]{1,30}$/.test(part)) {
          const username = part.slice(1);
          return (
            <Link
              key={i}
              to={`/user/${username}`}
              className="rounded bg-primary-600/15 px-1 font-semibold text-primary-300 transition-colors hover:bg-primary-600/25"
            >
              @{username}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/** @mention autocomplete shown while typing after "@" in the composer. */
function MentionSuggestions({ query, onPick }: { query: string; onPick: (username: string) => void }) {
  const [items, setItems] = useState<Array<{ id: string; username: string; avatar?: string }>>([]);
  const [open, setOpen] = useState(false);

  useQuery({
    queryKey: ['user', 'mention-search', query],
    queryFn: async () => {
      if (!query) return [];
      const r = await userApi.searchUsers(query, 1, 6);
      setItems(r.data?.data ?? []);
      setOpen(true);
      return r.data;
    },
    enabled: query.length >= 1,
  });

  if (!open || items.length === 0) return null;

  return (
    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-dark-600 bg-dark-900/95 shadow-2xl backdrop-blur-xl">
      {items.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => {
            onPick(u.username);
            setOpen(false);
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-dark-200 transition-colors hover:bg-white/5"
        >
          <AtSign className="h-3.5 w-3.5 text-primary-400" />
          <span className="font-medium text-white">{u.username}</span>
        </button>
      ))}
    </div>
  );
}

/** Finds the trailing "@username" token under the cursor so we can autocomplete. */
function useMentionQuery(text: string) {
  return useMemo(() => {
    const idx = text.lastIndexOf('@');
    if (idx < 0) return '';
    const after = text.slice(idx + 1);
    if (!/^[a-zA-Z0-9_]*$/.test(after)) return '';
    return after;
  }, [text]);
}

function CommentBody({
  comment,
  isAuthenticated,
  isModerator,
  onReply,
  onDelete,
  onReport,
  onToggleHidden,
  deleting,
}: {
  comment: Comment;
  isAuthenticated: boolean;
  isModerator: boolean;
  onReply: () => void;
  onDelete: () => void;
  onReport: () => void;
  onToggleHidden: () => void;
  deleting: boolean;
}) {
  const { t } = useI18n();
  const isHidden = comment.hidden || comment.moderationStatus === 'REJECTED';

  return (
    <div className="flex gap-3">
      <Avatar name={comment.user.username} src={comment.user.avatar} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-white">{comment.user.username}</span>
          {(comment.user.role === 'ADMIN' || comment.user.role === 'MODERATOR') && (
            <span className="rounded bg-primary-600/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
              {comment.user.role === 'ADMIN' ? t('comments.admin') : t('comments.mod')}
            </span>
          )}
          {comment.user.emailVerified && !isModerator && (
            <span title={t('comments.verified')} className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              {t('comments.verified')}
            </span>
          )}
          <span className="text-[11px] text-dark-500">
            <TimeAgo date={comment.createdAt} />
          </span>
          {(comment.hidden || comment.moderationStatus === 'REJECTED') && (
            <span className="flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
              <ShieldAlert className="h-3 w-3" /> {t('comments.hiddenNotice')}
            </span>
          )}
        </div>

        {isHidden && !isModerator ? (
          <p className="mt-1 text-sm italic text-dark-500">{t('comments.hiddenNotice')}</p>
        ) : (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-dark-200">
            <MentionText text={comment.content} />
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-4 text-xs">
          {isAuthenticated && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-dark-400 transition-colors hover:text-primary-400"
            >
              <CornerDownRight className="h-3.5 w-3.5" /> {t('comments.reply')}
            </button>
          )}
          {isAuthenticated && (
            <button
              onClick={onReport}
              className="flex items-center gap-1 text-dark-400 transition-colors hover:text-amber-400"
            >
              <Flag className="h-3.5 w-3.5" /> {t('comments.report')}
            </button>
          )}
          {isModerator && (
            <button
              onClick={onToggleHidden}
              className="flex items-center gap-1 text-dark-400 transition-colors hover:text-white"
            >
              {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {isHidden ? t('comments.unhide') : t('comments.hide')}
            </button>
          )}
          {isModerator && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-dark-400 transition-colors hover:text-red-400 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {t('comments.delete')}
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
  const { t } = useI18n();
  const { openSupport } = useSupport();
  const [text, setText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; username: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Comment | null>(null);
  const [reportReason, setReportReason] = useState<string>('Spam');
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const mentionQuery = useMentionQuery(text);

  const configQuery = useQuery({
    queryKey: ['comments', 'config'],
    queryFn: async () => {
      const r = await commentApi.getConfig();
      return r.data as { data: CommentConfig };
    },
    staleTime: 5 * 60 * 1000,
  });
  const config = configQuery.data?.data;

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

  const requireVerified = !!config?.requireVerifiedEmail;
  const commentsEnabled = config?.enabled !== false;
  const maxLength = config?.maxLength ?? 2000;

  const ensureCanComment = () => {
    if (requireVerified && user?.emailVerified === false) {
      setShowVerifiedModal(true);
      return false;
    }
    return true;
  };

  const addMutation = useMutation({
    mutationFn: (content: string) => commentApi.add(mediaId, content),
    onSuccess: () => {
      setText('');
      toast.success(t('comments.posted'));
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('comments.postFailed')),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => commentApi.reply(replyTarget!.id, content),
    onSuccess: () => {
      setReplyTarget(null);
      setReplyText('');
      toast.success(t('comments.reply'));
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('comments.postFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => commentApi.remove(commentId),
    onMutate: (commentId) => setDeletingId(commentId),
    onSuccess: () => {
      toast.success(t('comments.deleted'));
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('comments.deleteFailed')),
    onSettled: () => setDeletingId(null),
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => commentApi.report(id, reason),
    onSuccess: () => {
      toast.success(t('comments.reported'));
      setReportTarget(null);
      setReportReason('Spam');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('comments.reportFailed')),
  });

  const hideMutation = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      adminApi.setCommentHidden(id, hidden),
    onSuccess: () => {
      toast.success(t('comments.updated'));
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('comments.updateFailed')),
  });

  const isModerator = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const canModerate = (c: Comment) => isModerator || c.user.id === user?.id;

  const submitAdd = () => {
    if (!text.trim()) return;
    if (!ensureCanComment()) return;
    addMutation.mutate(text.trim());
  };

  const submitReply = () => {
    if (!replyText.trim() || !replyTarget) return;
    if (!ensureCanComment()) return;
    replyMutation.mutate(replyText.trim());
  };

  const canPost = isAuthenticated && commentsEnabled;

  const REPORT_REASONS = [
    t('comments.reportSpam'),
    t('comments.reportInappropriate'),
    t('comments.reportHarassment'),
    t('comments.reportMisinfo'),
    t('comments.reportOther'),
  ];

  return (
    <section className="glass rounded-2xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <MessageSquare className="h-4 w-4 text-primary-400" />
        {t('comments.title')}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-dark-300">{total}</span>
      </h2>

      {/* composer */}
      {!commentsEnabled ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-dark-400">
          <MessageSquare className="h-4 w-4 text-dark-500" />
          {t('comments.disabled')}
        </div>
      ) : isAuthenticated ? (
        <div className="mt-4">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLength))}
              rows={2}
              placeholder={t('comments.postPlaceholder')}
              className="w-full resize-none rounded-xl border border-dark-600 bg-dark-800 px-3.5 py-2.5 text-sm text-dark-100 placeholder:text-dark-500 focus:border-primary-500/60 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
            />
            <MentionSuggestions query={mentionQuery} onPick={(u) => setText((prev) => prev.slice(0, prev.lastIndexOf('@') + 1) + u + ' ')} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-dark-500">{text.trim().length}/{maxLength}</span>
            <button
              onClick={submitAdd}
              disabled={!text.trim() || addMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-500 disabled:opacity-40"
            >
              {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {t('comments.post')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-dark-400">
          <LogIn className="h-4 w-4 text-primary-400" />
          <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300">
            {t('comments.logIn')}
          </Link>
          {t('comments.toJoin')}
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
          <p className="py-4 text-center text-sm text-dark-500">{t('comments.empty')}</p>
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
                isAuthenticated={canPost}
                isModerator={canModerate(c)}
                onReply={() => setReplyTarget({ id: c.id, username: c.user.username })}
                onDelete={() => deleteMutation.mutate(c.id)}
                onReport={() => setReportTarget(c)}
                onToggleHidden={() => hideMutation.mutate({ id: c.id, hidden: !(c.hidden || c.moderationStatus === 'REJECTED') })}
                deleting={deletingId === c.id}
              />

              {c.replies && c.replies.length > 0 && (
                <div className="ml-12 space-y-3 border-l border-white/10 pl-4">
                  {c.replies.map((r) => (
                    <CommentBody
                      key={r.id}
                      comment={r}
                      isAuthenticated={canPost}
                      isModerator={canModerate(r)}
                      onReply={() => setReplyTarget({ id: c.id, username: c.user.username })}
                      onDelete={() => deleteMutation.mutate(r.id)}
                      onReport={() => setReportTarget(r)}
                      onToggleHidden={() => hideMutation.mutate({ id: r.id, hidden: !(r.hidden || r.moderationStatus === 'REJECTED') })}
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
                      {t('comments.replyTo')} <span className="font-semibold text-primary-400">{replyTarget.username}</span>
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value.slice(0, maxLength))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitReply();
                          if (e.key === 'Escape') setReplyTarget(null);
                        }}
                        placeholder={t('comments.writeReply')}
                        className="flex-1 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-dark-100 placeholder:text-dark-500 focus:border-primary-500/60 focus:outline-none"
                      />
                      <button
                        onClick={submitReply}
                        disabled={!replyText.trim() || replyMutation.isPending}
                        className="rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-500 disabled:opacity-40"
                      >
                        {replyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('comments.reply')}
                      </button>
                      <button
                        onClick={() => setReplyTarget(null)}
                        className="rounded-lg border border-white/15 px-2.5 py-2 text-xs text-dark-300 transition-colors hover:text-white"
                      >
                        {t('comments.cancel')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* report modal */}
      <Modal open={!!reportTarget} onClose={() => setReportTarget(null)} title={t('comments.reportTitle')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark-300">
            {t('comments.reportPrompt')}
          </p>
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReportReason(r)}
                className={`block w-full rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                  reportReason === r
                    ? 'border-primary-500/60 bg-primary-500/10 text-white'
                    : 'border-dark-600 bg-dark-800 text-dark-300 hover:border-dark-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setReportTarget(null)} className="btn btn-ghost">{t('comments.cancel')}</button>
            <button
              onClick={() => reportTarget && reportMutation.mutate({ id: reportTarget.id, reason: reportReason })}
              disabled={reportMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-amber-500 disabled:opacity-40"
            >
              {reportMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('comments.submitReport')}
            </button>
          </div>
        </div>
      </Modal>

      {/* email verification modal */}
      <Modal open={showVerifiedModal} onClose={() => setShowVerifiedModal(false)} title={t('comments.verificationRequired')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark-300">
            {t('comments.verificationBody')}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowVerifiedModal(false)} className="btn btn-ghost">{t('comments.later')}</button>
            <button
              onClick={() => {
                setShowVerifiedModal(false);
                openSupport({ subject: t('comments.verificationRequired'), context: t('comments.verificationBody') });
              }}
              className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-500"
            >
              {t('comments.contactSupport')}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
