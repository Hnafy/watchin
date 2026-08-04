import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { WatchHistory, Rating, WatchlistItem, Media } from '../db/models.js';
import { escapeRegex, mediaCountsMap } from '../db/utils.js';

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

function init() {
  if (!config.gemini.apiKey) return;
  genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

export const geminiService = {
  async getRecommendations(userId: string, limit = 10) {
    if (!config.gemini.apiKey || !model) {
      init();
      if (!model) return null;
    }

    const [history, ratings, watchlist] = await Promise.all([
      WatchHistory.find({ userId })
        .sort({ watchedAt: -1 })
        .limit(20)
        .populate({ path: 'media', populate: 'genres' }),
      Rating.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate({ path: 'media', populate: 'genres' }),
      WatchlistItem.find({ userId })
        .sort({ addedAt: -1 })
        .limit(20)
        .populate({ path: 'media', populate: 'genres' }),
    ]);

    const watched = history
      .filter((h: any) => h.media)
      .map((h: any) => ({
        title: h.media.title,
        genres: (h.media.genres || []).map((g: any) => g.name),
        type: h.media.type,
      }));

    const liked = ratings
      .filter((r: any) => r.value >= 7 && r.media)
      .map((r: any) => ({
        title: r.media.title,
        genres: (r.media.genres || []).map((g: any) => g.name),
        rating: r.value,
      }));

    const saved = watchlist
      .filter((w: any) => w.media)
      .map((w: any) => ({
        title: w.media.title,
        genres: (w.media.genres || []).map((g: any) => g.name),
        type: w.media.type,
      }));

    const prompt = `You are a movie and TV show recommendation engine. Based on the user's preferences below, suggest ${limit} specific movies or TV shows they would enjoy.

User's recently watched:
${watched.map((w) => `- ${w.title} (${w.type}, genres: ${w.genres.join(', ')})`).join('\n')}

User's highly rated (7+):
${liked.map((l) => `- ${l.title} (rating: ${l.rating}, genres: ${l.genres.join(', ')})`).join('\n')}

User's watchlist:
${saved.map((s) => `- ${s.title} (${s.type}, genres: ${s.genres.join(', ')})`).join('\n')}

Return a JSON array of objects with exactly these fields: title, reason (why they'd like it), type ("MOVIE" or "TV_SHOW"). Keep reasons concise (15-25 words). Return ONLY valid JSON, no markdown, no explanation.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const clean = text.replace(/```json\s*/i, '').replace(/```\s*$/, '').trim();
      const suggestions = JSON.parse(clean);

      if (!Array.isArray(suggestions)) return [];

      const results: Array<{ media: any; reason: string }> = [];
      const matches: any[] = [];
      for (const s of suggestions.slice(0, limit)) {
        const where: any = {
          title: { $regex: escapeRegex(s.title), $options: 'i' },
        };
        if (s.type === 'MOVIE' || s.type === 'TV_SHOW') where.type = s.type;
        const match = await Media.findOne(where).populate('genres');
        if (match) {
          matches.push(match);
          results.push({ media: match, reason: s.reason || 'Recommended for you' });
        }
      }

      if (matches.length) {
        const counts = await mediaCountsMap(matches.map((m) => m._id));
        for (const r of results) {
          r.media = r.media.toJSON();
          r.media._count = counts[r.media.id] || { ratings: 0, watchlistItems: 0 };
        }
      }

      return results;
    } catch (err) {
      console.error('Gemini recommendation error:', err);
      return null;
    }
  },
};
