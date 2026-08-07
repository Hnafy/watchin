/**
 * Public-facing media serializer.
 *
 * Real video URLs (watchUrl / sources) are never exposed in public API
 * responses. Instead each media/episode carries a `hasWatchSource` boolean,
 * and the real URLs are only served to authenticated users through the
 * dedicated watch-source endpoint.
 */

function hasAnySource(watchUrl: unknown, sources: unknown): boolean {
  if (typeof watchUrl === 'string' && watchUrl.trim()) return true;
  return Array.isArray(sources) && sources.length > 0;
}

/** Strips video URLs from a single episode JSON and adds `hasWatchSource`. */
function sanitizeEpisode(json: any): any {
  if (!json || typeof json !== 'object') return json;
  const hasWatchSource = hasAnySource(json.watchUrl, json.sources);
  delete json.watchUrl;
  delete json.sources;
  json.hasWatchSource = hasWatchSource;
  return json;
}

/**
 * Strips video URLs from a media JSON object (including nested seasons and
 * episodes) and adds `hasWatchSource`. Mutates and returns the same object.
 */
export function sanitizePublicMedia(json: any): any {
  if (!json || typeof json !== 'object') return json;

  const hasWatchSource = hasAnySource(json.watchUrl, json.sources);
  delete json.watchUrl;
  delete json.sources;
  json.hasWatchSource = hasWatchSource;

  if (Array.isArray(json.seasons)) {
    json.seasons = json.seasons.map((season: any) => {
      if (season && Array.isArray(season.episodes)) {
        season.episodes = season.episodes.map(sanitizeEpisode);
      }
      return season;
    });
  }

  return json;
}

export function sanitizePublicMediaArray(items: any[]): any[] {
  return (items || []).map((item) => sanitizePublicMedia(item));
}
