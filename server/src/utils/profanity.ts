/**
 * Lightweight local profanity filter. Used as an instant pre-filter before
 * optional AI moderation (Gemini) runs in the background.
 *
 * The list intentionally stays small and conservative — it exists to catch
 * the most common hateful/harassing words. Admin can disable it per settings.
 */

const BLOCKED_WORDS = [
  'asshole',
  'bastard',
  'bitch',
  'bullshit',
  'cunt',
  'damn',
  'dick',
  'faggot',
  'fuck',
  'fucking',
  'hitler',
  'kill yourself',
  'motherfucker',
  'nazi',
  'nigga',
  'nigger',
  'pussy',
  'retard',
  'shit',
  'slut',
  'twat',
  'whore',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    // leetspeak: 0->o, 1->i/l, 3->e, 4->a, 5->s, 7->t, 8->b, @->a, $->s
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized) return false;

  return BLOCKED_WORDS.some((word) => {
    const w = word.replace(/[^a-z0-9]/g, '');
    if (!w) return false;
    // word-boundary match
    return new RegExp(`(^|\\s)${w}(\\s|$)`).test(normalized);
  });
}
