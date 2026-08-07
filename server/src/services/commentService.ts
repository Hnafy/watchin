import { Comment, Media, User, Notification, isValidId } from '../db/models.js';
import { escapeRegex } from '../db/utils.js';
import { AppError } from '../utils/AppError.js';
import { containsProfanity } from '../utils/profanity.js';
import { geminiService } from './geminiService.js';
import { commentSettingsService } from './commentSettingsService.js';
import { supportService } from './supportService.js';
import { notifyMany } from './notificationService.js';

const REPLIES_POPULATE = {
  path: 'replies',
  options: { sort: { createdAt: 1 } },
  populate: { path: 'user', select: 'username avatar role' },
};

const MENTION_RE = /@([a-zA-Z0-9_]{1,30})/g;

/**
 * Finds usernames mentioned in a comment body and creates a notification for
 * each mentioned user so they know they were called out.
 */
async function notifyMentions({ mediaId, commentId, authorId, authorName, content }: {
  mediaId: string;
  commentId: string;
  authorId: string;
  authorName: string;
  content: string;
}) {
  const usernames = [...new Set([...content.matchAll(MENTION_RE)].map((m) => m[1].toLowerCase()))];

  if (!usernames.length) return;

  const mentioned = await User.find({
    username: { $in: usernames },
    _id: { $ne: authorId },
  }).select('username _id').lean();

  if (!mentioned.length) return;

  const preview = content.length > 120 ? `${content.slice(0, 120)}…` : content;

  await Notification.insertMany(
    mentioned.map((u) => ({
      userId: u._id,
      type: 'MENTION',
      title: `${authorName} mentioned you`,
      body: preview,
      link: `/media/${mediaId}`,
      relatedId: commentId,
      relatedUserId: authorId,
    }))
  );
}

async function runDeepModeration(commentId: string, content: string) {
  try {
    const settings = await commentSettingsService.get();
    if (!settings.aiModeration) return;

    const verdict = await geminiService.moderateContent(content);
    if (verdict?.isInappropriate) {
      await Comment.updateOne(
        { _id: commentId },
        { $set: { hidden: true, moderationStatus: 'FLAGGED' } }
      );
      console.log(`Comment ${commentId} hidden by AI moderation: ${verdict.reason}`);
    }
  } catch (err) {
    console.error('Deep moderation error:', err);
  }
}

