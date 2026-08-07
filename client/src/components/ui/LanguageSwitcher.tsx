import { LANGUAGES } from '../../i18n/config';
import { useI18n } from '../../i18n/LanguageProvider';
import { Languages } from 'lucide-react';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useI18n();

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Languages className="h-4 w-4 text-dark-400" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as typeof language)}
          className="rounded-lg border border-dark-700 bg-dark-900/80 px-2 py-1 text-xs font-medium text-dark-200 focus:border-primary-500/60 focus:outline-none"
          aria-label="Language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.native}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLanguage(l.code)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
            language === l.code
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
          }`}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}
