import { Rating, WatchlistItem, WatchHistory, Genre, Country, Language, Keyword } from './models';

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function ensureGenre(name: string) {
  const slug = slugify(name);
  return Genre.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name, slug } },
    { upsert: true, new: true }
  );
}

export async function ensureCountry(code: string, name?: string) {
  const c = code.toUpperCase();
  return Country.findOneAndUpdate(
    { code: c },
    { $setOnInsert: { code: c, name: name || c } },
    { upsert: true, new: true }
  );
}

export async function ensureLanguage(code: string, name?: string) {
  return Language.findOneAndUpdate(
    { code },
    { $setOnInsert: { code, name: name || code } },
    { upsert: true, new: true }
  );
}

export async function ensureKeyword(name: string) {
  const slug = slugify(name);
  let keyword = await Keyword.findOne({ $or: [{ name }, { slug }] });
  if (!keyword) {
    keyword = await Keyword.create({ name, slug });
  }
  return keyword;
}

function toKey(id: any): string {
  return (id?._id ?? id)?.toString?.() ?? String(id);
}

export async function mediaCountsMap(mediaIds: any[]): Promise<Record<string, { ratings: number; watchlistItems: number }>> {
  if (!mediaIds || mediaIds.length === 0) return {};

  const [ratings, watchlists] = await Promise.all([
    Rating.aggregate([
      { $match: { mediaId: { $in: mediaIds } } },
      { $group: { _id: '$mediaId', n: { $sum: 1 } } },
    ]),
    WatchlistItem.aggregate([
      { $match: { mediaId: { $in: mediaIds } } },
      { $group: { _id: '$mediaId', n: { $sum: 1 } } },
    ]),
  ]);

  const map: Record<string, { ratings: number; watchlistItems: number }> = {};
  for (const r of ratings) {
    map[toKey(r._id)] = { ratings: r.n, watchlistItems: 0 };
  }
  for (const w of watchlists) {
    const key = toKey(w._id);
    if (map[key]) map[key].watchlistItems = w.n;
    else map[key] = { ratings: 0, watchlistItems: w.n };
  }
  return map;
}

export function attachCountsToMedia(docs: any[], counts: Record<string, { ratings: number; watchlistItems: number }>): any[] {
  return (docs || []).map((d) => {
    const json = d.toJSON ? d.toJSON() : d;
    const key = d._id?.toString?.() ?? d.id;
    json._count = counts[key] || { ratings: 0, watchlistItems: 0 };
    return json;
  });
}

export async function userCountsMap(userIds: any[]): Promise<Record<string, { watchHistory: number; ratings: number; watchlistItems: number }>> {
  if (!userIds || userIds.length === 0) return {};

  const [history, ratings, watchlists] = await Promise.all([
    WatchHistory.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', n: { $sum: 1 } } },
    ]),
    Rating.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', n: { $sum: 1 } } },
    ]),
    WatchlistItem.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', n: { $sum: 1 } } },
    ]),
  ]);

  const map: Record<string, { watchHistory: number; ratings: number; watchlistItems: number }> = {};
  for (const h of history) map[toKey(h._id)] = { watchHistory: h.n, ratings: 0, watchlistItems: 0 };
  for (const r of ratings) {
    const key = toKey(r._id);
    if (map[key]) map[key].ratings = r.n;
    else map[key] = { watchHistory: 0, ratings: r.n, watchlistItems: 0 };
  }
  for (const w of watchlists) {
    const key = toKey(w._id);
    if (map[key]) map[key].watchlistItems = w.n;
    else map[key] = { watchHistory: 0, ratings: 0, watchlistItems: w.n };
  }
  return map;
}
