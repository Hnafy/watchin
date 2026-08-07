export type LanguageCode = 'en';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  native: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const STORAGE_KEY = 'watchin.lang';

export function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  return stored && LANGUAGES.some((l) => l.code === stored) ? stored : DEFAULT_LANGUAGE;
}

export function setStoredLanguage(code: LanguageCode) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, code);
  }
}

export function getDir(code: LanguageCode): 'ltr' | 'rtl' {
  return LANGUAGES.find((l) => l.code === code)?.dir ?? 'ltr';
}
