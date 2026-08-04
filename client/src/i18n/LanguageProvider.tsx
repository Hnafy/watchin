import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { en } from './dictionaries/en';
import {
  LanguageCode,
  DEFAULT_LANGUAGE,
  STORAGE_KEY,
  getInitialLanguage,
  getDir,
} from './config';

const DICTIONARIES: Record<LanguageCode, Record<string, string>> = { en };

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

interface LanguageContextType {
  language: LanguageCode;
  dir: 'ltr' | 'rtl';
  t: TranslateFn;
}

const LanguageContext = createContext<LanguageContextType>({
  language: DEFAULT_LANGUAGE,
  dir: 'ltr',
  t: (key) => key,
});

export const useI18n = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language] = useState<LanguageCode>(() => getInitialLanguage());

  useEffect(() => {
    const dir = getDir(language);
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language]);

  const t = useCallback<TranslateFn>((key, vars) => {
    const dict = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LANGUAGE];
    let template = dict[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        template = template.replace(`{${k}}`, String(v));
      }
    }
    return template;
  }, [language]);

  const value = useMemo(
    () => ({ language, dir: getDir(language), t }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
