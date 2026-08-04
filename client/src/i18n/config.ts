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
  return DEFAULT_LANGUAGE;
}

export function getDir(code: LanguageCode): 'ltr' | 'rtl' {
  return LANGUAGES.find((l) => l.code === code)?.dir ?? 'ltr';
}
