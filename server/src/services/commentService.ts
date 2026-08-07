import { Comment, Media, isValidId } from '../db/models.js';
import { escapeRegex } from '../db/utils.js';
import { AppError } from '../utils/AppError.js';

const REPLIES_POPULATE = {
  path: 'replies',
  options: { sort: { createdAt: 1 } },
  populate: { path: 'user', select: 'username avatar role' },
};

export const commentService = {
  async getAll(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.content = { $regex: escapeRegex(search), $options: 'i' };
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
      Comment.find({ mediaId, parentId: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Math.min(limit, 50))
        .populate({ path: 'user', select: 'username avatar role' }),
      Comment.countDocuments({ mediaId, parentId: null }),
    ]);

    const ids = topLevel.map((c) => c._id);
    const replies = ids.length
      ? await Comment.find({ parentId: { $in: ids } })
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
    const text = (content || '').trim();
    if (!text) throw AppError.badRequest('Comment cannot be empty');
    if (text.length > 2000) throw AppError.badRequest('Comment is too long (max 2000 characters)');
    if (!isValidId(mediaId)) throw AppError.badRequest('Invalid media id');

    const media = await Media.exists({ _id: mediaId });
    if (!media) throw AppError.notFound('Media not found');

    const comment = await Comment.create({ mediaId, userId, content: text });
    return commentService.getComment(comment.id);
  },

  async reply(parentId: string, userId: string, content: string) {
    const text = (content || '').trim();
    if (!text) throw AppError.badRequest('Reply cannot be empty');
    if (text.length > 2000) throw AppError.badRequest('Reply is too long (max 2000 characters)');
    if (!isValidId(parentId)) throw AppError.badRequest('Invalid comment id');

    const parent = await Comment.findById(parentId);
    if (!parent) throw AppError.notFound('Comment not found');
    if (parent.parentId) throw AppError.badRequest('Cannot reply to a reply');

    const comment = await Comment.create({ mediaId: parent.mediaId, userId, parentId, content: text });
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

    await Comment.deleteMany({ $or: [{ _id: id }, { parentId: id }] });
    return true;
  },
};
