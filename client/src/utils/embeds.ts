export interface EmbedInfo {
  kind: 'embed';
  src: string;
}

const IFRAME_SRC_RE = /<iframe[^>]*\bsrc=["']([^"']+)["']/i;

export function sanitizeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed || /^(javascript|data|vbscript):/i.test(trimmed)) return null;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

/** Extracts the `src` attribute from a full `<iframe ...>...</iframe>` string. */
export function extractIframeSrc(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.toLowerCase().startsWith('<iframe')) return null;
  const m = trimmed.match(IFRAME_SRC_RE);
  return m ? sanitizeEmbedUrl(m[1]) : null;
}

interface PlatformPattern {
  re: RegExp;
  to: (m: RegExpMatchArray) => string;
}

const PLATFORM_PATTERNS: PlatformPattern[] = [
  {
    re: /(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/i,
    to: (m) => `https://player.vimeo.com/video/${m[1]}`,
  },
  {
    re: /dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+)/i,
    to: (m) => `https://www.dailymotion.com/embed/video/${m[1]}`,
  },
  {
    re: /streamtape\.com\/(?:e|v)\/([a-zA-Z0-9]+)/i,
    to: (m) => `https://streamtape.com/e/${m[1]}`,
  },
  {
    re: /streamwish\.com\/(?:e|f)\/([a-zA-Z0-9_-]+)/i,
    to: (m) => `https://streamwish.com/e/${m[1]}`,
  },
  {
    re: /(?:www\.)?twitch\.tv\/videos\/(\d+)/i,
    to: (m) => `https://player.twitch.tv/?video=${m[1]}&parent=${getTwitchParent()}`,
  },
  {
    re: /(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)/i,
    to: (m) => `https://player.twitch.tv/?channel=${m[1]}&parent=${getTwitchParent()}`,
  },
  {
    re: /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    to: (m) => `https://drive.google.com/file/d/${m[1]}/preview`,
  },
];

function getTwitchParent(): string {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

/** Detects a known embeddable platform URL and returns its embed `src`. */
export function getPlatformEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  for (const p of PLATFORM_PATTERNS) {
    const m = trimmed.match(p.re);
    if (m) return p.to(m);
  }
  return null;
}

/** Returns true when the URL already points to an embeddable player page. */
export function isEmbeddableUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (/\/(?:embed|e)\/[a-zA-Z0-9_=-]+/i.test(trimmed)) return true;
  return /\/(?:player|embed)\./i.test(trimmed);
}

/** Resolves any accepted embed input (iframe code or embed URL) to an iframe src. */
export function getEmbedInfo(input: string): EmbedInfo | null {
  const iframeSrc = extractIframeSrc(input);
  if (iframeSrc) return { kind: 'embed', src: iframeSrc };

  const platform = getPlatformEmbedUrl(input);
  if (platform) return { kind: 'embed', src: platform };

  if (isEmbeddableUrl(input)) {
    const safe = sanitizeEmbedUrl(input);
    if (safe) return { kind: 'embed', src: safe };
  }

  return null;
}

/** Appends `autoplay=1` when the embed src doesn't already define it. */
export function withAutoplay(url: string, autoplay: boolean): string {
  if (!autoplay) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('autoplay')) u.searchParams.set('autoplay', '1');
    return u.toString();
  } catch {
    return url;
  }
}