export const commentService = {
  /**
   * Admin comment listing. `filter` selects a sub-set:
   *   - 'all'           every comment
   *   - 'reported'      comments with at least one report
   *   - 'mentions-admins' comments that @-mention an admin or moderator
   */
  async getAll(page = 1, limit = 20, search = '', filter = 'all') {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.content = { $regex: escapeRegex(search), $options: 'i' };
    }

    if (filter === 'reported') {
      where.reportCount = { $gt: 0 };
    } else if (filter === 'mentions-admins') {
      const staff = await User.find({ role: { $in: ['ADMIN', 'MODERATOR'] } }).select('username').lean();
      if (!staff.length) {
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      where.content = {
        ...(typeof where.content === 'object' ? where.content : {}),
        $regex: staff.map((u) => `@${escapeRegex(u.username)}`).join('|'),
        $options: 'i',
      };
    }

    const [comments, total] = await Promise.all([
      Comment.find(where)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(limit, 50))
        .populate({ path: 'user', select: 'username avatar role' })
        .populate({ path: 'mediaId', select: 'title slug posterUrl type' }),
      Comment.countDocuments(where),
    ]);

    return {
      data: comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getByMedia(mediaId: string, page = 1, limit = 20) {
    if (!isValidId(mediaId)) throw AppError.badRequest('Invalid media id');
    const skip = (page - 1) * limit;

    const [topLevel, total] = await Promise.all([
      Comment.find({ mediaId, parentId: null, hidden: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(limit, 50))
        .populate({ path: 'user', select: 'username avatar role' }),
      Comment.countDocuments({ mediaId, parentId: null, hidden: false }),
    ]);

    const ids = topLevel.map((c) => c._id);
    const replies = ids.length
      ? await Comment.find({ parentId: { $in: ids }, hidden: false })
          .sort({ createdAt: 1 })
          .populate({ path: 'user', select: 'username avatar role' })
      : [];

    const data = topLevel.map((c) => {
      const json = c.toJSON() as any;
      json.replies = replies
        .filter((r) => String((r as any).parentId) === json.id)
        .map((r) => r.toJSON());
      return json;
    });

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async create(mediaId: string, userId: string, content: string) {
    const settings = await commentSettingsService.get();
    if (!settings.enabled) {
      throw AppError.forbidden('Comments are currently disabled');
    }

    const text = (content || '').trim();
    if (!text) throw AppError.badRequest('Comment cannot be empty');
    if (text.length > settings.maxLength) {
      throw AppError.badRequest(`Comment is too long (max ${settings.maxLength} characters)`);
    }
    if (!isValidId(mediaId)) throw AppError.badRequest('Invalid media id');

    const media = await Media.exists({ _id: mediaId });
    if (!media) throw AppError.notFound('Media not found');

    if (settings.profanityFilter && containsProfanity(text)) {
      throw AppError.badRequest('Your comment contains inappropriate language');
    }

    const comment = await Comment.create({ mediaId, userId, content: text });

    // Background AI moderation — non-blocking for a snappy UX.
    if (settings.aiModeration) {
      runDeepModeration(comment.id, text);
    }

    const author = await User.findById(userId).select('username').lean();
    notifyMentions({
      mediaId,
      commentId: comment.id,
      authorId: userId,
      authorName: author?.username || 'Someone',
      content: text,
    }).catch((err) => console.error('Mention notification error:', err));

    return commentService.getComment(comment.id);
  },

  async reply(parentId: string, userId: string, content: string) {
    const settings = await commentSettingsService.get();
    if (!settings.enabled) {
      throw AppError.forbidden('Comments are currently disabled');
    }

    const text = (content || '').trim();
    if (!text) throw AppError.badRequest('Reply cannot be empty');
    if (text.length > settings.maxLength) {
      throw AppError.badRequest(`Reply is too long (max ${settings.maxLength} characters)`);
    }
    if (!isValidId(parentId)) throw AppError.badRequest('Invalid comment id');

    const parent = await Comment.findById(parentId);
    if (!parent) throw AppError.notFound('Comment not found');
    if (parent.parentId) throw AppError.badRequest('Cannot reply to a reply');

    if (settings.profanityFilter && containsProfanity(text)) {
      throw AppError.badRequest('Your reply contains inappropriate language');
    }

    const comment = await Comment.create({ mediaId: parent.mediaId, userId, parentId, content: text });

    if (settings.aiModeration) {
      runDeepModeration(comment.id, text);
    }

    const author = await User.findById(userId).select('username').lean();
    notifyMentions({
      mediaId: String(parent.mediaId),
      commentId: comment.id,
      authorId: userId,
      authorName: author?.username || 'Someone',
      content: text,
    }).catch((err) => console.error('Mention notification error:', err));

    return commentService.getComment(comment.id);
  },

  async getComment(id: string) {
    return Comment.findById(id).populate({ path: 'user', select: 'username avatar role' });
  },

  async remove(id: string, userId: string, role: string) {
    if (!isValidId(id)) throw AppError.badRequest('Invalid comment id');
    const comment = await Comment.findById(id);
    if (!comment) throw AppError.notFound('Comment not found');

    const isModerator = role === 'ADMIN' || role === 'MODERATOR';
    if (!isModerator && String(comment.userId) !== userId) {
      throw AppError.forbidden('You can only delete your own comments');
    }

    // Soft delete: the comment is hidden from user accounts but kept in the
    // database for moderation and audit purposes.
    await Comment.updateMany(
      { $or: [{ _id: id }, { parentId: id }] },
      { $set: { hidden: true, moderationStatus: 'FLAGGED' } }
    );
    return true;
  },

  async setHidden(id: string, hidden: boolean) {
    if (!isValidId(id)) throw AppError.badRequest('Invalid comment id');
    const comment = await Comment.findById(id);
    if (!comment) throw AppError.notFound('Comment not found');

    await Comment.updateOne(
      { _id: id },
      { $set: { hidden, moderationStatus: hidden ? 'FLAGGED' : 'APPROVED' } }
    );
    return true;
  },

  /**
   * Reports a comment. Persists the report, auto-hides the comment once the
   * configured threshold is reached, and notifies the admin via Discord.
   */
  async report(commentId: string, userId: string, reason: string, reporterUser?: { username?: string }) {
    const settings = await commentSettingsService.get();
    if (!settings.enabled) {
      throw AppError.forbidden('Comments are currently disabled');
    }
    if (!isValidId(commentId)) throw AppError.badRequest('Invalid comment id');

    const comment = await Comment.findById(commentId)
      .populate({ path: 'user', select: 'username' })
      .populate({ path: 'mediaId', select: 'title' });

    if (!comment) throw AppError.notFound('Comment not found');
    if (String((comment as any).userId) === userId) {
      throw AppError.badRequest('You cannot report your own comment');
    }

    const cleanReason = (reason || 'Other').trim().slice(0, 200);
    const alreadyReported = (comment.reports || []).some(
      (r: any) => r.user && String(r.user) === userId
    );
    if (alreadyReported) {
      throw AppError.badRequest('You have already reported this comment');
    }

    const reportCount = (comment.reportCount || 0) + 1;
    await Comment.updateOne(
      { _id: commentId },
      {
        $inc: { reportCount: 1 },
        $push: { reports: { user: userId, reason: cleanReason, createdAt: new Date() } },
      }
    );

    const autoHidden = reportCount >= settings.reportThreshold && !comment.hidden;
    if (autoHidden) {
      await Comment.updateOne(
        { _id: commentId },
        { $set: { hidden: true, moderationStatus: 'FLAGGED' } }
      );
    }

    supportService
      .commentReport({
        commentId: comment.id,
        commentContent: comment.content,
        commentAuthor: (comment as any).user?.username || 'Unknown',
        mediaTitle: (comment as any).mediaId?.title || 'Unknown',
        reporter: reporterUser?.username || 'Unknown',
        reason: cleanReason,
        reportCount,
      })
      .catch(() => {});

    // Notify every admin/moderator so reports are seen in the notification center.
    const staff = await User.find({ role: { $in: ['ADMIN', 'MODERATOR'] } }).select('_id').lean();
    const mediaLink = (comment as any).mediaId?._id
      ? `/media/${(comment as any).mediaId._id}`
      : null;
    if (staff.length) {
      notifyMany(
        staff.map((s) => s._id.toString()),
        {
          type: 'REPORT',
          title: `Comment reported (${reportCount})`,
          body: `${reporterUser?.username || 'A user'} reported: ${cleanReason} — ${comment.content.slice(0, 120)}`,
          link: mediaLink,
          relatedId: comment.id,
          relatedUserId: userId,
        }
      ).catch((err) => console.error('Report notification error:', err));
    }

    return { reported: true, autoHidden };
  },
};
